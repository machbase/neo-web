import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronRight, FiChevronsDown, FiRefreshCcw, FiTag } from 'react-icons/fi';
import { MdWarningAmber } from 'react-icons/md';
import { Button, CommonTable, IconButton, Modal, Toast } from '@/design-system/components';
import {
    DEFAULT_HIERARCHY_DOCUMENT,
    DEFAULT_HIERARCHY_JSON_COLUMN,
    attachTagsToPath,
    buildAttachTagsSql,
    buildCreateJsonMetadataColumnSql,
    buildGetDirectHierarchyTagsSql,
    buildGetHierarchyTagsSql,
    buildGetUnassignedTagsByDocumentSql,
    buildMoveTagsToHierarchyPathSql,
    canRemoveHierarchySchemaKey,
    canRemoveHierarchyValueNode,
    createHierarchyTemplate,
    createJsonMetadataColumn,
    getDirectHierarchyTags,
    getHierarchyTags,
    getHierarchyTemplate,
    getUnassignedTagCountByDocument,
    getUnassignedTagsByDocument,
    hierarchyTreeHasDepth,
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

type DetailTab = 'tags' | 'query' | 'validation';
type ModalState = 'attach' | undefined;

type JsonMetaColumn = {
    name: string;
    type: string | number;
};

type SelectedNode = {
    path: HierarchyPathItem[];
    isUnassigned?: boolean;
    isSkeleton?: boolean;
    templateKeyPath?: string[];
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

const pathKey = (path: HierarchyPathItem[]) => (path.length === 0 ? ROOT_KEY : path.map((item) => `${item.key}=${item.value}`).join('/'));

const pathLabel = (path: HierarchyPathItem[]) => (path.length === 0 ? 'Root' : path.map((item) => item.value).join(' / '));

const selectedNodeLabel = (node: SelectedNode) => {
    if (node.isUnassigned) return 'Unassigned Tags';
    if (node.isSkeleton) return node.templateKeyPath?.join(' / ') ?? 'Template';
    return pathLabel(node.path);
};

const tagTableData = (rows: HierarchyTagRow[]) => ({
    columns: ['NAME', 'ASSET', 'SPEC'],
    rows: rows.map((row) => [row.name, row.asset, row.spec ?? '']),
    types: ['string', 'string', 'string'],
});

const defaultJsonColumnName = (columns: JsonMetaColumn[]) => columns.find((column) => column.name.toLowerCase() === 'asset')?.name ?? columns[0]?.name ?? '';

const pathOptionLabel = (keys: string[]) => keys.join(' / ');

const cloneValueTree = (nodes: HierarchyValueNode[]): HierarchyValueNode[] =>
    nodes.map((node) => ({ key: node.key, value: node.value, children: cloneValueTree(node.children) }));

const nodeAtPath = (nodes: HierarchyValueNode[], nodePath: number[]): HierarchyValueNode | undefined => {
    const [head, ...tail] = nodePath;
    const node = nodes[head];
    if (!node || tail.length === 0) return node;
    return nodeAtPath(node.children, tail);
};

const normalizeTreeKeys = (nodes: HierarchyValueNode[], schema: string[], depth = 0): HierarchyValueNode[] =>
    nodes.map((node) => ({ ...node, key: schema[depth] ?? node.key, children: normalizeTreeKeys(node.children, schema, depth + 1) }));

const childrenForValuePath = (nodes: HierarchyValueNode[], path: HierarchyPathItem[]): HierarchyValueNode[] => {
    if (path.length === 0) return nodes;
    const [head, ...tail] = path;
    const node = nodes.find((item) => item.key === head.key && item.value === head.value);
    return node ? childrenForValuePath(node.children, tail) : [];
};

const valuePathsFromTree = (nodes: HierarchyValueNode[], parentPath: HierarchyPathItem[] = []): HierarchyPathItem[][] =>
    nodes.flatMap((node) => {
        const path = parentPath.concat({ key: node.key, value: node.value });
        return [path].concat(valuePathsFromTree(node.children, path));
    });

const AttachTagsModal = ({
    tagNames,
    values,
    keys,
    pathOptions,
    selectedPathIndex,
    loading,
    onTagNamesChange,
    onValueChange,
    onPathChange,
    onClose,
    onConfirm,
}: {
    tagNames: string;
    values: Record<string, string>;
    keys: string[];
    pathOptions?: string[][];
    selectedPathIndex?: number;
    loading: boolean;
    onTagNamesChange: (value: string) => void;
    onValueChange: (key: string, value: string) => void;
    onPathChange?: (index: number) => void;
    onClose: () => void;
    onConfirm: () => void;
}) => {
    const isComplete = tagNames.trim() && keys.every((key) => values[key]?.trim());

    return (
        <Modal.Root isOpen onClose={onClose} size="lg">
            <Modal.Header>
                <Modal.Title>Attach tags</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'grid', gap: 8 }}>
                    <textarea className={styles.textarea} value={tagNames} placeholder="TAG_01, TAG_02" onChange={(event) => onTagNamesChange(event.target.value)} />
                    {pathOptions && pathOptions.length > 1 ? (
                        <label className={styles.label}>
                            Path
                            <select className={styles.select} style={{ width: '100%', marginTop: 4 }} value={selectedPathIndex ?? 0} onChange={(event) => onPathChange?.(Number(event.target.value))}>
                                {pathOptions.map((path, index) => (
                                    <option key={path.join('/')} value={index}>
                                        {pathOptionLabel(path)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                    {keys.map((key) => (
                        <label key={key} className={styles.label}>
                            {key}
                            <input className={styles.input} style={{ width: '100%', marginTop: 4 }} value={values[key] ?? ''} onChange={(event) => onValueChange(key, event.target.value)} />
                        </label>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm loading={loading} disabled={!isComplete} onClick={onConfirm}>
                    Attach
                </Modal.Confirm>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

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
    const [sJsonColumn, setJsonColumn] = useState(defaultJsonColumnName(jsonColumns));
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
    const [sUnassignedCount, setUnassignedCount] = useState(0);
    const [sSearchText, setSearchText] = useState('');
    const [sActiveTab, setActiveTab] = useState<DetailTab>('tags');
    const [sLastQuery, setLastQuery] = useState('');
    const [sError, setError] = useState('');
    const [sIsLoading, setIsLoading] = useState(false);
    const [sModal, setModal] = useState<ModalState>();
    const [sModalValue, setModalValue] = useState('');
    const [sAttachValues, setAttachValues] = useState<Record<string, string>>({});
    const [sAttachKeys, setAttachKeys] = useState<string[]>([]);
    const [sAttachPathOptions, setAttachPathOptions] = useState<string[][]>([]);
    const [sAttachPathIndex, setAttachPathIndex] = useState(0);
    const [sIsSaving, setIsSaving] = useState(false);
    const [sIsCreatingAssetColumn, setIsCreatingAssetColumn] = useState(false);
    const expandedPathKeysRef = useRef(sExpandedPathKeys);

    const mConfig = useMemo<HierarchyQueryConfig>(
        () => ({
            tableName,
            nameColumn,
            jsonColumn: sJsonColumn,
            specColumn,
        }),
        [nameColumn, sJsonColumn, specColumn, tableName]
    );

    const mSelectedPathKey = pathKey(sSelectedNode.path);
    const mHasTemplate = sKeys.length > 0;

    useEffect(() => {
        const nextColumn = defaultJsonColumnName(jsonColumns);
        setJsonColumn((prev) => prev || nextColumn);
    }, [jsonColumns]);

    useEffect(() => {
        expandedPathKeysRef.current = sExpandedPathKeys;
    }, [sExpandedPathKeys]);

    const loadTagsForNode = useCallback(
        async (node: SelectedNode, document?: HierarchyDocument) => {
            if (node.isUnassigned) {
                if (!document) return;
                setLastQuery(buildGetUnassignedTagsByDocumentSql(mConfig, document));
                const tags = await getUnassignedTagsByDocument(mConfig, document);
                setTags(tags.rows);
                if (!tags.success) setError(tags.reason ?? 'Failed to load unassigned tags.');
                return;
            }

            setLastQuery(buildGetHierarchyTagsSql(mConfig, node.path));
            const tags = await getHierarchyTags(mConfig, node.path);
            setTags(tags.rows);
            if (!tags.success) setError(tags.reason ?? 'Failed to load hierarchy tags.');
        },
        [mConfig]
    );

    const loadTagLinksForPaths = useCallback(
        async (document: HierarchyDocument, paths: HierarchyPathItem[][], options: { includeUnassigned?: boolean } = {}) => {
            const uniquePaths = Array.from(new Map(paths.map((path) => [pathKey(path), path])).values());
            const nextLinks: Record<string, HierarchyTagRow[]> = {};

            const results = await Promise.all(
                uniquePaths.map(async (path) => ({
                    key: pathKey(path),
                    result: await getDirectHierarchyTags(mConfig, document.schema, path),
                }))
            );

            results.forEach(({ key, result }) => {
                if (result.success) {
                    nextLinks[key] = result.rows;
                } else {
                    setError(result.reason ?? 'Failed to load tag links.');
                }
            });

            if (options.includeUnassigned) {
                const unassigned = await getUnassignedTagsByDocument(mConfig, document);
                if (unassigned.success) {
                    nextLinks[UNASSIGNED_TREE_KEY] = unassigned.rows;
                } else {
                    setError(unassigned.reason ?? 'Failed to load unassigned tags.');
                }
            }

            setTagLinksByPath((prev) => ({ ...prev, ...nextLinks }));
        },
        [mConfig]
    );

    const loadUnassignedTagLinks = useCallback(async () => {
        if (!sHierarchyDocument) return;
        if (sTagLinksByPath[UNASSIGNED_TREE_KEY]) return;

        setLastQuery(buildGetUnassignedTagsByDocumentSql(mConfig, sHierarchyDocument));
        const result = await getUnassignedTagsByDocument(mConfig, sHierarchyDocument);
        if (result.success) {
            setTagLinksByPath((prev) => ({ ...prev, [UNASSIGNED_TREE_KEY]: result.rows }));
        } else {
            setError(result.reason ?? 'Failed to load unassigned tags.');
        }
    }, [mConfig, sHierarchyDocument, sTagLinksByPath]);

    const refreshHierarchy = useCallback(async () => {
        if (!active || !sJsonColumn) return;

        setIsLoading(true);
        setError('');
        setTagLinksByPath({});

        const templateResult = await getHierarchyTemplate(mConfig);
        setHasHierarchyRow(Boolean(templateResult.hasRow));
        if (!templateResult.success) {
            setKeys([]);
            setHierarchyDocument(undefined);
            setValueTree([]);
            setIssues([{ level: 'blocking', message: templateResult.reason ?? 'Failed to load hierarchy template.' }]);
            setIsLoading(false);
            return;
        }

        if (!templateResult.document) {
            setKeys([]);
            setHierarchyDocument(undefined);
            setValueTree([]);
            setSchemaDraft(DEFAULT_HIERARCHY_DOCUMENT.schema);
            setValueTreeDraft([]);
            setIssues((templateResult.issues as HierarchyValidationIssue[] | undefined) ?? [{ level: 'blocking', message: 'No schema/tree hierarchy document found. Recreate the tree.' }]);
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
        const expandedKeys = expandedPathKeysRef.current;
        const expandedPaths = valuePathsFromTree(document.tree).filter((path) => expandedKeys.has(pathKey(path)));
        const shouldReloadUnassignedLinks = expandedKeys.has(UNASSIGNED_TREE_KEY);

        await Promise.all([
            loadTagsForNode(EMPTY_SELECTED_NODE, document),
            getUnassignedTagCountByDocument(mConfig, document).then(setUnassignedCount),
            loadTagLinksForPaths(document, expandedPaths, { includeUnassigned: shouldReloadUnassignedLinks }),
        ]);
        setIsLoading(false);
    }, [active, loadTagLinksForPaths, loadTagsForNode, mConfig, sJsonColumn]);

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

    const handleToggleUnassigned = async () => {
        const nextExpanded = new Set(sExpandedPathKeys);
        if (nextExpanded.has(UNASSIGNED_TREE_KEY)) {
            nextExpanded.delete(UNASSIGNED_TREE_KEY);
        } else {
            nextExpanded.add(UNASSIGNED_TREE_KEY);
            await loadUnassignedTagLinks();
        }
        setExpandedPathKeys(nextExpanded);
    };

    const handleExpandAllTree = async () => {
        if (!sHierarchyDocument) return;

        const paths = valuePathsFromTree(sHierarchyDocument.tree);
        const nextExpanded = new Set(paths.map(pathKey));
        nextExpanded.add(UNASSIGNED_TREE_KEY);
        setExpandedPathKeys(nextExpanded);
        setIsLoading(true);
        setError('');
        await loadTagLinksForPaths(sHierarchyDocument, paths, { includeUnassigned: true });
        setIsLoading(false);
    };

    const handleSelectNode = async (node: SelectedNode) => {
        setSelectedNode(node);
        setError('');
        if (node.isSkeleton) {
            setTags([]);
            setLastQuery('Template skeleton node. Fill hierarchy values in Attach Tags to create concrete metadata paths.');
            return;
        }
        await loadTagsForNode(node, sHierarchyDocument);
    };

    const openMoveTagModal = (row: HierarchyTagRow) => {
        const pathOptions = sKeys.length > 0 ? [sKeys] : [];
        const attachKeys = pathOptions[0] ?? [];
        setAttachPathOptions(pathOptions);
        setAttachPathIndex(0);
        setAttachKeys(attachKeys);
        setAttachValues(Object.fromEntries(attachKeys.map((key) => [key, ''])));
        setModalValue(row.name);
        setModal('attach');
    };

    const handleAttachPathChange = (index: number) => {
        const attachKeys = sAttachPathOptions[index] ?? [];
        setAttachPathIndex(index);
        setAttachKeys(attachKeys);
        setAttachValues((prev) => Object.fromEntries(attachKeys.map((key) => [key, prev[key] ?? ''])));
    };

    const startTemplateEdit = () => {
        setSchemaDraft(sKeys.length > 0 ? sKeys : DEFAULT_HIERARCHY_DOCUMENT.schema);
        setValueTreeDraft(cloneValueTree(sValueTree));
        setIsTemplateEditing(true);
        setActiveTab('validation');
    };

    const cancelTemplateEdit = () => {
        setSchemaDraft(sKeys.length > 0 ? sKeys : DEFAULT_HIERARCHY_DOCUMENT.schema);
        setValueTreeDraft(cloneValueTree(sValueTree));
        setIsTemplateEditing(false);
        setActiveTab('tags');
    };

    const updateTemplateDraftAtPath = (nodePath: number[], update: (node: HierarchyValueNode) => HierarchyValueNode) => {
        const updateNodes = (nodes: HierarchyValueNode[], depth = 0): HierarchyValueNode[] =>
            nodes.map((node, index) => {
                if (index !== nodePath[depth]) return node;
                if (depth === nodePath.length - 1) return update(node);
                return { ...node, children: updateNodes(node.children, depth + 1) };
            });

        setValueTreeDraft((prev) => updateNodes(prev));
    };

    const addTemplateDraftNode = (parentPath?: number[]) => {
        const depth = parentPath ? parentPath.length : 0;
        const newNode = { key: sSchemaDraft[depth] ?? 'new_level', value: 'new_value', children: [] };
        if (!parentPath) {
            setValueTreeDraft((prev) => prev.concat(newNode));
            return;
        }

        updateTemplateDraftAtPath(parentPath, (node) => ({ ...node, children: node.children.concat(newNode) }));
    };

    const addTemplateDraftSibling = (nodePath: number[]) => {
        if (nodePath.length <= 1) return;

        const insertSibling = (nodes: HierarchyValueNode[], depth = 0): HierarchyValueNode[] => {
            if (depth === nodePath.length - 1) {
                const current = nodes[nodePath[depth]];
                const next = nodes.slice();
                next.splice(nodePath[depth] + 1, 0, { key: current?.key ?? sSchemaDraft[depth] ?? 'new_level', value: 'new_value', children: [] });
                return next;
            }

            return nodes.map((node, index) => (index === nodePath[depth] ? { ...node, children: insertSibling(node.children, depth + 1) } : node));
        };

        setValueTreeDraft((prev) => insertSibling(prev));
    };

    const removeTemplateDraftNode = (nodePath: number[]) => {
        const node = nodeAtPath(sValueTreeDraft, nodePath);
        if (!node || !canRemoveHierarchyValueNode(node)) return;

        const removeNode = (nodes: HierarchyValueNode[], depth = 0): HierarchyValueNode[] => {
            if (depth === nodePath.length - 1) return nodes.filter((_, index) => index !== nodePath[depth]);
            return nodes.map((node, index) => (index === nodePath[depth] ? { ...node, children: removeNode(node.children, depth + 1) } : node));
        };

        setValueTreeDraft((prev) => removeNode(prev));
    };

    const updateSchemaDraft = (index: number, value: string) => {
        setSchemaDraft((prev) => prev.map((key, keyIndex) => (keyIndex === index ? value : key)));
    };

    const addSchemaDraftKey = () => {
        setSchemaDraft((prev) => prev.concat(`level_${prev.length + 1}`));
    };

    const removeSchemaDraftKey = (index: number) => {
        if (!canRemoveHierarchySchemaKey(sSchemaDraft, sValueTreeDraft, index)) return;
        setSchemaDraft((prev) => prev.filter((_, keyIndex) => keyIndex !== index));
    };

    const schemaKeyRemoveReason = (index: number) => {
        if (index !== sSchemaDraft.length - 1) return 'Remove schema keys from the deepest depth first.';
        if (hierarchyTreeHasDepth(sValueTreeDraft, index)) return 'Remove all tree nodes at this depth before removing the schema key.';
        return '';
    };

    const saveTemplateEdit = async () => {
        const document = { schema: sSchemaDraft.map((key) => key.trim()), tree: normalizeTreeKeys(sValueTreeDraft, sSchemaDraft.map((key) => key.trim())) };
        const issues = validateHierarchyDocument(document);
        setIssues(issues);

        if (issues.some((issue) => issue.level === 'blocking')) return;

        setIsSaving(true);
        const result = await updateHierarchyTemplate(mConfig, document);
        if (result.svrState) {
            Toast.success('Hierarchy template updated.');
            setIsTemplateEditing(false);
            await refreshHierarchy();
            setActiveTab('tags');
        } else {
            setError(result.svrReason ?? 'Failed to update hierarchy template.');
        }
        setIsSaving(false);
    };

    const handleInitializeHierarchy = async () => {
        setIsSaving(true);
        const document = DEFAULT_HIERARCHY_DOCUMENT;
        const result = sHasHierarchyRow ? await updateHierarchyTemplate(mConfig, document) : await createHierarchyTemplate(mConfig, document);
        const finalResult = !sHasHierarchyRow && !result.svrState ? await updateHierarchyTemplate(mConfig, document) : result;
        if (!finalResult.svrState) {
            setError(finalResult.svrReason ?? 'Failed to initialize hierarchy.');
            setIsSaving(false);
            return;
        }

        Toast.success(sHasHierarchyRow ? 'Hierarchy reset.' : 'Hierarchy initialized.');
        await refreshHierarchy();
        setSchemaDraft(document.schema);
        setValueTreeDraft(cloneValueTree(document.tree));
        setIsTemplateEditing(true);
        setActiveTab('validation');
        setIsSaving(false);
    };

    const handleCreateAssetColumn = async () => {
        if (!canEdit || hasAssetColumn) return;

        setIsCreatingAssetColumn(true);
        setError('');
        setLastQuery(buildCreateJsonMetadataColumnSql(tableName, DEFAULT_HIERARCHY_JSON_COLUMN));
        const result = await createJsonMetadataColumn(tableName, DEFAULT_HIERARCHY_JSON_COLUMN);
        if (result.svrState) {
            Toast.success('ASSET metadata column created.');
            setJsonColumn(DEFAULT_HIERARCHY_JSON_COLUMN);
            onMetadataSchemaChange?.();
        } else {
            setError(result.svrReason ?? 'Failed to create ASSET metadata column.');
        }
        setIsCreatingAssetColumn(false);
    };

    const handleAttach = async () => {
        const names = sModalValue
            .split(/[,\n]/)
            .map((name) => name.trim())
            .filter(Boolean);
        if (names.length === 0 || sSelectedNode.isUnassigned) return;

        const targetPath = sAttachKeys.map((key) => ({ key, value: sAttachValues[key]?.trim() ?? '' }));
        if (targetPath.some((item) => !item.value)) {
            setError('All hierarchy values are required before attaching tags.');
            return;
        }

        setIsSaving(true);
        setLastQuery(buildAttachTagsSql(mConfig, names, targetPath));
        const result = await attachTagsToPath(mConfig, names, targetPath);
        if (result.svrState) {
            Toast.success('Tags attached.');
            setModal(undefined);
            setModalValue('');
            setAttachValues({});
            setAttachKeys([]);
            setAttachPathOptions([]);
            setAttachPathIndex(0);
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to attach tags.');
        }
        setIsSaving(false);
    };

    const handleDropTagOnNode = async (tagName: string, targetPath: HierarchyPathItem[]) => {
        if (!canEdit || !tagName || sKeys.length === 0) return;

        setIsSaving(true);
        setLastQuery(buildMoveTagsToHierarchyPathSql(mConfig, [tagName], sKeys, targetPath));
        const result = await moveTagsToHierarchyPath(mConfig, [tagName], sKeys, targetPath);
        if (result.svrState) {
            Toast.success('Tag moved.');
            await refreshHierarchy();
        } else {
            setError(result.svrReason ?? 'Failed to move tag.');
        }
        setIsSaving(false);
    };

    const renderNode = (node: HierarchyChildRow, depth: number): React.ReactNode => {
        const key = pathKey(node.path);
        const valueChildren = childrenForValuePath(sValueTree, node.path);
        const canExpand = true;
        const isExpanded = sExpandedPathKeys.has(key);
        const isSelected = mSelectedPathKey === key && !sSelectedNode.isUnassigned && !sSelectedNode.isSkeleton;
        const matchesSearch = !sSearchText || node.value.toLowerCase().includes(sSearchText.toLowerCase()) || node.key.toLowerCase().includes(sSearchText.toLowerCase());

        return (
            <React.Fragment key={key}>
                {matchesSearch ? (
                    <button
                        type="button"
                        className={[styles.node, isSelected ? styles.selected : ''].filter(Boolean).join(' ')}
                        style={{ paddingLeft: `${6 + depth * 16}px` }}
                        onClick={() => handleSelectNode({ path: node.path })}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            startTemplateEdit();
                        }}
                        onDragOver={(event) => {
                            if (canEdit) event.preventDefault();
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            handleDropTagOnNode(event.dataTransfer.getData('text/plain'), node.path);
                        }}
                    >
                        <span
                            onClick={(event) => {
                                event.stopPropagation();
                                handleToggleNode(node);
                            }}
                        >
                            {canExpand ? isExpanded ? <FiChevronDown /> : <FiChevronRight /> : <span style={{ display: 'inline-block', width: 16 }} />}
                        </span>
                        <span>{node.value}</span>
                        <span className={styles.nodeMeta}>{node.key}</span>
                    </button>
                ) : null}
                {isExpanded ? (
                    <>
                        {renderTagLinks(node.path, depth + 1)}
                        {valueChildren.length > 0 ? renderChildLayer(node.path, depth + 1) : null}
                    </>
                ) : null}
            </React.Fragment>
        );
    };

    const renderChildLayer = (parentPath: HierarchyPathItem[], depth: number): React.ReactNode => {
        const valueChildren = childrenForValuePath(sValueTree, parentPath);
        const rows = valueChildren.map((child) => {
            const path = parentPath.concat({ key: child.key, value: child.value });
            return { key: child.key, value: child.value, path, tagCount: 0 };
        });

        return <>{rows.map((child) => renderNode(child, depth))}</>;
    };

    const renderTagLinks = (parentPath: HierarchyPathItem[], depth: number): React.ReactNode => {
        const rows = sTagLinksByPath[pathKey(parentPath)] ?? [];
        const filteredRows = sSearchText ? rows.filter((row) => row.name.toLowerCase().includes(sSearchText.toLowerCase())) : rows;

        return filteredRows.map((row) => (
            <div
                key={`${pathKey(parentPath)}::tag::${row.name}`}
                className={[styles.node, styles.tagNode].join(' ')}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
                draggable={canEdit}
                onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', row.name);
                    event.dataTransfer.effectAllowed = 'move';
                }}
            >
                <button
                    type="button"
                    className={styles.tagLinkButton}
                    onClick={() => {
                        setTags([row]);
                    }}
                >
                    <FiTag />
                    <span>{row.name}</span>
                </button>
                <button type="button" className={styles.inlineAction} disabled={!canEdit} onClick={() => openMoveTagModal(row)}>
                    Move
                </button>
            </div>
        ));
    };

    const renderUnassignedTagLinks = (depth: number): React.ReactNode => {
        const rows = sTagLinksByPath[UNASSIGNED_TREE_KEY] ?? [];
        const filteredRows = sSearchText ? rows.filter((row) => row.name.toLowerCase().includes(sSearchText.toLowerCase())) : rows;

        return filteredRows.map((row) => (
            <div
                key={`${UNASSIGNED_TREE_KEY}::tag::${row.name}`}
                className={[styles.node, styles.tagNode].join(' ')}
                style={{ paddingLeft: `${6 + depth * 16}px` }}
                draggable={canEdit}
                onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', row.name);
                    event.dataTransfer.effectAllowed = 'move';
                }}
            >
                <button
                    type="button"
                    className={styles.tagLinkButton}
                    onClick={() => {
                        setTags([row]);
                    }}
                >
                    <FiTag />
                    <span>{row.name}</span>
                </button>
                <button type="button" className={styles.inlineAction} disabled={!canEdit} onClick={() => openMoveTagModal(row)}>
                    Move
                </button>
            </div>
        ));
    };

    const renderTemplateEditorNode = (node: HierarchyValueNode, nodePath: number[], depth: number): React.ReactNode => {
        const canRemoveNode = canRemoveHierarchyValueNode(node);

        return (
            <React.Fragment key={`template-edit-${nodePath.join('-')}`}>
                <div className={styles.templateEditorRow} style={{ marginLeft: depth * 16 }}>
                    <span className={styles.label}>{node.key}</span>
                    <input
                        className={styles.input}
                        style={{ flex: 1 }}
                        value={node.value}
                        onChange={(event) => updateTemplateDraftAtPath(nodePath, (current) => ({ ...current, value: event.target.value }))}
                    />
                    <Button size="sm" variant="secondary" disabled={depth + 1 >= sSchemaDraft.length} onClick={() => addTemplateDraftNode(nodePath)}>
                        Add Child
                    </Button>
                    <Button size="sm" variant="secondary" disabled={depth === 0} onClick={() => addTemplateDraftSibling(nodePath)}>
                        Add Sibling
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={!canRemoveNode}
                        title={canRemoveNode ? undefined : 'Remove child tree nodes before removing this node.'}
                        onClick={() => removeTemplateDraftNode(nodePath)}
                    >
                        Remove
                    </Button>
                </div>
                {node.children.map((child, index) => renderTemplateEditorNode(child, nodePath.concat(index), depth + 1))}
            </React.Fragment>
        );
    };

    if (jsonColumns.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>Hierarchy requires a JSON metadata column</div>
                    <div className={styles.emptyText}>
                        {hasAssetColumn
                            ? `${DEFAULT_HIERARCHY_JSON_COLUMN} already exists, but it is not a JSON metadata column. Use a JSON metadata column for hierarchy.`
                            : `Create ${DEFAULT_HIERARCHY_JSON_COLUMN} as a JSON metadata column to store tag hierarchy values.`}
                    </div>
                    {sError ? <div className={styles.error}>{sError}</div> : null}
                    <Button size="sm" variant="primary" disabled={!canEdit || hasAssetColumn} loading={sIsCreatingAssetColumn} onClick={handleCreateAssetColumn}>
                        Create {DEFAULT_HIERARCHY_JSON_COLUMN}
                    </Button>
                    {sLastQuery ? <pre className={styles.queryBox}>{sLastQuery}</pre> : null}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                    <span className={styles.label}>{tableName}</span>
                    <select className={styles.select} value={sJsonColumn} onChange={(event) => setJsonColumn(event.target.value)}>
                        {jsonColumns.map((column) => (
                            <option key={column.name} value={column.name}>
                                {column.name}
                            </option>
                        ))}
                    </select>
                    {!hasAssetColumn ? (
                        <Button size="sm" variant="secondary" disabled={!canEdit} loading={sIsCreatingAssetColumn} onClick={handleCreateAssetColumn}>
                            Create {DEFAULT_HIERARCHY_JSON_COLUMN}
                        </Button>
                    ) : null}
                </div>
                <div className={styles.actions}>
                    {!mHasTemplate ? (
                        <Button size="sm" variant="primary" disabled={!canEdit} loading={sIsSaving} onClick={handleInitializeHierarchy}>
                            {sHasHierarchyRow ? 'Reset Tree' : 'Initialize Tree'}
                        </Button>
                    ) : null}
                    {mHasTemplate ? (
                        <Button size="sm" variant="secondary" disabled={!canEdit || sIsTemplateEditing} onClick={startTemplateEdit}>
                            Edit Tree
                        </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" icon={<FiRefreshCcw />} loading={sIsLoading} onClick={refreshHierarchy}>
                        Refresh
                    </Button>
                </div>
            </div>
            {!mHasTemplate ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>{sHasHierarchyRow ? 'Tree data needs reset' : 'Tree is not set up yet'}</div>
                    <div className={styles.emptyText}>
                        {sHasHierarchyRow
                            ? `The hierarchy data in ${sJsonColumn} is not in the current tree format. Reset it to start from a clean tree.`
                            : `Start a hierarchy tree for ${sJsonColumn}. A default schema and first root node will be created automatically.`}
                    </div>
                    {sError ? <div className={styles.error}>{sError}</div> : null}
                    <Button size="sm" variant="primary" disabled={!canEdit} loading={sIsSaving} onClick={handleInitializeHierarchy}>
                        {sHasHierarchyRow ? 'Reset Tree' : 'Start Tree Setup'}
                    </Button>
                </div>
            ) : (
                <div className={styles.body}>
                    <div className={styles.treePane}>
                        <div className={styles.treeHeader}>
                            <input className={styles.input} style={{ width: '100%' }} value={sSearchText} placeholder="Search nodes" onChange={(event) => setSearchText(event.target.value)} />
                            <div className={styles.treeActions}>
                                <IconButton
                                    aria-label="Expand all tree nodes"
                                    title="Expand all"
                                    size="icon"
                                    variant="ghost"
                                    icon={<FiChevronsDown />}
                                    disabled={sIsLoading || !mHasTemplate}
                                    onClick={handleExpandAllTree}
                                />
                                <IconButton
                                    aria-label="Refresh tree"
                                    title="Refresh tree"
                                    size="icon"
                                    variant="ghost"
                                    icon={<FiRefreshCcw />}
                                    disabled={sIsLoading}
                                    onClick={refreshHierarchy}
                                />
                            </div>
                        </div>
                        <div className={styles.tree}>
                            {sValueTree.length === 0 ? <div className={styles.message}>Tree is empty. Click Edit Tree, then Add Root to create the first node.</div> : null}
                            {renderChildLayer([], 0)}
                            <button
                                type="button"
                                className={[styles.node, sSelectedNode.isUnassigned ? styles.selected : ''].filter(Boolean).join(' ')}
                                onClick={() => handleSelectNode({ isUnassigned: true, path: [] })}
                            >
                                <span
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleToggleUnassigned();
                                    }}
                                >
                                    {sExpandedPathKeys.has(UNASSIGNED_TREE_KEY) ? <FiChevronDown /> : <FiChevronRight />}
                                </span>
                                <MdWarningAmber />
                                <span>Unassigned Tags</span>
                                <span className={styles.nodeMeta}>{sUnassignedCount}</span>
                            </button>
                            {sExpandedPathKeys.has(UNASSIGNED_TREE_KEY) ? renderUnassignedTagLinks(1) : null}
                        </div>
                    </div>
                    <div className={styles.details}>
                        <div className={styles.summary}>
                            <div className={styles.path}>{selectedNodeLabel(sSelectedNode)}</div>
                        </div>
                        <div className={styles.tabs}>
                            {VISIBLE_DETAIL_TABS.map((tab) => (
                                <button key={tab} type="button" className={[styles.tab, sActiveTab === tab ? styles.activeTab : ''].filter(Boolean).join(' ')} onClick={() => setActiveTab(tab)}>
                                    {tab[0].toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className={styles.panel}>
                            {sError ? <div className={styles.error}>{sError}</div> : null}
                            {sActiveTab === 'tags' ? (
                                <CommonTable data={tagTableData(sTags)} showRowNumber showCopyButton activeRow emptyMessage="No tags." />
                            ) : null}
                            {sActiveTab === 'query' ? <pre className={styles.query}>{sLastQuery || 'No query executed.'}</pre> : null}
                            {sActiveTab === 'validation' ? (
                                <div>
                                    {sIsTemplateEditing ? (
                                        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                                            <div className={styles.label}>Edit schema and value tree. Save updates the reserved `__machbase_hierarchy__` row.</div>
                                            <div style={{ display: 'grid', gap: 6 }}>
                                                {sSchemaDraft.map((key, index) => {
                                                    const canRemoveSchemaKey = canRemoveHierarchySchemaKey(sSchemaDraft, sValueTreeDraft, index);
                                                    return (
                                                        <div key={`schema-${index}`} className={styles.templateEditorRow}>
                                                            <span className={styles.label}>Depth {index + 1}</span>
                                                            <input className={styles.input} style={{ flex: 1 }} value={key} onChange={(event) => updateSchemaDraft(index, event.target.value)} />
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                disabled={!canRemoveSchemaKey}
                                                                title={canRemoveSchemaKey ? undefined : schemaKeyRemoveReason(index)}
                                                                onClick={() => removeSchemaDraftKey(index)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className={styles.actions}>
                                                <Button size="sm" variant="secondary" onClick={addSchemaDraftKey}>
                                                    Add Schema Key
                                                </Button>
                                            </div>
                                            {sValueTreeDraft.map((node, index) => renderTemplateEditorNode(node, [index], 0))}
                                            <div className={styles.actions}>
                                                <Button size="sm" variant="secondary" disabled={sValueTreeDraft.length > 0} onClick={() => addTemplateDraftNode()}>
                                                    Add Root
                                                </Button>
                                                <Button size="sm" variant="primary" loading={sIsSaving} onClick={saveTemplateEdit}>
                                                    Save Tree
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={cancelTemplateEdit}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                    {sIssues.length === 0 ? <div className={styles.message}>No validation issues.</div> : null}
                                    {sIssues.map((issue, index) => (
                                        <div key={`${issue.level}-${index}`} className={issue.level === 'blocking' ? styles.error : styles.warning}>
                                            {issue.level}: {issue.message}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
            {sModal === 'attach' ? (
                <AttachTagsModal
                    tagNames={sModalValue}
                    values={sAttachValues}
                    keys={sAttachKeys}
                    pathOptions={sAttachPathOptions}
                    selectedPathIndex={sAttachPathIndex}
                    loading={sIsSaving}
                    onTagNamesChange={setModalValue}
                    onValueChange={(key, value) => setAttachValues((prev) => ({ ...prev, [key]: value }))}
                    onPathChange={handleAttachPathChange}
                    onClose={() => {
                        setModal(undefined);
                        setModalValue('');
                        setAttachValues({});
                        setAttachKeys([]);
                        setAttachPathOptions([]);
                        setAttachPathIndex(0);
                    }}
                    onConfirm={handleAttach}
                />
            ) : null}
        </div>
    );
};
