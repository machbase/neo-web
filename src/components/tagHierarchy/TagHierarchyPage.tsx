import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FiChevronRight,
    FiCornerDownRight,
    FiCornerUpLeft,
    FiLayers,
    FiMoreHorizontal,
    FiPlus,
    FiRotateCcw,
    FiSearch,
    FiTag,
    FiTrash2,
    FiX,
} from 'react-icons/fi';
import { LuChevronsDownUp, LuChevronsUpDown } from 'react-icons/lu';
import { Virtuoso } from 'react-virtuoso';
import {
    Button,
    CommonTable,
    IconButton,
    Input,
    Pane,
    SplitPane,
    Toast,
} from '@/design-system/components';
import { Refresh } from '@/assets/icons/Icon';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import {
    DEFAULT_HIERARCHY_DOCUMENT,
    DEFAULT_HIERARCHY_JSON_COLUMN,
    buildCreateJsonMetadataColumnSql,
    buildDetachTagsSql,
    detachTagsFromHierarchy,
    buildGetDirectHierarchyTagsSql,
    buildGetHierarchyTagsSql,
    buildGetUnassignedTagsByDocumentSql,
    buildMoveTagsToHierarchyPathSql,
    canIndentHierarchyValueNode,
    canOutdentHierarchyValueNode,
    canRemoveHierarchySchemaKey,
    canRemoveHierarchyValueNode,
    createHierarchyTemplate,
    indentHierarchyValueNode,
    insertHierarchyValueChild,
    insertHierarchyValueSibling,
    moveHierarchyValueNode,
    outdentHierarchyValueNode,
    removeHierarchyValueNodeAt,
    createJsonMetadataColumn,
    createJsonPathIndex,
    dropJsonPathIndex,
    getDirectHierarchyTags,
    getHierarchyTags,
    getHierarchyTemplate,
    getUnassignedTagCountByDocument,
    getUnassignedTagsByDocument,
    hierarchyTreeHasDepth,
    HIERARCHY_PAGE_SIZE,
    moveTagsToHierarchyPath,
    updateHierarchyTemplate,
    validateHierarchyDocument,
    type HierarchyChildRow,
    type HierarchyDocument,
    type HierarchyPathItem,
    type HierarchyQueryConfig,
    type HierarchyTagRow,
    type HierarchyValueNode,
    type HierarchyValidationIssue,
} from '@/api/repository/tagHierarchy';
import styles from './TagHierarchyPage.module.scss';

type DetailTab = 'tags' | 'query';

type JsonMetaColumn = {
    name: string;
    type: string | number;
};

type SelectedNode = {
    path: HierarchyPathItem[];
    isUnassigned?: boolean;
};

// One visible row of the tree pane once the value tree and its loaded tag links
// are flattened into a single pre-order list — the flat shape react-virtuoso
// consumes (it can't virtualize the old nested renderNode recursion).
type TreeFlatRow =
    | { kind: 'node'; rowKey: string; node: HierarchyChildRow; depth: number }
    | {
          kind: 'tag';
          rowKey: string;
          row: HierarchyTagRow;
          depth: number;
          parentKey: string;
          orderedNames: string[];
      };

type TagHierarchyPageProps = {
    active: boolean;
    tableName: string;
    nameColumn: string;
    jsonColumns: JsonMetaColumn[];
    hasAssetColumn: boolean;
    specColumn?: string;
    canEdit: boolean;
    onMetadataSchemaChange?: () => void;
};

const EMPTY_SELECTED_NODE: SelectedNode = { path: [] };
const ROOT_KEY = '__root__';
const UNASSIGNED_TREE_KEY = '__unassigned__';
const VISIBLE_DETAIL_TABS: DetailTab[] = ['tags', 'query'];

// Above this many rows the tree / unassigned panes switch to react-virtuoso
// virtualization; shorter lists render plainly (mirrors TableInfo's > 50 rule,
// avoiding Virtuoso's resize-observer overhead on tiny lists).
const VIRTUALIZE_ROW_THRESHOLD = 50;

// Value-tree outliner geometry: per-depth indent and where the vertical guide
// line sits (the depth badge is 18px wide, so its centre is +9).
const TREE_INDENT_PX = 28;
const TREE_GUIDE_OFFSET_PX = 9;

// The reorder modifier is the Alt key on every platform (event.altKey); only the
// label differs — ⌥ on macOS, "Alt" elsewhere.
const IS_MAC =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent || '');
const ALT_KEY_LABEL = IS_MAC ? '⌥' : 'Alt';

// Pre-order list of every value-tree node's numeric path (for arrow-key navigation).
const flattenValueTreePaths = (nodes: HierarchyValueNode[], parent: number[] = []): number[][] =>
    nodes.flatMap((node, index) => {
        const path = parent.concat(index);
        return [path, ...flattenValueTreePaths(node.children, path)];
    });

// Spring-loaded folders: how long a dragged tag must hover a collapsed node
// before that node auto-expands so a descendant becomes a drop target.
const HOVER_EXPAND_MS = 500;

const pathKey = (path: HierarchyPathItem[]) =>
    path.length === 0 ? ROOT_KEY : path.map((item) => `${item.key}=${item.value}`).join('/');

const pathLabel = (path: HierarchyPathItem[]) =>
    path.length === 0 ? 'Root' : path.map((item) => item.value).join(' / ');

const selectedNodeLabel = (node: SelectedNode) => {
    if (node.isUnassigned) return 'Unassigned Tags';
    return pathLabel(node.path);
};

const tagTableData = (rows: HierarchyTagRow[]) => ({
    columns: ['NAME', 'ASSET', 'SPEC'],
    rows: rows.map((row) => [row.name, row.asset, row.spec ?? '']),
    types: ['string', 'string', 'string'],
});

const cloneValueTree = (nodes: HierarchyValueNode[]): HierarchyValueNode[] =>
    nodes.map((node) => ({
        key: node.key,
        value: node.value,
        children: cloneValueTree(node.children),
    }));

const normalizeTreeKeys = (
    nodes: HierarchyValueNode[],
    schema: string[],
    depth = 0,
): HierarchyValueNode[] =>
    nodes.map((node) => ({
        ...node,
        key: schema[depth] ?? node.key,
        children: normalizeTreeKeys(node.children, schema, depth + 1),
    }));

const childrenForValuePath = (
    nodes: HierarchyValueNode[],
    path: HierarchyPathItem[],
): HierarchyValueNode[] => {
    if (path.length === 0) return nodes;
    const [head, ...tail] = path;
    const node = nodes.find((item) => item.key === head.key && item.value === head.value);
    return node ? childrenForValuePath(node.children, tail) : [];
};

const valuePathsFromTree = (
    nodes: HierarchyValueNode[],
    parentPath: HierarchyPathItem[] = [],
): HierarchyPathItem[][] =>
    nodes.flatMap((node) => {
        const path = parentPath.concat({ key: node.key, value: node.value });
        return [path].concat(valuePathsFromTree(node.children, path));
    });

export const TagHierarchyPage = ({
    active,
    tableName,
    nameColumn,
    jsonColumns,
    hasAssetColumn,
    specColumn,
    canEdit,
    onMetadataSchemaChange,
}: TagHierarchyPageProps) => {
    // Value column for the single hierarchy. Defaults to ASSET; refreshHierarchy adopts the
    // document's `column` field once the template loads (the JSON-column picker was removed).
    const [sJsonColumn, setJsonColumn] = useState(DEFAULT_HIERARCHY_JSON_COLUMN);
    const [sKeys, setKeys] = useState<string[]>([]);
    const [sHierarchyDocument, setHierarchyDocument] = useState<HierarchyDocument | undefined>();
    const [sHasHierarchyRow, setHasHierarchyRow] = useState(false);
    const [sValueTree, setValueTree] = useState<HierarchyValueNode[]>([]);
    const [sIssues, setIssues] = useState<HierarchyValidationIssue[]>([]);
    const [sSchemaDraft, setSchemaDraft] = useState<string[]>(DEFAULT_HIERARCHY_DOCUMENT.schema);
    const [sValueTreeDraft, setValueTreeDraft] = useState<HierarchyValueNode[]>([]);
    const [sIsTemplateEditing, setIsTemplateEditing] = useState(false);
    const [sTagLinksByPath, setTagLinksByPath] = useState<Record<string, HierarchyTagRow[]>>({});
    const [sExpandedPathKeys, setExpandedPathKeys] = useState<Set<string>>(new Set());
    const [sSelectedNode, setSelectedNode] = useState<SelectedNode>(EMPTY_SELECTED_NODE);
    const [sTags, setTags] = useState<HierarchyTagRow[]>([]);
    const [sTagPage, setTagPage] = useState(0);
    const [sTagHasMore, setTagHasMore] = useState(false);
    // Loading flag for the detail tag table (initial fetch + paged "load more") — drives the
    // progress bar and, via loadingMoreTagsRef, blocks overlapping page requests.
    const [sIsLoadingTags, setIsLoadingTags] = useState(false);
    const [sUnassignedCount, setUnassignedCount] = useState(0);
    // Unfiltered total of unassigned tags — drives whether the search box / Select-all show, so they
    // don't flicker away when a search matches 0 or the term is cleared (sUnassignedCount is filtered).
    const [sUnassignedTotal, setUnassignedTotal] = useState(0);
    // Infinite-scroll paging state for the unassigned-tags list.
    const [sUnassignedPage, setUnassignedPage] = useState(0);
    const [sUnassignedHasMore, setUnassignedHasMore] = useState(false);
    const [sIsLoadingUnassigned, setIsLoadingUnassigned] = useState(false);
    const [sSearchText, setSearchText] = useState('');
    // Dedicated search for the unassigned-tags pane (separate from the tree's "Search nodes").
    const [sUnassignedSearch, setUnassignedSearch] = useState('');
    const [sActiveTab, setActiveTab] = useState<DetailTab>('tags');
    const [sLastQuery, setLastQuery] = useState('');
    const [sError, setError] = useState('');
    const [sIsLoading, setIsLoading] = useState(false);
    // Tag selection (checkbox + SHIFT range) drives the placement panel.
    const [sSelectedTagNames, setSelectedTagNames] = useState<Set<string>>(new Set());
    const [sSelectionAnchor, setSelectionAnchor] = useState<string>('');
    const [sPlacementTargetKey, setPlacementTargetKey] = useState<string>('');
    const [sDetailOpen, setDetailOpen] = useState(false);
    // Resizable split between the tree pane (left) and the detail pane (right).
    // Controlled sizes: percentages on first render, px once the user drags the sash.
    const [sPaneSizes, setPaneSizes] = useState<(string | number)[]>(['32%', '68%']);
    const [sDragOverKey, setDragOverKey] = useState<string>('');
    const [sSchemaEditorOpen, setSchemaEditorOpen] = useState(false);
    // Index of a freshly added schema level to focus once it renders (set by "Add level").
    const [sFocusSchemaIndex, setFocusSchemaIndex] = useState<number | null>(null);
    // Numeric path of the value-tree row to focus after a keyboard/structural edit.
    const [sFocusTreePath, setFocusTreePath] = useState<number[] | null>(null);
    const [sIsSaving, setIsSaving] = useState(false);
    const [sIsCreatingAssetColumn, setIsCreatingAssetColumn] = useState(false);
    // Name of the json metadata column to create for the hierarchy. Defaults to ASSET but the user
    // may freely rename it before creating (the hierarchy then lives in whatever column they pick).
    const [sNewColumnName, setNewColumnName] = useState(DEFAULT_HIERARCHY_JSON_COLUMN);
    const expandedPathKeysRef = useRef(sExpandedPathKeys);
    // Synchronous guard so onEndReached can't fire a new "load more" page request before the
    // in-flight one resolves (state updates are async; a ref blocks the burst immediately).
    const loadingMoreTagsRef = useRef(false);
    // Same in-flight guard for the unassigned-tags infinite scroll.
    const loadingMoreUnassignedRef = useRef(false);
    // Monotonic id for unassigned (re)loads: a newer search/refresh supersedes older in-flight
    // requests so out-of-order responses (and stale "load more" appends) are discarded.
    const unassignedReqRef = useRef(0);
    // Tracks which JSON column has already received its "expand all on first load" default,
    // so a fresh load (or a column switch) starts fully expanded while later refreshes
    // (e.g. after placing/detaching tags) preserve whatever the user manually collapsed.
    const autoExpandedColumnRef = useRef('');
    // Pending spring-load timer for the collapsed node currently hovered during a tag drag.
    const hoverExpandRef = useRef<{ key: string; timer: number } | null>(null);
    // Live DOM refs for each schema-level input, keyed by depth index (for auto-focus on add).
    const schemaInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    // Live DOM refs for each value-tree input, keyed by numeric path string (e.g. "0-2-1").
    const treeInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    const mConfig = useMemo<HierarchyQueryConfig>(
        () => ({
            tableName,
            nameColumn,
            jsonColumn: sJsonColumn,
            specColumn,
        }),
        [nameColumn, sJsonColumn, specColumn, tableName],
    );

    const mSelectedPathKey = pathKey(sSelectedNode.path);
    const mHasTemplate = sKeys.length > 0;
    // Mirrors the repository's assertSafeIdentifier rule so we only enable Create for a name the
    // ALTER TABLE … ADD COLUMN statement will accept.
    const isValidColumnName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(sNewColumnName.trim());
    // An empty schema is an error state the user must fix, so the SCHEMA editor is forced open then;
    // otherwise it respects the user's manual collapse/expand toggle.
    const mSchemaEditorOpen = sSchemaEditorOpen || sSchemaDraft.length === 0;

    // Placement-panel derivations: all selectable target nodes, the currently chosen target path,
    // which selected tags are already placed (for the unassign/detach action).
    const mAllValuePaths = useMemo(() => valuePathsFromTree(sValueTree), [sValueTree]);
    const mPlacedTagNames = useMemo(() => {
        const placed = new Set<string>();
        Object.entries(sTagLinksByPath).forEach(([key, rows]) => {
            if (key === UNASSIGNED_TREE_KEY) return;
            rows.forEach((row) => placed.add(row.name));
        });
        return placed;
    }, [sTagLinksByPath]);
    const mPlacementTargetPath = useMemo(
        () => mAllValuePaths.find((path) => pathKey(path) === sPlacementTargetKey) ?? [],
        [mAllValuePaths, sPlacementTargetKey],
    );
    const mPlacedSelectedNames = useMemo(
        () => Array.from(sSelectedTagNames).filter((name) => mPlacedTagNames.has(name)),
        [sSelectedTagNames, mPlacedTagNames],
    );
    // Unassigned tag rows as loaded — filtering is done server-side (NAME LIKE) so these are
    // already the matching rows for the current search; no client-side filter here.
    const mUnassignedRows = useMemo(
        () => sTagLinksByPath[UNASSIGNED_TREE_KEY] ?? [],
        [sTagLinksByPath],
    );
    const mUnassignedNames = useMemo(
        () => mUnassignedRows.map((row) => row.name),
        [mUnassignedRows],
    );
    // Flatten the value tree + its loaded tag links into the pre-order list of
    // currently-visible rows (respecting expand state + search). Replaces the old
    // renderNode/renderTagLinks/renderChildLayer recursion so the tree pane can be
    // virtualized: a node row is followed by its tag rows then its child subtree.
    const mTreeRows = useMemo<TreeFlatRow[]>(() => {
        const search = sSearchText.toLowerCase();
        const walk = (parentPath: HierarchyPathItem[], depth: number): TreeFlatRow[] => {
            const out: TreeFlatRow[] = [];
            childrenForValuePath(sValueTree, parentPath).forEach((child) => {
                const path = parentPath.concat({ key: child.key, value: child.value });
                const key = pathKey(path);
                const matchesSearch =
                    !search ||
                    child.value.toLowerCase().includes(search) ||
                    child.key.toLowerCase().includes(search);
                if (matchesSearch) {
                    out.push({
                        kind: 'node',
                        rowKey: key,
                        node: { key: child.key, value: child.value, path, tagCount: 0 },
                        depth,
                    });
                }
                // An expanded node still reveals its descendants even when its own
                // label fails the search filter (matches the old recursion).
                if (sExpandedPathKeys.has(key)) {
                    const links = sTagLinksByPath[key] ?? [];
                    const filtered = search
                        ? links.filter((row) => row.name.toLowerCase().includes(search))
                        : links;
                    const orderedNames = filtered.map((row) => row.name);
                    filtered.forEach((row) =>
                        out.push({
                            kind: 'tag',
                            rowKey: `${key}::tag::${row.name}`,
                            row,
                            depth: depth + 1,
                            parentKey: key,
                            orderedNames,
                        }),
                    );
                    out.push(...walk(path, depth + 1));
                }
            });
            return out;
        };
        return walk([], 0);
    }, [sValueTree, sExpandedPathKeys, sSearchText, sTagLinksByPath]);
    const mAllUnassignedSelected =
        mUnassignedNames.length > 0 &&
        mUnassignedNames.every((name) => sSelectedTagNames.has(name));
    // How many of the currently-loaded unassigned tags are selected. Shown next to "Select all" so the
    // partial nature is transparent: infinite scroll only loads a page at a time, so "Select all" can
    // only ever select the loaded rows — comparing this against the total above makes that visible
    // (e.g. "50 selected" vs a total of 51 means one more page is still unloaded).
    const mSelectedUnassignedCount = useMemo(
        () => mUnassignedNames.filter((name) => sSelectedTagNames.has(name)).length,
        [mUnassignedNames, sSelectedTagNames],
    );
    // Live validation of the in-progress draft (keys normalized to the schema first,
    // exactly as Save does) so inline row errors update as you type. Outside editing
    // we fall back to whatever the load/save path put in sIssues.
    const mEditIssues = useMemo(() => {
        if (!sIsTemplateEditing) return sIssues;
        const schema = sSchemaDraft.map((key) => key.trim());
        return validateHierarchyDocument({
            schema,
            tree: normalizeTreeKeys(sValueTreeDraft, schema),
        });
    }, [sIsTemplateEditing, sSchemaDraft, sValueTreeDraft, sIssues]);
    // pathKey -> messages, so each tree row can render its own issue(s) inline.
    const mTreeErrorMap = useMemo(() => {
        const map = new Map<string, string[]>();
        mEditIssues.forEach((issue) => {
            if (!issue.path) return;
            const key = issue.path.join('-');
            map.set(key, (map.get(key) ?? []).concat(issue.message));
        });
        return map;
    }, [mEditIssues]);
    // schemaIndex -> messages, so each schema input can render its own issue(s) inline.
    const mSchemaErrorMap = useMemo(() => {
        const map = new Map<number, string[]>();
        mEditIssues.forEach((issue) => {
            if (issue.schemaIndex === undefined) return;
            map.set(issue.schemaIndex, (map.get(issue.schemaIndex) ?? []).concat(issue.message));
        });
        return map;
    }, [mEditIssues]);
    // Issues tied to neither a value node nor a schema key (truly global) stay in the list below.
    const mGlobalIssues = useMemo(
        () => mEditIssues.filter((issue) => !issue.path && issue.schemaIndex === undefined),
        [mEditIssues],
    );
    const mBlockingCount = mEditIssues.filter((issue) => issue.level === 'blocking').length;

    useEffect(() => {
        expandedPathKeysRef.current = sExpandedPathKeys;
    }, [sExpandedPathKeys]);

    // Auto-focus (and select) a schema level right after "Add level" renders it.
    useEffect(() => {
        if (sFocusSchemaIndex === null) return;
        const input = schemaInputRefs.current[sFocusSchemaIndex];
        if (input) {
            input.focus();
            input.select();
        }
        setFocusSchemaIndex(null);
    }, [sFocusSchemaIndex]);

    // Focus the value-tree row queued by the last outliner edit, caret at line end.
    useEffect(() => {
        if (!sFocusTreePath) return;
        const input = treeInputRefs.current.get(sFocusTreePath.join('-'));
        if (input) {
            input.focus();
            const end = input.value.length;
            input.setSelectionRange(end, end);
        }
        setFocusTreePath(null);
    }, [sFocusTreePath]);

    // Clear any pending spring-load timer on unmount.
    useEffect(
        () => () => {
            if (hoverExpandRef.current) window.clearTimeout(hoverExpandRef.current.timer);
        },
        [],
    );

    const loadTagsForNode = useCallback(
        async (node: SelectedNode, document?: HierarchyDocument, page = 0) => {
            const applyRows = (rows: HierarchyTagRow[]) => {
                setTags((prev) => (page > 0 ? prev.concat(rows) : rows));
                setTagHasMore(rows.length === HIERARCHY_PAGE_SIZE);
            };

            setIsLoadingTags(true);
            try {
                if (node.isUnassigned) {
                    if (!document) return;
                    setLastQuery(buildGetUnassignedTagsByDocumentSql(mConfig, document));
                    const tags = await getUnassignedTagsByDocument(mConfig, document, page);
                    applyRows(tags.rows);
                    if (!tags.success) setError(tags.reason ?? 'Failed to load unassigned tags.');
                    return;
                }

                if (node.path.length === 0) {
                    setTags([]);
                    setTagHasMore(false);
                    setLastQuery('');
                    return;
                }

                setLastQuery(buildGetHierarchyTagsSql(mConfig, node.path));
                const tags = await getHierarchyTags(mConfig, node.path, page);
                applyRows(tags.rows);
                if (!tags.success) setError(tags.reason ?? 'Failed to load hierarchy tags.');
            } finally {
                setIsLoadingTags(false);
            }
        },
        [mConfig],
    );

    const loadMoreTags = useCallback(() => {
        // Block overlapping page requests: onEndReached fires repeatedly while pinned at the bottom,
        // so without this guard the next page(s) would be requested before the current one returns.
        if (!sTagHasMore || loadingMoreTagsRef.current) return;
        loadingMoreTagsRef.current = true;
        const nextPage = sTagPage + 1;
        setTagPage(nextPage);
        loadTagsForNode(sSelectedNode, sHierarchyDocument, nextPage).finally(() => {
            loadingMoreTagsRef.current = false;
        });
    }, [sTagHasMore, sTagPage, sSelectedNode, sHierarchyDocument, loadTagsForNode]);

    const loadTagLinksForPaths = useCallback(
        async (document: HierarchyDocument, paths: HierarchyPathItem[][]) => {
            const uniquePaths = Array.from(
                new Map(paths.map((path) => [pathKey(path), path])).values(),
            );
            const nextLinks: Record<string, HierarchyTagRow[]> = {};

            const results = await Promise.all(
                uniquePaths.map(async (path) => ({
                    key: pathKey(path),
                    result: await getDirectHierarchyTags(mConfig, document.schema, path),
                })),
            );

            results.forEach(({ key, result }) => {
                if (result.success) {
                    nextLinks[key] = result.rows;
                } else {
                    setError(result.reason ?? 'Failed to load tag links.');
                }
            });

            setTagLinksByPath((prev) => ({ ...prev, ...nextLinks }));
        },
        [mConfig],
    );

    // Infinite scroll for the unassigned-tags list: fetch the next page and append it. The ref guard
    // blocks overlapping requests (endReached fires repeatedly at the bottom) — same fix as the
    // detail table's loadMoreTags.
    // (Re)loads the unassigned list from page 0 for the given search: server-side NAME LIKE filter,
    // so both the COUNT and the rows reflect the full match set. Replaces the list and resets paging.
    // unassignedReqRef discards stale/out-of-order responses when search or document changes mid-flight.
    const reloadUnassigned = useCallback(
        async (search: string) => {
            if (!sHierarchyDocument) return;
            const reqId = (unassignedReqRef.current += 1);
            setIsLoadingUnassigned(true);
            try {
                const [count, tags] = await Promise.all([
                    getUnassignedTagCountByDocument(mConfig, sHierarchyDocument, search),
                    getUnassignedTagsByDocument(mConfig, sHierarchyDocument, 0, search),
                ]);
                if (reqId !== unassignedReqRef.current) return; // superseded by a newer reload
                setUnassignedCount(count);
                // An empty search returns the unfiltered total — capture it for visibility gating.
                if (!search.trim()) setUnassignedTotal(count);
                if (tags.success) {
                    setUnassignedPage(0);
                    setUnassignedHasMore(tags.rows.length === HIERARCHY_PAGE_SIZE);
                    setTagLinksByPath((prev) => ({ ...prev, [UNASSIGNED_TREE_KEY]: tags.rows }));
                } else {
                    setError(tags.reason ?? 'Failed to load unassigned tags.');
                }
            } finally {
                if (reqId === unassignedReqRef.current) setIsLoadingUnassigned(false);
            }
        },
        [mConfig, sHierarchyDocument],
    );

    const loadMoreUnassigned = useCallback(() => {
        if (!sUnassignedHasMore || loadingMoreUnassignedRef.current || !sHierarchyDocument) return;
        loadingMoreUnassignedRef.current = true;
        const reqId = unassignedReqRef.current;
        const nextPage = sUnassignedPage + 1;
        setIsLoadingUnassigned(true);
        getUnassignedTagsByDocument(mConfig, sHierarchyDocument, nextPage, sUnassignedSearch)
            .then((res) => {
                // A reload (search/refresh) happened while this page was in flight — drop it.
                if (reqId !== unassignedReqRef.current) return;
                if (!res.success) {
                    setError(res.reason ?? 'Failed to load more unassigned tags.');
                    return;
                }
                setUnassignedPage(nextPage);
                setUnassignedHasMore(res.rows.length === HIERARCHY_PAGE_SIZE);
                setTagLinksByPath((prev) => ({
                    ...prev,
                    [UNASSIGNED_TREE_KEY]: (prev[UNASSIGNED_TREE_KEY] ?? []).concat(res.rows),
                }));
            })
            .finally(() => {
                loadingMoreUnassignedRef.current = false;
                if (reqId === unassignedReqRef.current) setIsLoadingUnassigned(false);
            });
    }, [sUnassignedHasMore, sUnassignedPage, sHierarchyDocument, sUnassignedSearch, mConfig]);

    // Debounced server-side reload of the unassigned list whenever the search term changes (or the
    // hierarchy document reloads, e.g. after placing/detaching tags). The TAKE/DROP paging in
    // reloadUnassigned/loadMoreUnassigned then operates on the filtered result set.
    useEffect(() => {
        if (!sHierarchyDocument) return;
        const timer = window.setTimeout(() => reloadUnassigned(sUnassignedSearch), 300);
        return () => window.clearTimeout(timer);
    }, [sUnassignedSearch, reloadUnassigned, sHierarchyDocument]);

    const refreshHierarchy = useCallback(async () => {
        if (!active || jsonColumns.length === 0) return;

        setIsLoading(true);
        setError('');
        setLastQuery('');
        setTagLinksByPath({});

        // One SELECT * reads the whole reserved row and discovers, by content, which json column
        // actually holds the hierarchy (templateResult.column). The value column is thus derived
        // from data, not from pre-seeded state.
        const templateResult = await getHierarchyTemplate(mConfig);
        setHasHierarchyRow(Boolean(templateResult.hasRow));
        if (!templateResult.success) {
            setKeys([]);
            setHierarchyDocument(undefined);
            setValueTree([]);
            setTags([]);
            setIssues([
                {
                    level: 'blocking',
                    message: templateResult.reason ?? 'Failed to load hierarchy template.',
                },
            ]);
            setIsLoading(false);
            return;
        }

        // Adopt the value column: the one the hierarchy lives in, else (none yet) keep the column the
        // user just created/selected if still present, else ASSET, else the first json column — the
        // target the setup flow creates into. Switching re-runs this load so value queries use it.
        const columnNames = jsonColumns.map((col) => col.name);
        const targetColumn =
            templateResult.column ??
            (columnNames.includes(sJsonColumn)
                ? sJsonColumn
                : columnNames.includes(DEFAULT_HIERARCHY_JSON_COLUMN)
                  ? DEFAULT_HIERARCHY_JSON_COLUMN
                  : columnNames[0]);
        if (targetColumn && targetColumn !== sJsonColumn) {
            setJsonColumn(targetColumn);
            setIsLoading(false);
            return;
        }

        if (!templateResult.document) {
            setKeys([]);
            setHierarchyDocument(undefined);
            setValueTree([]);
            setSchemaDraft(DEFAULT_HIERARCHY_DOCUMENT.schema);
            setValueTreeDraft([]);
            setIssues(
                (templateResult.issues as HierarchyValidationIssue[] | undefined) ?? [
                    {
                        level: 'blocking',
                        message: 'No schema/tree hierarchy document found. Recreate the tree.',
                    },
                ],
            );
            setTags([]);
            setUnassignedCount(0);
            setIsLoading(false);
            return;
        }

        const document = templateResult.document;
        const keys = document.schema;
        setKeys(keys);
        setHierarchyDocument(document);
        setValueTree(document.tree);
        setSchemaDraft(document.schema);
        setValueTreeDraft(cloneValueTree(document.tree));
        setIssues((templateResult.issues as HierarchyValidationIssue[] | undefined) ?? []);

        if (keys.length === 0) {
            setTags([]);
            setUnassignedCount(0);
            setIsLoading(false);
            return;
        }

        setSelectedNode(EMPTY_SELECTED_NODE);
        const allPaths = valuePathsFromTree(document.tree);
        // First load (or a column switch) auto-expands only the top level (the single root): its
        // immediate structure shows at once while deeper nodes load lazily on expand. Expanding the
        // whole tree up front fired one tag-link query per node — a storm on large trees. Users can
        // still open everything on demand via the "Expand all" control. Later refreshes keep the
        // user's current expand/collapse state.
        const shouldAutoExpand = autoExpandedColumnRef.current !== sJsonColumn;
        let expandedPaths: HierarchyPathItem[][];
        if (shouldAutoExpand) {
            autoExpandedColumnRef.current = sJsonColumn;
            const topLevelPaths = allPaths.filter((path) => path.length === 1);
            const nextExpanded = new Set(topLevelPaths.map(pathKey));
            nextExpanded.add(UNASSIGNED_TREE_KEY);
            setExpandedPathKeys(nextExpanded);
            expandedPaths = topLevelPaths;
        } else {
            const expandedKeys = expandedPathKeysRef.current;
            expandedPaths = allPaths.filter((path) => expandedKeys.has(pathKey(path)));
        }

        // Unassigned tags (count + rows) are loaded separately by the debounced reloadUnassigned
        // effect — it owns the server-side search + paging — so we don't fetch them here.
        await Promise.all([
            loadTagsForNode(EMPTY_SELECTED_NODE, document),
            loadTagLinksForPaths(document, expandedPaths),
        ]);
        setIsLoading(false);
    }, [active, jsonColumns, loadTagLinksForPaths, loadTagsForNode, mConfig, sJsonColumn]);

    useEffect(() => {
        if (active) refreshHierarchy();
    }, [active, refreshHierarchy]);

    const handleToggleNode = async (node: HierarchyChildRow) => {
        const key = pathKey(node.path);
        const nextExpanded = new Set(sExpandedPathKeys);
        if (nextExpanded.has(key)) {
            nextExpanded.delete(key);
        } else {
            nextExpanded.add(key);
            if (sHierarchyDocument && !sTagLinksByPath[key]) {
                setLastQuery(buildGetDirectHierarchyTagsSql(mConfig, sKeys, node.path));
                await loadTagLinksForPaths(sHierarchyDocument, [node.path]);
            }
        }
        setExpandedPathKeys(nextExpanded);
    };

    // Expand every node along `path` (all ancestors + the node itself) so a tag
    // dropped onto a collapsed branch is visible after the move. The ref is updated
    // synchronously so the refresh that follows loads the newly-expanded links.
    const expandPathToTarget = (path: HierarchyPathItem[]) => {
        if (path.length === 0) return;
        const next = new Set(expandedPathKeysRef.current);
        for (let i = 1; i <= path.length; i += 1) next.add(pathKey(path.slice(0, i)));
        expandedPathKeysRef.current = next;
        setExpandedPathKeys(next);
    };

    // Spring-loaded folders: while dragging a tag, hovering a collapsed node for
    // HOVER_EXPAND_MS auto-expands it so deeper drop targets appear. Applies at any
    // depth — leaf-level nodes open too (revealing their tags), so the deepest
    // branches are reachable without pre-expanding.
    const disarmHoverExpand = () => {
        if (hoverExpandRef.current) {
            window.clearTimeout(hoverExpandRef.current.timer);
            hoverExpandRef.current = null;
        }
    };

    const armHoverExpand = (node: HierarchyChildRow) => {
        const key = pathKey(node.path);
        // Already-open nodes have nothing to spring; only collapsed nodes arm.
        if (expandedPathKeysRef.current.has(key)) {
            disarmHoverExpand();
            return;
        }
        // Still over the same node — let the running countdown finish.
        if (hoverExpandRef.current?.key === key) return;
        disarmHoverExpand();
        const timer = window.setTimeout(() => {
            hoverExpandRef.current = null;
            const next = new Set(expandedPathKeysRef.current);
            if (next.has(key)) return;
            next.add(key);
            expandedPathKeysRef.current = next;
            setExpandedPathKeys(next);
            if (sHierarchyDocument && !sTagLinksByPath[key]) {
                loadTagLinksForPaths(sHierarchyDocument, [node.path]);
            }
        }, HOVER_EXPAND_MS);
        hoverExpandRef.current = { key, timer };
    };

    const handleExpandAllTree = async () => {
        if (!sHierarchyDocument) return;

        const paths = valuePathsFromTree(sHierarchyDocument.tree);
        const nextExpanded = new Set(paths.map(pathKey));
        nextExpanded.add(UNASSIGNED_TREE_KEY);
        setExpandedPathKeys(nextExpanded);
        setIsLoading(true);
        setError('');
        await loadTagLinksForPaths(sHierarchyDocument, paths);
        setIsLoading(false);
    };

    // Collapse every tree node in one click (the symmetric counterpart of Expand all). No fetch is
    // needed — collapsing only hides already-loaded rows. UNASSIGNED_TREE_KEY isn't read for the
    // unassigned panel's visibility (it renders off sUnassignedTotal), so clearing the whole set is
    // safe and leaves that panel untouched.
    const handleCollapseAllTree = () => {
        setExpandedPathKeys(new Set());
    };

    const handleSelectNode = async (node: SelectedNode) => {
        setSelectedNode(node);
        setError('');
        setTagPage(0);
        setTagHasMore(false);
        if (!node.isUnassigned && node.path.length > 0) setPlacementTargetKey(pathKey(node.path));
        await loadTagsForNode(node, sHierarchyDocument, 0);
    };

    // Phase 6: the per-row/per-node "⋯" opens the tags + query detail view.
    const openNodeDetail = async (node: SelectedNode) => {
        clearTagSelection();
        setDetailOpen(true);
        setActiveTab('tags');
        await handleSelectNode(node);
    };

    const openTagDetail = (row: HierarchyTagRow) => {
        clearTagSelection();
        setDetailOpen(true);
        setActiveTab('tags');
        setTags([row]);
        setTagHasMore(false);
        setLastQuery('');
    };

    // Phase 5: checkbox + SHIFT range tag selection.
    const handleTagRowSelect = (tagName: string, orderedNames: string[], shiftKey: boolean) => {
        setDetailOpen(false);
        setSelectedTagNames((prev) => {
            const next = new Set(prev);
            if (
                shiftKey &&
                sSelectionAnchor &&
                orderedNames.includes(sSelectionAnchor) &&
                orderedNames.includes(tagName)
            ) {
                const start = orderedNames.indexOf(sSelectionAnchor);
                const end = orderedNames.indexOf(tagName);
                const [lo, hi] = start <= end ? [start, end] : [end, start];
                for (let i = lo; i <= hi; i += 1) next.add(orderedNames[i]);
            } else if (next.has(tagName)) {
                next.delete(tagName);
            } else {
                next.add(tagName);
            }
            return next;
        });
        if (!shiftKey) setSelectionAnchor(tagName);
    };

    const toggleSelectAll = (names: string[]) => {
        setDetailOpen(false);
        setSelectedTagNames((prev) => {
            const allSelected = names.length > 0 && names.every((name) => prev.has(name));
            const next = new Set(prev);
            if (allSelected) names.forEach((name) => next.delete(name));
            else names.forEach((name) => next.add(name));
            return next;
        });
    };

    const handlePlaceSelectedTags = async () => {
        const names = Array.from(sSelectedTagNames);
        if (names.length === 0 || mPlacementTargetPath.length === 0 || sKeys.length === 0) return;
        setIsSaving(true);
        setLastQuery(buildMoveTagsToHierarchyPathSql(mConfig, names, sKeys, mPlacementTargetPath));
        const result = await moveTagsToHierarchyPath(mConfig, names, sKeys, mPlacementTargetPath);
        if (result.svrState) {
            Toast.success(`${names.length} tag(s) placed.`);
            clearTagSelection();
            expandPathToTarget(mPlacementTargetPath);
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to place tags.');
        }
        setIsSaving(false);
    };

    const handleDetachSelectedTags = async () => {
        const names = mPlacedSelectedNames;
        if (names.length === 0 || sKeys.length === 0) return;
        setIsSaving(true);
        setLastQuery(buildDetachTagsSql(mConfig, names, sKeys));
        const result = await detachTagsFromHierarchy(mConfig, names, sKeys);
        if (result.svrState) {
            Toast.success(`${names.length} tag(s) moved to unassigned.`);
            clearTagSelection();
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to unassign tags.');
        }
        setIsSaving(false);
    };

    const clearTagSelection = () => {
        setSelectedTagNames(new Set());
        setSelectionAnchor('');
    };

    const startTemplateEdit = () => {
        setSchemaDraft(sKeys.length > 0 ? sKeys : DEFAULT_HIERARCHY_DOCUMENT.schema);
        setValueTreeDraft(cloneValueTree(sValueTree));
        // editing screen never shows tags (Phase 7): drop selection + detail before entering.
        clearTagSelection();
        setDetailOpen(false);
        setSchemaEditorOpen(false);
        setIsTemplateEditing(true);
    };

    const cancelTemplateEdit = () => {
        setSchemaDraft(sKeys.length > 0 ? sKeys : DEFAULT_HIERARCHY_DOCUMENT.schema);
        setValueTreeDraft(cloneValueTree(sValueTree));
        setIsTemplateEditing(false);
    };

    const updateTemplateDraftAtPath = (
        nodePath: number[],
        update: (node: HierarchyValueNode) => HierarchyValueNode,
    ) => {
        const updateNodes = (nodes: HierarchyValueNode[], depth = 0): HierarchyValueNode[] =>
            nodes.map((node, index) => {
                if (index !== nodePath[depth]) return node;
                if (depth === nodePath.length - 1) return update(node);
                return { ...node, children: updateNodes(node.children, depth + 1) };
            });

        setValueTreeDraft((prev) => updateNodes(prev));
    };

    // --- Keyboard outliner for the value tree -------------------------------
    // Enter=sibling, Tab=indent, Shift+Tab=outdent, Backspace(empty leaf)=delete.
    // Each op replaces the draft and queues the affected row for focus.
    const handleTreeAddRoot = () => {
        // Only one depth-1 node may exist, so this seeds the root only when empty.
        if (sValueTreeDraft.length > 0) return;
        setFocusTreePath([0]);
        setValueTreeDraft([{ key: sSchemaDraft[0] ?? '', value: '', children: [] }]);
    };

    const handleTreeSibling = (path: number[]) => {
        // The root can't take a sibling (single depth-1 node), so Enter there seeds
        // a first child one level deeper instead — the only keyboard path from a
        // freshly created root into the rest of the tree.
        if (path.length === 1) {
            const result = insertHierarchyValueChild(sValueTreeDraft, path, sSchemaDraft);
            if (!result) return;
            setValueTreeDraft(result.tree);
            setFocusTreePath(result.focusPath);
            return;
        }
        const { tree, focusPath } = insertHierarchyValueSibling(
            sValueTreeDraft,
            path,
            sSchemaDraft,
        );
        setValueTreeDraft(tree);
        setFocusTreePath(focusPath);
    };

    const handleTreeIndent = (path: number[]) => {
        const result = indentHierarchyValueNode(sValueTreeDraft, path, sSchemaDraft);
        if (!result) return;
        setValueTreeDraft(result.tree);
        setFocusTreePath(result.focusPath);
    };

    const handleTreeOutdent = (path: number[]) => {
        const result = outdentHierarchyValueNode(sValueTreeDraft, path);
        if (!result) return;
        setValueTreeDraft(result.tree);
        setFocusTreePath(result.focusPath);
    };

    const handleTreeDelete = (path: number[], node: HierarchyValueNode) => {
        if (!canRemoveHierarchyValueNode(node)) return;
        const { tree, focusPath } = removeHierarchyValueNodeAt(sValueTreeDraft, path);
        setValueTreeDraft(tree);
        setFocusTreePath(focusPath ?? (tree.length > 0 ? [0] : null));
    };

    const handleTreeMove = (path: number[], direction: 1 | -1) => {
        const result = moveHierarchyValueNode(sValueTreeDraft, path, direction);
        if (!result) return;
        setValueTreeDraft(result.tree);
        setFocusTreePath(result.focusPath);
    };

    const handleTreeKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
        path: number[],
        node: HierarchyValueNode,
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleTreeSibling(path);
        } else if (event.key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) handleTreeOutdent(path);
            else handleTreeIndent(path);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const direction: 1 | -1 = event.key === 'ArrowDown' ? 1 : -1;
            // Alt+Arrow reorders the active row. Exclude Ctrl+Alt so Windows/EU
            // AltGr (which also sets altKey) doesn't move rows while typing.
            if (event.altKey && !event.ctrlKey) {
                handleTreeMove(path, direction);
            } else {
                // Arrow: move focus between rows in pre-order (no structural change).
                const paths = flattenValueTreePaths(sValueTreeDraft);
                const current = paths.findIndex((p) => p.join('-') === path.join('-'));
                const target = current + direction;
                if (target >= 0 && target < paths.length) setFocusTreePath(paths[target]);
            }
        } else if (
            event.key === 'Backspace' &&
            node.value === '' &&
            canRemoveHierarchyValueNode(node)
        ) {
            event.preventDefault();
            handleTreeDelete(path, node);
        }
    };

    const updateSchemaDraft = (index: number, value: string) => {
        setSchemaDraft((prev) => prev.map((key, keyIndex) => (keyIndex === index ? value : key)));
    };

    const addSchemaDraftKey = () => {
        // Keep the SCHEMA editor open: once the first level is added the "empty ⇒ forced open" rule
        // no longer applies, so without this the section would collapse mid-edit.
        setSchemaEditorOpen(true);
        // The appended level lands at the current end, so its index is the pre-add length.
        setFocusSchemaIndex(sSchemaDraft.length);
        setSchemaDraft((prev) => prev.concat(`level_${prev.length + 1}`));
    };

    const removeSchemaDraftKey = (index: number) => {
        if (!canRemoveHierarchySchemaKey(sSchemaDraft, sValueTreeDraft, index)) return;
        setSchemaDraft((prev) => prev.filter((_, keyIndex) => keyIndex !== index));
    };

    const schemaKeyRemoveReason = (index: number) => {
        if (index !== sSchemaDraft.length - 1)
            return 'Remove schema keys from the deepest depth first.';
        if (hierarchyTreeHasDepth(sValueTreeDraft, index))
            return 'Remove all tree nodes at this depth before removing the schema key.';
        return '';
    };

    // JSON-path index lifecycle: on persist, create an index for each newly added schema key and
    // drop the index for each removed key. Index failures are NON-FATAL — a saved document must not
    // be rolled back by an index hiccup; failures surface as validation warnings instead.
    const applySchemaIndexLifecycle = async (previousSchema: string[], nextSchema: string[]) => {
        const addedKeys = nextSchema.filter((key) => key && !previousSchema.includes(key));
        const removedKeys = previousSchema.filter((key) => key && !nextSchema.includes(key));
        const sqls: string[] = [];
        const warnings: string[] = [];
        for (const key of addedKeys) {
            const res = await createJsonPathIndex(mConfig, key);
            sqls.push(res.sql);
            if (!res.success)
                warnings.push(`Index create failed for "${key}": ${res.reason ?? 'unknown error'}`);
        }
        for (const key of removedKeys) {
            const res = await dropJsonPathIndex(mConfig, key);
            sqls.push(res.sql);
            if (!res.success)
                warnings.push(`Index drop failed for "${key}": ${res.reason ?? 'unknown error'}`);
        }

        return { sqls, warnings };
    };

    const saveTemplateEdit = async () => {
        const document = {
            schema: sSchemaDraft.map((key) => key.trim()),
            tree: normalizeTreeKeys(
                sValueTreeDraft,
                sSchemaDraft.map((key) => key.trim()),
            ),
            // Record the json column this hierarchy lives in (the one we're writing to).
            column: sJsonColumn,
        };
        const issues = validateHierarchyDocument(document);
        setIssues(issues);

        if (issues.some((issue) => issue.level === 'blocking')) return;

        setIsSaving(true);
        const previousSchema = sKeys;
        const result = await updateHierarchyTemplate(mConfig, document);
        if (result.svrState) {
            const { sqls, warnings } = await applySchemaIndexLifecycle(
                previousSchema,
                document.schema,
            );
            await refreshHierarchy();
            setSchemaDraft(document.schema);
            setValueTreeDraft(cloneValueTree(document.tree));
            setIsTemplateEditing(true);
            setSchemaEditorOpen(false);
            if (sqls.length > 0) setLastQuery(sqls.join(';\n'));
            if (warnings.length > 0) {
                setIssues((prev) =>
                    prev.concat(
                        warnings.map((message) => ({ level: 'warning' as const, message })),
                    ),
                );
                Toast.warning(
                    'Hierarchy saved, but some index operations failed. See validation notes.',
                );
            } else {
                Toast.success('Hierarchy template updated.');
            }
        } else {
            setError(result.svrReason ?? 'Failed to update hierarchy template.');
        }
        setIsSaving(false);
    };

    const handleInitializeHierarchy = async () => {
        setIsSaving(true);
        // 맨 처음 생성 시 기본 스키마/트리(country/city/… + 'New Country')를 넣지 않고 빈 상태로 시작.
        // 기본값으로 되돌리려면 아래 한 줄을 사용:
        // const document = { ...DEFAULT_HIERARCHY_DOCUMENT, column: sJsonColumn };
        const document = { schema: [], tree: [], column: sJsonColumn };
        const previousSchema = sKeys;
        const result = sHasHierarchyRow
            ? await updateHierarchyTemplate(mConfig, document)
            : await createHierarchyTemplate(mConfig, document);
        const finalResult =
            !sHasHierarchyRow && !result.svrState
                ? await updateHierarchyTemplate(mConfig, document)
                : result;
        if (!finalResult.svrState) {
            setError(finalResult.svrReason ?? 'Failed to initialize hierarchy.');
            setIsSaving(false);
            return;
        }

        const { sqls, warnings } = await applySchemaIndexLifecycle(previousSchema, document.schema);
        Toast.success(sHasHierarchyRow ? 'Hierarchy reset.' : 'Hierarchy initialized.');
        await refreshHierarchy();
        setSchemaDraft(document.schema);
        setValueTreeDraft(cloneValueTree(document.tree));
        setIsTemplateEditing(true);
        setSchemaEditorOpen(false);
        if (sqls.length > 0) setLastQuery(sqls.join(';\n'));
        if (warnings.length > 0)
            setIssues((prev) =>
                prev.concat(warnings.map((message) => ({ level: 'warning' as const, message }))),
            );
        setIsSaving(false);
    };

    const handleCreateAssetColumn = async () => {
        const columnName = sNewColumnName.trim();
        if (!canEdit || !isValidColumnName) return;

        setIsCreatingAssetColumn(true);
        setError('');
        setLastQuery(buildCreateJsonMetadataColumnSql(tableName, columnName));
        const result = await createJsonMetadataColumn(tableName, columnName);
        if (result.svrState) {
            Toast.success(`${columnName} metadata column created.`);
            setJsonColumn(columnName);
            onMetadataSchemaChange?.();
        } else {
            setError(result.svrReason ?? `Failed to create ${columnName} metadata column.`);
        }
        setIsCreatingAssetColumn(false);
    };

    // Drag payload: when the dragged tag is part of a multi-selection, carry the whole selection
    // (newline-joined) so a single drag moves every selected tag at once.
    const dragPayloadFor = (tagName: string) =>
        sSelectedTagNames.has(tagName) && sSelectedTagNames.size > 1
            ? Array.from(sSelectedTagNames).join('\n')
            : tagName;
    const parseDragPayload = (data: string) =>
        data
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean);

    // Start a tag drag. For a multi-tag drag, show a "{n} tags" badge as the drag image
    // instead of the single dragged row (so the user can see how many are moving).
    const startTagDrag = (event: React.DragEvent<HTMLDivElement>, tagName: string) => {
        const payload = dragPayloadFor(tagName);
        event.dataTransfer.setData('text/plain', payload);
        event.dataTransfer.effectAllowed = 'move';

        const count = parseDragPayload(payload).length;
        if (count > 1) {
            const ghost = document.createElement('div');
            ghost.textContent = `${count} tags`;
            ghost.className = styles.dragGhost;
            document.body.appendChild(ghost);
            event.dataTransfer.setDragImage(ghost, 12, 12);
            window.setTimeout(() => ghost.remove(), 0);
        }
    };

    const handleDropTagsOnNode = async (payload: string, targetPath: HierarchyPathItem[]) => {
        const names = parseDragPayload(payload);
        if (!canEdit || names.length === 0 || sKeys.length === 0) return;

        setIsSaving(true);
        setLastQuery(buildMoveTagsToHierarchyPathSql(mConfig, names, sKeys, targetPath));
        const result = await moveTagsToHierarchyPath(mConfig, names, sKeys, targetPath);
        if (result.svrState) {
            Toast.success(`${names.length} tag(s) moved.`);
            clearTagSelection();
            expandPathToTarget(targetPath);
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to move tags.');
        }
        setIsSaving(false);
    };

    // Dropping onto "Unassigned Tags" detaches the dragged tag(s) from the hierarchy.
    const handleDropTagsOnUnassigned = async (payload: string) => {
        const names = parseDragPayload(payload);
        if (!canEdit || names.length === 0 || sKeys.length === 0) return;

        setIsSaving(true);
        setLastQuery(buildDetachTagsSql(mConfig, names, sKeys));
        const result = await detachTagsFromHierarchy(mConfig, names, sKeys);
        if (result.svrState) {
            Toast.success(`${names.length} tag(s) moved to unassigned.`);
            clearTagSelection();
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to unassign tags.');
        }
        setIsSaving(false);
    };

    // Single tree-node row (no recursion — descendants are flattened into mTreeRows).
    const renderTreeNodeRow = (node: HierarchyChildRow, depth: number): React.ReactNode => {
        const key = pathKey(node.path);
        const isExpanded = sExpandedPathKeys.has(key);
        const isSelected = mSelectedPathKey === key && !sSelectedNode.isUnassigned;

        return (
            <div
                className={[
                    styles.node,
                    isSelected ? styles.selected : '',
                    sDragOverKey === key ? styles.dragOver : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
                onClick={() => {
                    handleSelectNode({ path: node.path });
                    handleToggleNode(node);
                }}
                onContextMenu={(event) => {
                    event.preventDefault();
                    startTemplateEdit();
                }}
                onDragOver={(event) => {
                    if (canEdit) {
                        event.preventDefault();
                        setDragOverKey(key);
                        armHoverExpand(node);
                    }
                }}
                onDragLeave={(event) => {
                    setDragOverKey((current) => (current === key ? '' : current));
                    // Cancel the spring-load only when genuinely leaving the node
                    // (not when the pointer moves onto one of its inner spans).
                    const related = event.relatedTarget as Node | null;
                    if (
                        hoverExpandRef.current?.key === key &&
                        !event.currentTarget.contains(related)
                    ) {
                        disarmHoverExpand();
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragOverKey('');
                    disarmHoverExpand();
                    handleDropTagsOnNode(event.dataTransfer.getData('text/plain'), node.path);
                }}
            >
                <span
                    className={styles.nodeToggle}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleToggleNode(node);
                    }}
                >
                    <FiChevronRight
                        className={[styles.chevron, isExpanded ? styles.chevronExpanded : '']
                            .filter(Boolean)
                            .join(' ')}
                    />
                </span>
                <span className={styles.nodeLabel}>
                    <span>{node.value}</span>
                    <span className={styles.nodeMeta}>{node.key}</span>
                </span>
                <IconButton
                    className={styles.rowAction}
                    aria-label={`Details for ${node.value}`}
                    title="Details"
                    size="icon"
                    variant="ghost"
                    icon={<FiMoreHorizontal />}
                    onClick={(event) => {
                        event.stopPropagation();
                        openNodeDetail({ path: node.path });
                    }}
                />
            </div>
        );
    };

    const renderTagRow = (
        row: HierarchyTagRow,
        keyPrefix: string,
        depth: number,
        orderedNames: string[],
    ): React.ReactNode => {
        const isSelected = sSelectedTagNames.has(row.name);
        return (
            <div
                key={`${keyPrefix}::tag::${row.name}`}
                className={[styles.node, styles.tagNode, isSelected ? styles.selected : '']
                    .filter(Boolean)
                    .join(' ')}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
                draggable={canEdit}
                onClick={(event) => handleTagRowSelect(row.name, orderedNames, event.shiftKey)}
                onDragStart={(event) => startTagDrag(event, row.name)}
                // Drag ended anywhere (drop or ESC-cancel): drop any pending spring-load.
                onDragEnd={() => {
                    disarmHoverExpand();
                    setDragOverKey('');
                }}
            >
                <input
                    type="checkbox"
                    className={styles.tagCheckbox}
                    checked={isSelected}
                    readOnly
                    tabIndex={-1}
                    aria-label={`Select ${row.name}`}
                />
                <span className={styles.tagLinkButton}>
                    <FiTag />
                    <span>{row.name}</span>
                </span>
                <IconButton
                    className={styles.rowAction}
                    aria-label={`Details for ${row.name}`}
                    title="Details"
                    size="icon"
                    variant="ghost"
                    icon={<FiMoreHorizontal />}
                    onClick={(event) => {
                        event.stopPropagation();
                        openTagDetail(row);
                    }}
                />
            </div>
        );
    };

    // Render one flattened tree row (node or tag link) for both the virtualized
    // and the plain-map code paths.
    const renderTreeFlatRow = (item: TreeFlatRow): React.ReactNode =>
        item.kind === 'node'
            ? renderTreeNodeRow(item.node, item.depth)
            : renderTagRow(item.row, item.parentKey, item.depth, item.orderedNames);

    // Pre-order render of one outliner row + its descendants (flattened into one list).
    const renderTreeEditorNode = (node: HierarchyValueNode, path: number[]): React.ReactNode[] => {
        const key = path.join('-');
        const depth = path.length; // 1-based, drives the badge number + indent
        const canIndent = canIndentHierarchyValueNode(sValueTreeDraft, path, sSchemaDraft.length);
        const canOutdent = canOutdentHierarchyValueNode(path);
        const canDelete = canRemoveHierarchyValueNode(node);
        const errors = mTreeErrorMap.get(key);

        const rows: React.ReactNode[] = [
            <div key={`tree-${key}`} className={styles.treeRowWrap}>
                <div
                    className={styles.treeRow}
                    style={{ paddingLeft: (depth - 1) * TREE_INDENT_PX }}
                >
                    {Array.from({ length: depth - 1 }, (_, level) => (
                        <span
                            key={`guide-${level}`}
                            className={styles.treeGuide}
                            style={{ left: level * TREE_INDENT_PX + TREE_GUIDE_OFFSET_PX }}
                            aria-hidden
                        />
                    ))}
                    <span className={styles.schemaChipIndex}>{depth}</span>
                    <Input
                        ref={(el) => {
                            if (el) treeInputRefs.current.set(key, el);
                            else treeInputRefs.current.delete(key);
                        }}
                        className={styles.treeInput}
                        size="sm"
                        variant={errors ? 'error' : 'default'}
                        value={node.value}
                        placeholder={sSchemaDraft[depth - 1] ?? 'value'}
                        onChange={(event) =>
                            updateTemplateDraftAtPath(path, (current) => ({
                                ...current,
                                value: event.target.value,
                            }))
                        }
                        onKeyDown={(event) => handleTreeKeyDown(event, path, node)}
                    />
                    <div className={styles.treeRowActions}>
                        <IconButton
                            className={styles.treeRowAction}
                            aria-label="Indent (Tab)"
                            title="Indent (Tab)"
                            size="icon"
                            variant="ghost"
                            disabled={!canIndent}
                            icon={<FiCornerDownRight />}
                            onClick={() => handleTreeIndent(path)}
                        />
                        <IconButton
                            className={styles.treeRowAction}
                            aria-label="Outdent (Shift+Tab)"
                            title="Outdent (Shift+Tab)"
                            size="icon"
                            variant="ghost"
                            disabled={!canOutdent}
                            icon={<FiCornerUpLeft />}
                            onClick={() => handleTreeOutdent(path)}
                        />
                        <IconButton
                            className={styles.treeRowAction}
                            aria-label="Delete row"
                            title={canDelete ? 'Delete row' : 'Delete child rows first.'}
                            size="icon"
                            variant="ghost"
                            disabled={!canDelete}
                            icon={<FiTrash2 />}
                            onClick={() => handleTreeDelete(path, node)}
                        />
                    </div>
                </div>
                {errors ? (
                    <div
                        className={styles.treeRowError}
                        style={{ paddingLeft: (depth - 1) * TREE_INDENT_PX + TREE_INDENT_PX }}
                    >
                        {errors.join(' · ')}
                    </div>
                ) : null}
            </div>,
        ];
        node.children.forEach((child, index) => {
            rows.push(...renderTreeEditorNode(child, path.concat(index)));
        });
        return rows;
    };

    if (jsonColumns.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>
                        Hierarchy requires a JSON metadata column
                    </div>
                    <div className={styles.emptyText}>
                        {hasAssetColumn
                            ? `${DEFAULT_HIERARCHY_JSON_COLUMN} already exists, but it is not a JSON metadata column. Create a JSON metadata column for the hierarchy.`
                            : `Create a JSON metadata column to store tag hierarchy values (default ${DEFAULT_HIERARCHY_JSON_COLUMN}).`}
                    </div>
                    {sError ? <div className={styles.error}>{sError}</div> : null}
                    <Button.Group>
                        {/* Hierarchy column name — defaults to ASSET, freely editable before Create. */}
                        <Input
                            value={sNewColumnName}
                            placeholder={DEFAULT_HIERARCHY_JSON_COLUMN}
                            variant={isValidColumnName ? 'default' : 'error'}
                            onChange={(event) => setNewColumnName(event.target.value)}
                        />
                        <Button
                            size="sm"
                            variant="primary"
                            disabled={!canEdit || !isValidColumnName}
                            loading={sIsCreatingAssetColumn}
                            onClick={handleCreateAssetColumn}
                        >
                            Create
                        </Button>
                    </Button.Group>
                    {/* {sLastQuery ? <pre className={styles.queryBox}>{sLastQuery}</pre> : null} */}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {sIsTemplateEditing || mHasTemplate ? (
                <div className={styles.toolbar}>
                    <div />
                    {sIsTemplateEditing ? (
                        <div className={styles.toolbarEditActions}>
                            <span className={styles.editorStatus}>
                                <span
                                    className={
                                        mBlockingCount > 0
                                            ? styles.statusDotError
                                            : styles.statusDotOk
                                    }
                                />
                                {mBlockingCount > 0
                                    ? `${mBlockingCount} validation issue${mBlockingCount > 1 ? 's' : ''}`
                                    : 'No validation issues.'}
                            </span>
                            <Button.Group>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    loading={sIsSaving}
                                    onClick={saveTemplateEdit}
                                >
                                    Save Tree
                                </Button>
                                <Button size="sm" variant="secondary" onClick={cancelTemplateEdit}>
                                    Cancel
                                </Button>
                            </Button.Group>
                        </div>
                    ) : (
                        // Edit + refresh only matter once a tree exists (guaranteed by the outer
                        // guard); before setup the toolbar bar isn't rendered at all.
                        <Button.Group>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={!canEdit}
                                onClick={startTemplateEdit}
                            >
                                Edit Tree
                            </Button>
                            <IconButton
                                size="sm"
                                variant="secondary"
                                aria-label="Refresh tree"
                                title="Refresh tree"
                                style={{ width: '28px', height: '28px' }}
                                icon={<Refresh style={{ padding: '2px' }} />}
                                loading={sIsLoading}
                                onClick={refreshHierarchy}
                            />
                        </Button.Group>
                    )}
                </div>
            ) : null}
            {!mHasTemplate && !sIsTemplateEditing ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>
                        {sHasHierarchyRow ? 'Tree data needs reset' : 'Tree is not set up yet'}
                    </div>
                    <div className={styles.emptyText}>
                        {sHasHierarchyRow
                            ? `The hierarchy data in ${sJsonColumn} is not in the current tree format. Reset it to start from a clean tree.`
                            : `Start a hierarchy tree for ${sJsonColumn}. A default schema and first root node will be created automatically.`}
                    </div>
                    {sError ? <div className={styles.error}>{sError}</div> : null}
                    <Button
                        size="sm"
                        variant="primary"
                        disabled={!canEdit}
                        loading={sIsSaving}
                        onClick={handleInitializeHierarchy}
                    >
                        {sHasHierarchyRow ? 'Reset Tree' : 'Start Tree Setup'}
                    </Button>
                </div>
            ) : (
                <SplitPane
                    split="vertical"
                    sizes={sIsTemplateEditing ? ['0%', '100%'] : sPaneSizes}
                    onChange={setPaneSizes}
                    allowResize={!sIsTemplateEditing}
                >
                    <Pane minSize={sIsTemplateEditing ? 0 : 240}>
                        {!sIsTemplateEditing ? (
                            <div className={styles.treePane}>
                                <div className={styles.treeHeader} style={{ padding: '7px' }}>
                                    <Input
                                        size="sm"
                                        fullWidth
                                        leftIcon={<FiSearch />}
                                        placeholder="Search nodes"
                                        value={sSearchText}
                                        onChange={(event) => setSearchText(event.target.value)}
                                        rightIcon={
                                            <span className={styles.searchActions}>
                                                <IconButton
                                                    className={styles.searchAction}
                                                    aria-label="Collapse all tree nodes"
                                                    title="Collapse all"
                                                    size="xsm"
                                                    variant="ghost"
                                                    icon={<LuChevronsDownUp size={10} />}
                                                    disabled={sIsLoading || !mHasTemplate}
                                                    onClick={handleCollapseAllTree}
                                                />
                                                <IconButton
                                                    className={styles.searchAction}
                                                    aria-label="Expand all tree nodes"
                                                    title="Expand all"
                                                    size="xsm"
                                                    variant="ghost"
                                                    icon={<LuChevronsUpDown size={10} />}
                                                    disabled={sIsLoading || !mHasTemplate}
                                                    onClick={handleExpandAllTree}
                                                />
                                            </span>
                                        }
                                    />
                                </div>
                                <div className={styles.treeSplit}>
                                    <div className={styles.treeSection}>
                                        {sValueTree.length === 0 ? (
                                            <div className={styles.message}>
                                                Tree is empty. Use Edit Tree to set up the
                                                hierarchy.
                                            </div>
                                        ) : mTreeRows.length > VIRTUALIZE_ROW_THRESHOLD ? (
                                            <Virtuoso
                                                className="scrollbar-dark"
                                                style={{ height: '100%' }}
                                                data={mTreeRows}
                                                itemContent={(_, item) => renderTreeFlatRow(item)}
                                            />
                                        ) : (
                                            mTreeRows.map((item) => (
                                                <React.Fragment key={item.rowKey}>
                                                    {renderTreeFlatRow(item)}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </div>
                                    <div
                                        className={[
                                            styles.unassignedPane,
                                            sDragOverKey === UNASSIGNED_TREE_KEY
                                                ? styles.dragOver
                                                : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onDragOver={(event) => {
                                            if (canEdit) {
                                                event.preventDefault();
                                                setDragOverKey(UNASSIGNED_TREE_KEY);
                                            }
                                        }}
                                        onDragLeave={() =>
                                            setDragOverKey((current) =>
                                                current === UNASSIGNED_TREE_KEY ? '' : current,
                                            )
                                        }
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            setDragOverKey('');
                                            handleDropTagsOnUnassigned(
                                                event.dataTransfer.getData('text/plain'),
                                            );
                                        }}
                                    >
                                        {/* Header is not clickable: detail opens via the ⋯ button only. */}
                                        <div className={styles.unassignedHeader}>
                                            <div className={styles.unassignedHeaderLeft}>
                                                <FiTag className={styles.unassignedIcon} />
                                                <span
                                                    className={styles.unassignedTitle}
                                                    title="Unassigned Tags"
                                                >
                                                    Unassigned Tags
                                                </span>
                                                {/* Server-side total (reflects the search NAME LIKE
                                                    filter), pinned left next to the title. */}
                                                <span className={styles.unassignedCount}>
                                                    {sUnassignedCount}
                                                </span>
                                            </div>
                                            <div className={styles.unassignedHeaderRight}>
                                                {sUnassignedTotal > 0 ? (
                                                    <>
                                                        {/* Selected count vs the total above makes the
                                                            partial select-all transparent: with infinite
                                                            scroll only loaded rows can be selected. */}
                                                        {mSelectedUnassignedCount > 0 ? (
                                                            <span className={styles.selectedCount}>
                                                                {mSelectedUnassignedCount} selected
                                                            </span>
                                                        ) : null}
                                                        <label className={styles.selectAll}>
                                                            <input
                                                                type="checkbox"
                                                                checked={mAllUnassignedSelected}
                                                                readOnly
                                                                disabled={
                                                                    mUnassignedNames.length === 0
                                                                }
                                                                onClick={() =>
                                                                    toggleSelectAll(mUnassignedNames)
                                                                }
                                                            />
                                                            Select all
                                                        </label>
                                                    </>
                                                ) : null}
                                                <IconButton
                                                    className={styles.unassignedDetailBtn}
                                                    aria-label="Details for unassigned tags"
                                                    title="Details"
                                                    size="icon"
                                                    variant="ghost"
                                                    icon={<FiMoreHorizontal />}
                                                    onClick={() =>
                                                        openNodeDetail({
                                                            isUnassigned: true,
                                                            path: [],
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {sUnassignedTotal > 0 ? (
                                            <div className={styles.unassignedSearch}>
                                                <Input
                                                    size="sm"
                                                    fullWidth
                                                    leftIcon={<FiSearch />}
                                                    placeholder="Search unassigned tags"
                                                    value={sUnassignedSearch}
                                                    onChange={(event) =>
                                                        setUnassignedSearch(event.target.value)
                                                    }
                                                    rightIcon={
                                                        // Always render the clear button so its
                                                        // slot is reserved — toggling only its
                                                        // visibility keeps the input height fixed
                                                        // (no layout jump when text appears).
                                                        <IconButton
                                                            className={styles.searchAction}
                                                            aria-label="Clear unassigned search"
                                                            title="Clear"
                                                            size="xsm"
                                                            variant="ghost"
                                                            icon={<FiX size={10} />}
                                                            disabled={!sUnassignedSearch}
                                                            style={{
                                                                visibility: sUnassignedSearch
                                                                    ? 'visible'
                                                                    : 'hidden',
                                                            }}
                                                            onClick={() => setUnassignedSearch('')}
                                                        />
                                                    }
                                                />
                                            </div>
                                        ) : null}
                                        <div className={styles.unassignedListWrap}>
                                            {sIsLoadingUnassigned ? (
                                                <div
                                                    className={styles.tableProgress}
                                                    role="progressbar"
                                                    aria-label="Loading unassigned tags"
                                                />
                                            ) : null}
                                            <div className={styles.unassignedList}>
                                                {mUnassignedRows.length === 0 ? (
                                                    <div className={styles.message}>
                                                        {sUnassignedSearch
                                                            ? 'No tags match the search.'
                                                            : 'No unassigned tags.'}
                                                    </div>
                                                ) : mUnassignedRows.length >
                                                      VIRTUALIZE_ROW_THRESHOLD ||
                                                  sUnassignedHasMore ? (
                                                    // Virtualize when the list is long OR more pages
                                                    // remain — the latter keeps endReached available
                                                    // even at exactly one full page (50).
                                                    <Virtuoso
                                                        className="scrollbar-dark"
                                                        style={{ height: '100%' }}
                                                        data={mUnassignedRows}
                                                        endReached={loadMoreUnassigned}
                                                        itemContent={(_, row) =>
                                                            renderTagRow(
                                                                row,
                                                                UNASSIGNED_TREE_KEY,
                                                                0,
                                                                mUnassignedNames,
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    mUnassignedRows.map((row) =>
                                                        renderTagRow(
                                                            row,
                                                            UNASSIGNED_TREE_KEY,
                                                            0,
                                                            mUnassignedNames,
                                                        ),
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </Pane>
                    <Pane minSize={320}>
                        <div className={styles.details}>
                            {sIsTemplateEditing ? (
                                <div className={styles.editorScroll}>
                                    {sError ? <div className={styles.error}>{sError}</div> : null}
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <div className={styles.label}>
                                            Edit schema and value tree. Save updates the reserved{' '}
                                            <code>__machbase_hierarchy__</code> row.
                                        </div>
                                        <div className={styles.schemaSection}>
                                            <button
                                                type="button"
                                                className={styles.schemaHeader}
                                                onClick={() => setSchemaEditorOpen((open) => !open)}
                                            >
                                                <FiChevronRight
                                                    className={[
                                                        styles.chevron,
                                                        mSchemaEditorOpen
                                                            ? styles.chevronExpanded
                                                            : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                />
                                                <FiLayers className={styles.schemaIcon} />
                                                <span className={styles.schemaTitle}>SCHEMA</span>
                                                <span className={styles.schemaLevels}>
                                                    · {sSchemaDraft.length} levels
                                                </span>
                                                {!mSchemaEditorOpen ? (
                                                    <span className={styles.schemaBreadcrumb}>
                                                        {sSchemaDraft.map((key, index) => (
                                                            <span
                                                                key={`schema-chip-${index}`}
                                                                className={styles.schemaChip}
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.schemaChipIndex
                                                                    }
                                                                >
                                                                    {index + 1}
                                                                </span>
                                                                {key}
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : null}
                                                <span className={styles.schemaToggleLabel}>
                                                    {mSchemaEditorOpen
                                                        ? 'Collapse'
                                                        : 'Expand to edit'}
                                                </span>
                                            </button>
                                            <div
                                                className={[
                                                    styles.schemaCollapse,
                                                    mSchemaEditorOpen
                                                        ? styles.schemaCollapseOpen
                                                        : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            >
                                                <div className={styles.schemaCollapseInner}>
                                                    <div className={styles.schemaEditList}>
                                                        {sSchemaDraft.map((key, index) => {
                                                            const canRemoveSchemaKey =
                                                                canRemoveHierarchySchemaKey(
                                                                    sSchemaDraft,
                                                                    sValueTreeDraft,
                                                                    index,
                                                                );
                                                            const schemaErrors =
                                                                mSchemaErrorMap.get(index);
                                                            return (
                                                                <div
                                                                    key={`schema-${index}`}
                                                                    className={
                                                                        styles.schemaEditRowWrap
                                                                    }
                                                                    style={{
                                                                        marginLeft: index * 22,
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={[
                                                                            styles.schemaEditRow,
                                                                            index > 0
                                                                                ? styles.schemaEditRowChild
                                                                                : '',
                                                                        ]
                                                                            .filter(Boolean)
                                                                            .join(' ')}
                                                                    >
                                                                        <Input
                                                                            variant={
                                                                                schemaErrors
                                                                                    ? 'error'
                                                                                    : 'default'
                                                                            }
                                                                            ref={(el) => {
                                                                                schemaInputRefs.current[
                                                                                    index
                                                                                ] = el;
                                                                            }}
                                                                            className={
                                                                                styles.schemaEditInput
                                                                            }
                                                                            size="sm"
                                                                            fullWidth
                                                                            value={key}
                                                                            onChange={(event) =>
                                                                                updateSchemaDraft(
                                                                                    index,
                                                                                    event.target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            addonBefore={
                                                                                <span
                                                                                    className={
                                                                                        styles.schemaBadge
                                                                                    }
                                                                                >
                                                                                    <span
                                                                                        className={
                                                                                            styles.schemaChipIndex
                                                                                        }
                                                                                    >
                                                                                        {index + 1}
                                                                                    </span>
                                                                                </span>
                                                                            }
                                                                            addonAfter={
                                                                                <span
                                                                                    className={
                                                                                        styles.schemaRowMeta
                                                                                    }
                                                                                >
                                                                                    <span
                                                                                        className={
                                                                                            styles.schemaDepth
                                                                                        }
                                                                                    >
                                                                                        depth{' '}
                                                                                        {index + 1}
                                                                                    </span>
                                                                                    <IconButton
                                                                                        className={
                                                                                            styles.schemaRemove
                                                                                        }
                                                                                        aria-label={`Remove level ${index + 1}`}
                                                                                        title={
                                                                                            canRemoveSchemaKey
                                                                                                ? 'Remove level'
                                                                                                : schemaKeyRemoveReason(
                                                                                                      index,
                                                                                                  )
                                                                                        }
                                                                                        size="icon"
                                                                                        variant="ghost"
                                                                                        disabled={
                                                                                            !canRemoveSchemaKey
                                                                                        }
                                                                                        icon={
                                                                                            <FiX />
                                                                                        }
                                                                                        onClick={() =>
                                                                                            removeSchemaDraftKey(
                                                                                                index,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </span>
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {schemaErrors ? (
                                                                        <div
                                                                            className={
                                                                                styles.schemaRowError
                                                                            }
                                                                        >
                                                                            {schemaErrors.join(
                                                                                ' · ',
                                                                            )}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                        <button
                                                            type="button"
                                                            className={styles.schemaAddLevel}
                                                            style={{
                                                                marginLeft:
                                                                    Math.max(
                                                                        0,
                                                                        sSchemaDraft.length - 1,
                                                                    ) * 22,
                                                            }}
                                                            onClick={addSchemaDraftKey}
                                                        >
                                                            <FiPlus />
                                                            Add level
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.treeEditor}>
                                            <div className={styles.treeHints}>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>Enter</kbd> New row
                                                </span>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>Tab</kbd> Indent
                                                </span>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>⇧Tab</kbd> Outdent
                                                </span>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>↑↓</kbd> Navigate
                                                </span>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>
                                                        {ALT_KEY_LABEL}↑↓
                                                    </kbd>{' '}
                                                    Move row
                                                </span>
                                                <span className={styles.treeHint}>
                                                    <kbd className={styles.kbd}>⌫</kbd> Delete empty
                                                </span>
                                            </div>
                                            <div className={styles.treeRows}>
                                                {sValueTreeDraft.flatMap((node, index) =>
                                                    renderTreeEditorNode(node, [index]),
                                                )}
                                                {sValueTreeDraft.length === 0 ? (
                                                    <button
                                                        type="button"
                                                        className={styles.schemaAddLevel}
                                                        onClick={handleTreeAddRoot}
                                                    >
                                                        <FiPlus />
                                                        Add row
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                        {/* Node-level issues render inline on their row; only
                                        schema/global issues and warnings remain here. */}
                                        {[
                                            ...mGlobalIssues,
                                            ...sIssues.filter((issue) => issue.level === 'warning'),
                                        ].map((issue, index) => (
                                            <div
                                                key={`${issue.level}-${index}`}
                                                className={
                                                    issue.level === 'blocking'
                                                        ? styles.error
                                                        : styles.warning
                                                }
                                            >
                                                {issue.level}: {issue.message}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : sSelectedTagNames.size > 0 ? (
                                <div className={styles.panel}>
                                    {sError ? <div className={styles.error}>{sError}</div> : null}
                                    <div className={styles.placementHeader}>
                                        <strong>{sSelectedTagNames.size} selected</strong>
                                        <span className={styles.placementCount}>
                                            · {mPlacedSelectedNames.length} placed
                                        </span>
                                    </div>
                                    <div className={styles.placementHint}>
                                        Choose where to place (or move) the tags. You can also drag
                                        them onto the tree on the left.
                                    </div>
                                    <div className={styles.label}>Target location</div>
                                    <div className={styles.placementTargets}>
                                        {mAllValuePaths.map((path) => {
                                            const key = pathKey(path);
                                            const last = path[path.length - 1];
                                            return (
                                                <label
                                                    key={key}
                                                    className={[
                                                        styles.placementTarget,
                                                        sPlacementTargetKey === key
                                                            ? styles.selected
                                                            : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    style={{
                                                        paddingLeft: `${6 + (path.length - 1) * 16}px`,
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="placement-target"
                                                        checked={sPlacementTargetKey === key}
                                                        onChange={() => setPlacementTargetKey(key)}
                                                    />
                                                    <span>{last.value}</span>
                                                    <span className={styles.nodeMeta}>
                                                        {last.key}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {mPlacementTargetPath.length > 0 ? (
                                        <div className={styles.placementBreadcrumb}>
                                            <FiCornerDownRight /> Target{' '}
                                            <span>
                                                {mPlacementTargetPath
                                                    .map((item) => item.value)
                                                    .join(' › ')}
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className={styles.placementBar}>
                                        <Button
                                            className={styles.placementPrimary}
                                            variant="primary"
                                            loading={sIsSaving}
                                            disabled={!canEdit || mPlacementTargetPath.length === 0}
                                            onClick={handlePlaceSelectedTags}
                                        >
                                            Place {sSelectedTagNames.size} here
                                        </Button>
                                        <Button variant="secondary" onClick={clearTagSelection}>
                                            Clear
                                        </Button>
                                    </div>
                                    {mPlacedSelectedNames.length > 0 ? (
                                        <Button
                                            className={styles.placementFull}
                                            variant="secondary"
                                            icon={<FiRotateCcw />}
                                            loading={sIsSaving}
                                            disabled={!canEdit}
                                            onClick={handleDetachSelectedTags}
                                        >
                                            Unassign ( {mPlacedSelectedNames.length} )
                                        </Button>
                                    ) : null}
                                    <div className={styles.placementFootHint}>
                                        <FiTag /> Click a tag to select. Shift+click for a range, or
                                        use Select all.
                                    </div>
                                </div>
                            ) : sDetailOpen ? (
                                <>
                                    <div className={styles.summary}>
                                        <div className={styles.path}>
                                            {selectedNodeLabel(sSelectedNode)}
                                        </div>
                                    </div>
                                    <div className={styles.tabs}>
                                        {VISIBLE_DETAIL_TABS.map((tab) => (
                                            <button
                                                key={tab}
                                                type="button"
                                                className={[
                                                    styles.tab,
                                                    sActiveTab === tab ? styles.activeTab : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                onClick={() => setActiveTab(tab)}
                                            >
                                                {tab[0].toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={styles.panel}>
                                        {sError ? (
                                            <div className={styles.error}>{sError}</div>
                                        ) : null}
                                        {sActiveTab === 'tags' ? (
                                            <div className={styles.detailTableWrap}>
                                                {sIsLoadingTags ? (
                                                    <div
                                                        className={styles.tableProgress}
                                                        role="progressbar"
                                                        aria-label="Loading tags"
                                                    />
                                                ) : null}
                                                <CommonTable
                                                    data={tagTableData(sTags)}
                                                    showRowNumber
                                                    showCopyButton
                                                    activeRow
                                                    style={{ padding: 0, height: '100%' }}
                                                    emptyMessage="No tags."
                                                    // Virtualized rows + paged loading on scroll-end,
                                                    // the same pattern as the SQL result table. (Plain
                                                    // infiniteScroll disables CommonTable's row
                                                    // virtualization; onEndReached keeps it on.)
                                                    onEndReached={loadMoreTags}
                                                />
                                            </div>
                                        ) : null}
                                        {sActiveTab === 'query' ? (
                                            sLastQuery ? (
                                                <div className={styles.queryWrapper}>
                                                    <Button.Copy
                                                        className={styles.queryCopy}
                                                        size="side"
                                                        variant="ghost"
                                                        aria-label="Copy query"
                                                        onClick={() => ClipboardCopy(sLastQuery)}
                                                    />
                                                    <pre className={styles.query}>{sLastQuery}</pre>
                                                </div>
                                            ) : (
                                                <div className={styles.queryEmpty}>
                                                    No query executed.
                                                </div>
                                            )
                                        ) : null}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.panel}>
                                    {sError ? <div className={styles.error}>{sError}</div> : null}
                                    <div className={styles.message}>
                                        Click a tag to select it for placement. Shift+click for a
                                        range, or use Select all. Use ⋯ on a node or tag to view
                                        tag/query details.
                                    </div>
                                </div>
                            )}
                        </div>
                    </Pane>
                </SplitPane>
            )}
        </div>
    );
};
