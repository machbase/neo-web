import { fetchQuery, fetchTqlQuery } from './database';

export const HIERARCHY_RESERVED_NAME = '__machbase_hierarchy__';
export const DEFAULT_HIERARCHY_JSON_COLUMN = 'ASSET';
export const DEFAULT_HIERARCHY_TEMPLATE = {
    world: {
        city: {
            factory: {
                equipment: {
                    sensor: {},
                },
            },
        },
    },
};

export const DEFAULT_HIERARCHY_DOCUMENT = {
    schema: ['country', 'city', 'factory', 'equipment', 'sensor'],
    tree: [{ key: 'country', value: 'New Country', children: [] }] as HierarchyValueNode[],
};

export interface HierarchyTemplate {
    [key: string]: HierarchyTemplate;
}

export type HierarchyDocument = {
    schema: string[];
    tree: HierarchyValueNode[];
};

export type HierarchyValueNode = {
    key: string;
    value: string;
    children: HierarchyValueNode[];
};

export type HierarchyPathItem = {
    key: string;
    value: string;
};

export type HierarchyTemplateNode = {
    key: string;
    children: HierarchyTemplateNode[];
};

export type HierarchyKeySpec = string[] | string[][];

export type HierarchyQueryConfig = {
    tableName: string;
    nameColumn: string;
    jsonColumn: string;
    specColumn?: string;
};

export type HierarchyValidationIssue = {
    level: 'blocking' | 'warning';
    message: string;
    // Numeric tree path of the offending value node, when the issue targets one
    // (lets the editor surface it inline on that row's input).
    path?: number[];
    // Index of the offending schema key, when the issue targets a schema level
    // (lets the editor surface it inline under that schema input).
    schemaIndex?: number;
};

export type HierarchyTagRow = {
    name: string;
    asset: string;
    spec?: string;
};

export type HierarchyChildRow = {
    key: string;
    value: string;
    path: HierarchyPathItem[];
    tagCount: number;
};

export type HierarchyParseResult = {
    document?: HierarchyDocument;
    legacyTemplate?: HierarchyTemplate;
    mode: 'document' | 'legacy' | 'empty' | 'invalid';
    reason?: string;
};

export const HIERARCHY_PAGE_SIZE = 50;
const PAGE_SIZE = HIERARCHY_PAGE_SIZE;

export const escapeSqlString = (value: string) => String(value ?? '').replace(/'/g, "''");

const quoteSql = (value: string) => `'${escapeSqlString(value)}'`;

const metadataTable = (tableName: string) => `${tableName} METADATA`;

const assertSafeIdentifier = (value: string) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
    return value;
};

const MAX_IDENTIFIER_LENGTH = 40;

const sanitizeIdentifierPart = (value: string) =>
    String(value ?? '')
        .replace(/[^A-Za-z0-9_]/g, '_')
        .toUpperCase();

const hashIdentifier = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1)
        hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
    return hash.toString(36).toUpperCase();
};

const jsonPath = (key: string) => `$.${key}`;

const jsonValueExpr = (jsonColumn: string, key: string) => `${jsonColumn}->'${jsonPath(key)}'`;

const jsonAlias = (key: string) => `H_${key.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}`;

const pathConditions = (jsonColumn: string, path: HierarchyPathItem[]) =>
    path.map((item) => `${jsonValueExpr(jsonColumn, item.key)} = ${quoteSql(item.value)}`);

const baseWhere = (nameColumn: string) => [`${nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`];

const buildWhereClause = (conditions: string[]) =>
    conditions.length > 0 ? ` where ${conditions.join(' and ')}` : '';

const writableJsonExpr = (jsonColumn: string) => `nvl(${jsonColumn}, '{}')`;

const nestedJsonSet = (jsonColumn: string, values: HierarchyPathItem[]) =>
    values.reduce(
        (expr, item) =>
            `json_set(${expr}, ${quoteSql(jsonPath(item.key))}, ${quoteSql(item.value)})`,
        writableJsonExpr(jsonColumn),
    );

export const buildGetHierarchyTemplateSql = ({
    tableName,
    nameColumn,
    jsonColumn,
}: HierarchyQueryConfig) =>
    `select ${jsonColumn} from ${metadataTable(tableName)} where ${nameColumn} = ${quoteSql(HIERARCHY_RESERVED_NAME)}`;

export const buildCreateHierarchyTemplateSql = (
    { tableName, nameColumn, jsonColumn }: HierarchyQueryConfig,
    template: HierarchyTemplate | HierarchyDocument = DEFAULT_HIERARCHY_TEMPLATE,
) =>
    `insert into ${metadataTable(tableName)} (${nameColumn}, ${jsonColumn}) values (${quoteSql(HIERARCHY_RESERVED_NAME)}, ${quoteSql(JSON.stringify(template))})`;

export const buildUpdateHierarchyTemplateSql = (
    { tableName, nameColumn, jsonColumn }: HierarchyQueryConfig,
    template: HierarchyTemplate | HierarchyDocument,
) =>
    `update ${metadataTable(tableName)} set ${jsonColumn} = ${quoteSql(JSON.stringify(template))} where ${nameColumn} = ${quoteSql(HIERARCHY_RESERVED_NAME)}`;

export const buildCreateJsonMetadataColumnSql = (
    tableName: string,
    columnName = DEFAULT_HIERARCHY_JSON_COLUMN,
) => `ALTER TABLE ${tableName} METADATA ADD COLUMN (${assertSafeIdentifier(columnName)} JSON)`;

// machbase JSON-path metadata index (verified: issue #1351 server-validated + machbase docs):
//   CREATE INDEX <idx> ON <table> METADATA (<jsonColumn>->'$.<key>')   /   DROP INDEX <idx>
// The index name is derived deterministically from table + json column + key so the same
// schema key always maps to the same index (and differs across keys/tables/columns).
export const buildHierarchyIndexName = (
    { tableName, jsonColumn }: HierarchyQueryConfig,
    key: string,
) => {
    assertSafeIdentifier(key); // schema keys are validated upstream; reject anything unsafe for the indexed JSON path
    const raw = `HIDX_${sanitizeIdentifierPart(tableName)}_${sanitizeIdentifierPart(jsonColumn)}_${sanitizeIdentifierPart(key)}`;
    const name =
        raw.length <= MAX_IDENTIFIER_LENGTH
            ? raw
            : `HIDX_${hashIdentifier(raw)}_${sanitizeIdentifierPart(key)}`.slice(
                  0,
                  MAX_IDENTIFIER_LENGTH,
              );
    return assertSafeIdentifier(name);
};

export const buildCreateJsonPathIndexSql = (config: HierarchyQueryConfig, key: string) =>
    `CREATE INDEX ${buildHierarchyIndexName(config, key)} ON ${config.tableName} METADATA (${jsonValueExpr(config.jsonColumn, key)})`;

export const buildDropJsonPathIndexSql = (config: HierarchyQueryConfig, key: string) =>
    `DROP INDEX ${buildHierarchyIndexName(config, key)}`;

export const buildGetHierarchyChildrenSql = (
    config: HierarchyQueryConfig,
    keys: string[],
    parentPath: HierarchyPathItem[],
) => {
    const childKey = keys[parentPath.length];
    const aliasSelects = parentPath
        .map((item) => `${jsonValueExpr(config.jsonColumn, item.key)} as ${jsonAlias(item.key)}`)
        .concat(`${jsonValueExpr(config.jsonColumn, childKey)} as VALUE`);
    const innerSql = `select ${aliasSelects.join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
    const conditions = parentPath
        .map((item) => `${jsonAlias(item.key)} = ${quoteSql(item.value)}`)
        .concat(['VALUE is not null', 'length(VALUE) > 0']);

    return `select VALUE, count(*) as COUNT from (${innerSql})${buildWhereClause(conditions)} group by VALUE order by VALUE`;
};

export const buildGetHierarchyTagsSql = (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn]
        .filter(Boolean)
        .join(', ');
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));

    return `select ${columns} from ${metadataTable(config.tableName)}${buildWhereClause(conditions)} order by ${config.nameColumn}`;
};

export const buildGetDirectHierarchyTagsSql = (
    config: HierarchyQueryConfig,
    schema: string[],
    path: HierarchyPathItem[],
) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn]
        .filter(Boolean)
        .join(', ');
    const nextKey = schema[path.length];
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));
    if (nextKey)
        conditions.push(
            `(${jsonValueExpr(config.jsonColumn, nextKey)} is null or length(${jsonValueExpr(config.jsonColumn, nextKey)}) = 0)`,
        );

    return `select ${columns} from ${metadataTable(config.tableName)}${buildWhereClause(conditions)} order by ${config.nameColumn}`;
};

export const buildGetHierarchyTagCountSql = (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
) => {
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));

    return `select count(*) as COUNT from ${metadataTable(config.tableName)}${buildWhereClause(conditions)}`;
};

export const buildUnassignedCondition = (jsonColumn: string, keys: string[]) =>
    `(${keys.map((key) => `${jsonValueExpr(jsonColumn, key)} is null or length(${jsonValueExpr(jsonColumn, key)}) = 0`).join(' or ')})`;

const normalizeKeyPaths = (keySpec: HierarchyKeySpec): string[][] => {
    if (keySpec.length === 0) return [];
    return Array.isArray(keySpec[0])
        ? (keySpec as string[][]).filter((path) => path.length > 0)
        : [keySpec as string[]];
};

const uniqueKeysFromSpec = (keySpec: HierarchyKeySpec) => {
    const keys: string[] = [];
    const seen = new Set<string>();
    normalizeKeyPaths(keySpec)
        .flat()
        .forEach((key) => {
            if (seen.has(key)) return;
            seen.add(key);
            keys.push(key);
        });
    return keys;
};

const buildUnassignedAliasCondition = (keySpec: HierarchyKeySpec) => {
    const paths = normalizeKeyPaths(keySpec);
    const assignedPathConditions = paths.map(
        (path) =>
            `(${path.map((key) => `${jsonAlias(key)} is not null and length(${jsonAlias(key)}) > 0`).join(' and ')})`,
    );

    return assignedPathConditions.length === 0
        ? '(1 = 0)'
        : `not (${assignedPathConditions.join(' or ')})`;
};

const buildUnassignedSourceSql = (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean);
    const keys = uniqueKeysFromSpec(keySpec);
    const aliasSelects = keys.map(
        (key) => `${jsonValueExpr(config.jsonColumn, key)} as ${jsonAlias(key)}`,
    );

    return `select ${columns.concat(aliasSelects).join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
};

export const buildGetUnassignedTagsSql = (
    config: HierarchyQueryConfig,
    keySpec: HierarchyKeySpec,
) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn]
        .filter(Boolean)
        .join(', ');
    const innerSql = buildUnassignedSourceSql(config, keySpec);

    return `select ${columns} from (${innerSql})${buildWhereClause([buildUnassignedAliasCondition(keySpec)])} order by ${config.nameColumn}`;
};

export const buildGetUnassignedTagCountSql = (
    config: HierarchyQueryConfig,
    keySpec: HierarchyKeySpec,
) => {
    const innerSql = buildUnassignedSourceSql(config, keySpec);

    return `select count(*) as COUNT from (${innerSql})${buildWhereClause([buildUnassignedAliasCondition(keySpec)])}`;
};

export const buildAttachTagsSql = (
    config: HierarchyQueryConfig,
    tagNames: string[],
    targetPath: HierarchyPathItem[],
) => {
    const tagList = tagNames.map(quoteSql).join(', ');

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = ${nestedJsonSet(config.jsonColumn, targetPath)} where ${
        config.nameColumn
    } in (${tagList}) and ${config.nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`;
};

export const buildMoveTagsToHierarchyPathSql = (
    config: HierarchyQueryConfig,
    tagNames: string[],
    schema: string[],
    targetPath: HierarchyPathItem[],
) => {
    const targetValues = new Map(targetPath.map((item) => [item.key, item.value]));
    const completePath = schema.map((key) => ({ key, value: targetValues.get(key) ?? '' }));

    return buildAttachTagsSql(config, tagNames, completePath);
};

export const buildDetachTagsSql = (
    config: HierarchyQueryConfig,
    tagNames: string[],
    keys: string[],
) => {
    const tagList = tagNames.map(quoteSql).join(', ');
    const emptyPath = keys.map((key) => ({ key, value: '' }));

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = ${nestedJsonSet(config.jsonColumn, emptyPath)} where ${
        config.nameColumn
    } in (${tagList}) and ${config.nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`;
};

export const buildRenameHierarchyValueSql = (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
    key: string,
    oldValue: string,
    newValue: string,
) => {
    const parentPath = path.filter((item) => item.key !== key);
    const conditions = baseWhere(config.nameColumn)
        .concat(pathConditions(config.jsonColumn, parentPath))
        .concat([`${jsonValueExpr(config.jsonColumn, key)} = ${quoteSql(oldValue)}`]);

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = json_set(${config.jsonColumn}, ${quoteSql(jsonPath(key))}, ${quoteSql(
        newValue,
    )})${buildWhereClause(conditions)}`;
};

export const flattenHierarchyTemplate = (template: unknown): string[] => {
    if (!template || typeof template !== 'object' || Array.isArray(template)) return [];

    const keys: string[] = [];
    let cursor = template as HierarchyTemplate;

    while (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
        const [key] = Object.keys(cursor);
        if (!key) break;
        keys.push(key);
        cursor = cursor[key];
    }

    return keys;
};

export const buildHierarchyTemplateFromKeys = (keys: string[]): HierarchyTemplate =>
    keys
        .filter((key) => key.trim())
        .reverse()
        .reduce<HierarchyTemplate>((child, key) => ({ [key.trim()]: child }), {});

export const parseHierarchyTemplateTree = (template: unknown): HierarchyTemplateNode[] => {
    if (!template || typeof template !== 'object' || Array.isArray(template)) return [];

    return Object.entries(template as HierarchyTemplate).map(([key, child]) => ({
        key,
        children: parseHierarchyTemplateTree(child),
    }));
};

export const getHierarchyTemplatePaths = (template: unknown): string[][] => {
    const walk = (nodes: HierarchyTemplateNode[], parent: string[] = []): string[][] =>
        nodes.flatMap((node) => {
            const path = parent.concat(node.key);
            if (node.children.length === 0) return [path];
            return walk(node.children, path);
        });

    return walk(parseHierarchyTemplateTree(template));
};

export const buildHierarchyTemplateFromTree = (nodes: HierarchyTemplateNode[]): HierarchyTemplate =>
    nodes.reduce<HierarchyTemplate>((template, node) => {
        if (!node.key.trim()) return template;
        template[node.key.trim()] = buildHierarchyTemplateFromTree(node.children);
        return template;
    }, {});

export const getUniqueHierarchyKeys = (nodes: HierarchyTemplateNode[]): string[] => {
    const keys: string[] = [];
    const seen = new Set<string>();
    const visit = (nodeList: HierarchyTemplateNode[]) => {
        nodeList.forEach((node) => {
            if (!seen.has(node.key)) {
                seen.add(node.key);
                keys.push(node.key);
            }
            visit(node.children);
        });
    };

    visit(nodes);
    return keys;
};

export const parseHierarchyDocument = (template: unknown): HierarchyParseResult => {
    if (!template) return { mode: 'empty' };
    if (typeof template !== 'object' || Array.isArray(template))
        return { mode: 'invalid', reason: 'Hierarchy document must be an object.' };

    const candidate = template as Partial<HierarchyDocument>;
    if (Array.isArray(candidate.schema) || Array.isArray(candidate.tree)) {
        if (!Array.isArray(candidate.schema) || !Array.isArray(candidate.tree)) {
            return {
                mode: 'invalid',
                reason: 'Hierarchy document requires both schema and tree arrays.',
            };
        }

        const normalizeNodes = (nodes: unknown[]): HierarchyValueNode[] =>
            nodes
                .filter((node) => node && typeof node === 'object' && !Array.isArray(node))
                .map((node) => {
                    const valueNode = node as Partial<HierarchyValueNode>;
                    return {
                        key: String(valueNode.key ?? ''),
                        value: String(valueNode.value ?? ''),
                        children: Array.isArray(valueNode.children)
                            ? normalizeNodes(valueNode.children)
                            : [],
                    };
                });

        return {
            mode: 'document',
            document: {
                schema: candidate.schema.map((key) => String(key ?? '')),
                tree: normalizeNodes(candidate.tree),
            },
        };
    }

    return { mode: 'legacy', legacyTemplate: template as HierarchyTemplate };
};

export const getHierarchyDocumentPaths = (document: HierarchyDocument): HierarchyPathItem[][] => {
    const walk = (
        nodes: HierarchyValueNode[],
        parent: HierarchyPathItem[] = [],
    ): HierarchyPathItem[][] =>
        nodes.flatMap((node) => {
            const path = parent.concat({ key: node.key, value: node.value });
            if (node.children.length === 0) return [path];
            return walk(node.children, path);
        });

    return walk(document.tree);
};

export const hierarchyTreeHasDepth = (
    nodes: HierarchyValueNode[],
    targetDepth: number,
    currentDepth = 0,
): boolean => {
    if (targetDepth < 0) return false;
    return nodes.some(
        (node) =>
            currentDepth === targetDepth ||
            hierarchyTreeHasDepth(node.children, targetDepth, currentDepth + 1),
    );
};

export const canRemoveHierarchyValueNode = (node: HierarchyValueNode) => node.children.length === 0;

export const canRemoveHierarchySchemaKey = (
    schema: string[],
    tree: HierarchyValueNode[],
    index: number,
) => index === schema.length - 1 && !hierarchyTreeHasDepth(tree, index);

// --- Value-tree structural edits (keyboard outliner) -------------------------
// Numeric paths index into the nested `children` arrays (e.g. [0, 2, 1]). Each
// op returns a fresh forest plus the path of the row that should receive focus.

export type HierarchyTreeEdit = {
    tree: HierarchyValueNode[];
    focusPath: number[] | null;
};

const valueNodeAtPath = (
    nodes: HierarchyValueNode[],
    path: number[],
): HierarchyValueNode | undefined => {
    let current: HierarchyValueNode | undefined;
    let list = nodes;
    for (const index of path) {
        current = list[index];
        if (!current) return undefined;
        list = current.children;
    }
    return current;
};

// Re-maps the children array at `parentPath` (empty path = the forest root).
const mapHierarchyChildrenAtPath = (
    nodes: HierarchyValueNode[],
    parentPath: number[],
    transform: (children: HierarchyValueNode[]) => HierarchyValueNode[],
): HierarchyValueNode[] => {
    if (parentPath.length === 0) return transform(nodes);
    const [head, ...rest] = parentPath;
    return nodes.map((node, index) =>
        index === head
            ? { ...node, children: mapHierarchyChildrenAtPath(node.children, rest, transform) }
            : node,
    );
};

// Depth of the deepest descendant relative to `node` (0 for a leaf).
export const hierarchyValueSubtreeHeight = (node: HierarchyValueNode): number =>
    node.children.length === 0
        ? 0
        : 1 + Math.max(...node.children.map(hierarchyValueSubtreeHeight));

export const canIndentHierarchyValueNode = (
    nodes: HierarchyValueNode[],
    path: number[],
    schemaLength: number,
): boolean => {
    if (path.length === 0) return false;
    const index = path[path.length - 1];
    if (index <= 0) return false; // needs a previous sibling to nest under
    const node = valueNodeAtPath(nodes, path);
    if (!node) return false;
    // 1-based depth after indent + its deepest descendant must still fit the schema.
    return path.length + 1 + hierarchyValueSubtreeHeight(node) <= schemaLength;
};

// The hierarchy holds a single depth-1 root, so a depth-2 node can't outdent
// (that would promote it to a second root) — only depth-3+ may outdent.
export const canOutdentHierarchyValueNode = (path: number[]): boolean => path.length > 2;

// Enter: insert an empty sibling right after `path` at the same depth.
export const insertHierarchyValueSibling = (
    nodes: HierarchyValueNode[],
    path: number[],
    schema: string[],
): HierarchyTreeEdit => {
    // Root level holds a single depth-1 node, so never add a sibling there.
    if (path.length <= 1) return { tree: nodes, focusPath: null };
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const newNode: HierarchyValueNode = {
        key: schema[path.length - 1] ?? '',
        value: '',
        children: [],
    };
    const tree = mapHierarchyChildrenAtPath(nodes, parentPath, (children) => {
        const next = children.slice();
        next.splice(index + 1, 0, newNode);
        return next;
    });
    return { tree, focusPath: [...parentPath, index + 1] };
};

// Enter on a node that can't take a sibling (the single root) falls back to a
// first child one level deeper — as long as the schema has room for that depth.
export const insertHierarchyValueChild = (
    nodes: HierarchyValueNode[],
    path: number[],
    schema: string[],
): HierarchyTreeEdit | null => {
    if (path.length === 0) return null;
    if (path.length + 1 > schema.length) return null; // child depth exceeds schema
    const newNode: HierarchyValueNode = {
        key: schema[path.length] ?? '',
        value: '',
        children: [],
    };
    const tree = mapHierarchyChildrenAtPath(nodes, path, (children) => [newNode, ...children]);
    return { tree, focusPath: [...path, 0] };
};

// Tab: nest `path` as the last child of its previous sibling.
export const indentHierarchyValueNode = (
    nodes: HierarchyValueNode[],
    path: number[],
    schema: string[],
): HierarchyTreeEdit | null => {
    if (!canIndentHierarchyValueNode(nodes, path, schema.length)) return null;
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const prevSibling = valueNodeAtPath(nodes, [...parentPath, index - 1]);
    if (!prevSibling) return null;
    const childIndex = prevSibling.children.length;
    const tree = mapHierarchyChildrenAtPath(nodes, parentPath, (children) => {
        const next = children.slice();
        const [moved] = next.splice(index, 1);
        const prev = next[index - 1];
        next[index - 1] = { ...prev, children: prev.children.concat(moved) };
        return next;
    });
    return { tree, focusPath: [...parentPath, index - 1, childIndex] };
};

// Shift+Tab: lift `path` to sit right after its parent in the grandparent.
export const outdentHierarchyValueNode = (
    nodes: HierarchyValueNode[],
    path: number[],
): HierarchyTreeEdit | null => {
    if (!canOutdentHierarchyValueNode(path)) return null;
    const node = valueNodeAtPath(nodes, path);
    if (!node) return null;
    const index = path[path.length - 1]; // within parent
    const parentIndex = path[path.length - 2]; // parent within grandparent
    const grandParentPath = path.slice(0, -2);
    const tree = mapHierarchyChildrenAtPath(nodes, grandParentPath, (children) => {
        const next = children.slice();
        const parent = next[parentIndex];
        next[parentIndex] = {
            ...parent,
            children: parent.children.filter((_, i) => i !== index),
        };
        next.splice(parentIndex + 1, 0, node);
        return next;
    });
    return { tree, focusPath: [...grandParentPath, parentIndex + 1] };
};

// Pre-order "row above" target: previous sibling's deepest tail, else the parent.
const previousHierarchyRowPath = (nodes: HierarchyValueNode[], path: number[]): number[] | null => {
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    if (index > 0) {
        let cursor = [...parentPath, index - 1];
        let node = valueNodeAtPath(nodes, cursor);
        while (node && node.children.length > 0) {
            cursor = [...cursor, node.children.length - 1];
            node = valueNodeAtPath(nodes, cursor);
        }
        return cursor;
    }
    return parentPath.length > 0 ? parentPath : null;
};

// Backspace / trash: remove `path`; focus the row that was visually above it.
export const removeHierarchyValueNodeAt = (
    nodes: HierarchyValueNode[],
    path: number[],
): HierarchyTreeEdit => {
    if (path.length === 0) return { tree: nodes, focusPath: null };
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    // Computed against the pre-removal tree; the row above is unaffected by the delete.
    const focusPath = previousHierarchyRowPath(nodes, path);
    const tree = mapHierarchyChildrenAtPath(nodes, parentPath, (children) =>
        children.filter((_, i) => i !== index),
    );
    return { tree, focusPath };
};

// Alt+Up / Alt+Down: reorder the node among its siblings (its subtree moves with
// it). No-op at a sibling boundary so a row never jumps to another parent.
export const moveHierarchyValueNode = (
    nodes: HierarchyValueNode[],
    path: number[],
    direction: 1 | -1,
): HierarchyTreeEdit | null => {
    if (path.length === 0) return null;
    const index = path[path.length - 1];
    const parentPath = path.slice(0, -1);
    const target = index + direction;
    let moved = false;
    const tree = mapHierarchyChildrenAtPath(nodes, parentPath, (children) => {
        if (target < 0 || target >= children.length) return children;
        const next = children.slice();
        [next[index], next[target]] = [next[target], next[index]];
        moved = true;
        return next;
    });
    if (!moved) return null;
    return { tree, focusPath: [...parentPath, target] };
};

const valuePathsFromTree = (
    nodes: HierarchyValueNode[],
    parent: HierarchyPathItem[] = [],
): HierarchyPathItem[][] =>
    nodes.flatMap((node) => {
        const path = parent.concat({ key: node.key, value: node.value });
        return [path].concat(valuePathsFromTree(node.children, path));
    });

export const validateHierarchyDocument = (
    document: HierarchyDocument,
): HierarchyValidationIssue[] => {
    const issues: HierarchyValidationIssue[] = [];
    const seenSchema = new Set<string>();

    if (!document || !Array.isArray(document.schema) || !Array.isArray(document.tree)) {
        return [
            { level: 'blocking', message: 'Hierarchy document requires schema and tree arrays.' },
        ];
    }

    if (document.schema.length === 0)
        issues.push({
            level: 'blocking',
            message: 'Hierarchy schema must contain at least one key.',
        });

    document.schema.forEach((key, index) => {
        if (!key.trim())
            issues.push({
                level: 'blocking',
                message: 'Hierarchy schema contains an empty key.',
                schemaIndex: index,
            });
        if (key === HIERARCHY_RESERVED_NAME)
            issues.push({
                level: 'blocking',
                message: 'Hierarchy key cannot use the reserved row name.',
                schemaIndex: index,
            });
        if (seenSchema.has(key))
            issues.push({
                level: 'blocking',
                message: `Hierarchy key "${key}" is duplicated.`,
                schemaIndex: index,
            });
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
            issues.push({
                level: 'blocking',
                message: `Hierarchy key "${key}" is not safe for JSON path queries.`,
                schemaIndex: index,
            });
        seenSchema.add(key);
    });

    const visit = (
        nodes: HierarchyValueNode[],
        depth: number,
        parentPath: number[] = [],
        siblingKeys = new Set<string>(),
    ) => {
        nodes.forEach((node, index) => {
            const path = [...parentPath, index];
            const expectedKey = document.schema[depth];
            const nodeIdentity = `${node.key}\u0000${node.value}`;
            if (!node.value.trim())
                issues.push({
                    level: 'blocking',
                    message: `Hierarchy node at depth ${depth + 1} contains an empty value.`,
                    path,
                });
            if (node.key !== expectedKey)
                issues.push({
                    level: 'blocking',
                    message: `Hierarchy node "${node.value}" uses key "${node.key}", expected "${expectedKey}".`,
                    path,
                });
            if (siblingKeys.has(nodeIdentity))
                issues.push({
                    level: 'blocking',
                    message: `Sibling node "${node.value}" is duplicated under key "${node.key}".`,
                    path,
                });
            if (depth >= document.schema.length)
                issues.push({
                    level: 'blocking',
                    message: `Hierarchy node "${node.value}" exceeds schema depth.`,
                    path,
                });
            siblingKeys.add(nodeIdentity);
            visit(node.children, depth + 1, path, new Set<string>());
        });
    };
    visit(document.tree, 0);

    return issues;
};

const buildDocumentUnassignedAliasCondition = (document: HierarchyDocument) => {
    const paths = valuePathsFromTree(document.tree);
    const assignedNodeConditions = paths.map((path) => {
        const nextKey = document.schema[path.length];
        const pathMatches = path.map((item) => {
            const alias = jsonAlias(item.key);
            return `${alias} is not null and length(${alias}) > 0 and ${alias} = ${quoteSql(item.value)}`;
        });
        const nextIsEmpty = nextKey
            ? [`(${jsonAlias(nextKey)} is null or length(${jsonAlias(nextKey)}) = 0)`]
            : [];

        return `(${pathMatches.concat(nextIsEmpty).join(' and ')})`;
    });

    return assignedNodeConditions.length === 0
        ? '(1 = 1)'
        : `not (${assignedNodeConditions.join(' or ')})`;
};

const buildDocumentUnassignedSourceSql = (
    config: HierarchyQueryConfig,
    document: HierarchyDocument,
) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean);
    const aliasSelects = document.schema.map(
        (key) => `${jsonValueExpr(config.jsonColumn, key)} as ${jsonAlias(key)}`,
    );

    return `select ${columns.concat(aliasSelects).join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
};

export const buildGetUnassignedTagsByDocumentSql = (
    config: HierarchyQueryConfig,
    document: HierarchyDocument,
) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn]
        .filter(Boolean)
        .join(', ');
    const innerSql = buildDocumentUnassignedSourceSql(config, document);

    return `select ${columns} from (${innerSql})${buildWhereClause([buildDocumentUnassignedAliasCondition(document)])} order by ${config.nameColumn}`;
};

export const buildGetUnassignedTagCountByDocumentSql = (
    config: HierarchyQueryConfig,
    document: HierarchyDocument,
) => {
    const innerSql = buildDocumentUnassignedSourceSql(config, document);

    return `select count(*) as COUNT from (${innerSql})${buildWhereClause([buildDocumentUnassignedAliasCondition(document)])}`;
};

export const validateHierarchyTemplate = (template: unknown): HierarchyValidationIssue[] => {
    const issues: HierarchyValidationIssue[] = [];
    const tree = parseHierarchyTemplateTree(template);
    const keys: string[] = [];
    const seen = new Set<string>();

    const collectKeys = (nodes: HierarchyTemplateNode[]) => {
        nodes.forEach((node) => {
            keys.push(node.key);
            collectKeys(node.children);
        });
    };
    collectKeys(tree);

    if (keys.length === 0) {
        issues.push({
            level: 'blocking',
            message: 'Hierarchy template must contain at least one key.',
        });
    }

    keys.forEach((key) => {
        if (!key.trim())
            issues.push({
                level: 'blocking',
                message: 'Hierarchy template contains an empty key.',
            });
        if (key === HIERARCHY_RESERVED_NAME)
            issues.push({
                level: 'blocking',
                message: 'Hierarchy key cannot use the reserved row name.',
            });
        if (seen.has(key))
            issues.push({ level: 'blocking', message: `Hierarchy key "${key}" is duplicated.` });
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
            issues.push({
                level: 'blocking',
                message: `Hierarchy key "${key}" is not safe for JSON path queries.`,
            });
        seen.add(key);
    });

    return issues;
};

const firstCell = (data: any) => data?.rows?.[0]?.[0];

const normalizeRows = (data: any, config: HierarchyQueryConfig): HierarchyTagRow[] => {
    const nameIdx = data?.columns?.indexOf(config.nameColumn) ?? -1;
    const jsonIdx = data?.columns?.indexOf(config.jsonColumn) ?? -1;
    const specIdx = config.specColumn ? (data?.columns?.indexOf(config.specColumn) ?? -1) : -1;

    return (data?.rows ?? []).map((row: any[]) => ({
        name: String(row[nameIdx] ?? ''),
        asset: String(row[jsonIdx] ?? ''),
        spec: specIdx >= 0 ? String(row[specIdx] ?? '') : undefined,
    }));
};

export const getHierarchyTemplate = async (config: HierarchyQueryConfig) => {
    const { svrState, svrData, svrReason } = await fetchQuery(buildGetHierarchyTemplateSql(config));
    if (!svrState)
        return { success: false, reason: svrReason, template: undefined, keys: [], hasRow: false };

    const hasRow = (svrData?.rows ?? []).length > 0;
    const rawTemplate = firstCell(svrData);
    if (!rawTemplate) return { success: true, template: undefined, keys: [], hasRow };

    try {
        const template = typeof rawTemplate === 'string' ? JSON.parse(rawTemplate) : rawTemplate;
        const parsed = parseHierarchyDocument(template);
        if (parsed.mode === 'document' && parsed.document) {
            return {
                success: true,
                template,
                document: parsed.document,
                tree: parsed.document.tree,
                paths: [parsed.document.schema],
                keys: parsed.document.schema,
                issues: validateHierarchyDocument(parsed.document),
                mode: parsed.mode,
                hasRow,
            };
        }
        if (parsed.mode === 'legacy') {
            return {
                success: true,
                template,
                legacyTemplate: parsed.legacyTemplate,
                tree: [],
                paths: [],
                keys: [],
                issues: [
                    {
                        level: 'blocking',
                        message:
                            'Legacy hierarchy template detected. Recreate the tree using the schema/tree format.',
                    },
                ],
                mode: parsed.mode,
                hasRow,
            };
        }
        if (parsed.mode === 'invalid') {
            return {
                success: false,
                reason: parsed.reason ?? 'Hierarchy document is invalid.',
                template: undefined,
                keys: [],
                hasRow,
            };
        }

        const tree = parseHierarchyTemplateTree(template);
        return {
            success: true,
            template,
            tree,
            paths: getHierarchyTemplatePaths(template),
            keys: getUniqueHierarchyKeys(tree),
            issues: validateHierarchyTemplate(template),
            hasRow,
        };
    } catch {
        return {
            success: false,
            reason: 'Hierarchy template JSON parse failed.',
            template: undefined,
            keys: [],
            hasRow,
        };
    }
};

export const createHierarchyTemplate = async (
    config: HierarchyQueryConfig,
    template: HierarchyTemplate | HierarchyDocument = DEFAULT_HIERARCHY_TEMPLATE,
) => fetchQuery(buildCreateHierarchyTemplateSql(config, template));

export const updateHierarchyTemplate = async (
    config: HierarchyQueryConfig,
    template: HierarchyTemplate | HierarchyDocument,
) => fetchQuery(buildUpdateHierarchyTemplateSql(config, template));

export const createJsonMetadataColumn = async (
    tableName: string,
    columnName = DEFAULT_HIERARCHY_JSON_COLUMN,
) => fetchQuery(buildCreateJsonMetadataColumnSql(tableName, columnName));

const indexAlreadyExists = (reason?: string) => /already exist|duplicate/i.test(reason ?? '');
const indexDoesNotExist = (reason?: string) =>
    /not exist|does not exist|not found|no such/i.test(reason ?? '');

export type HierarchyIndexResult = {
    success: boolean;
    sql: string;
    skipped: boolean;
    reason?: string;
};

// Create the JSON-path metadata index for a schema key. Tolerates "already exists" (non-fatal)
// so a re-run / concurrent create never aborts the surrounding hierarchy document save.
export const createJsonPathIndex = async (
    config: HierarchyQueryConfig,
    key: string,
): Promise<HierarchyIndexResult> => {
    const sql = buildCreateJsonPathIndexSql(config, key);
    const { svrState, svrReason } = await fetchQuery(sql);
    if (svrState) return { success: true, sql, skipped: false };
    if (indexAlreadyExists(svrReason)) return { success: true, sql, skipped: true };
    return { success: false, sql, skipped: false, reason: svrReason };
};

// Drop the JSON-path metadata index for a schema key. Tolerates "does not exist" (non-fatal).
export const dropJsonPathIndex = async (
    config: HierarchyQueryConfig,
    key: string,
): Promise<HierarchyIndexResult> => {
    const sql = buildDropJsonPathIndexSql(config, key);
    const { svrState, svrReason } = await fetchQuery(sql);
    if (svrState) return { success: true, sql, skipped: false };
    if (indexDoesNotExist(svrReason)) return { success: true, sql, skipped: true };
    return { success: false, sql, skipped: false, reason: svrReason };
};

export const getHierarchyChildren = async (
    config: HierarchyQueryConfig,
    keys: string[],
    parentPath: HierarchyPathItem[],
) => {
    const { svrState, svrData, svrReason } = await fetchQuery(
        buildGetHierarchyChildrenSql(config, keys, parentPath),
    );
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyChildRow[] };

    return {
        success: true,
        rows: (svrData?.rows ?? []).map((row: any[]) => ({
            key: keys[parentPath.length],
            value: String(row[0] ?? ''),
            path: parentPath.concat([
                { key: keys[parentPath.length], value: String(row[0] ?? '') },
            ]),
            tagCount: Number(row[1] ?? 0),
        })),
    };
};

export const getHierarchyTags = async (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
    page = 0,
) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(
        buildGetHierarchyTagsSql(config, path),
        page,
        PAGE_SIZE,
    );
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getDirectHierarchyTags = async (
    config: HierarchyQueryConfig,
    schema: string[],
    path: HierarchyPathItem[],
    page = 0,
) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(
        buildGetDirectHierarchyTagsSql(config, schema, path),
        page,
        PAGE_SIZE,
    );
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getHierarchyTagCount = async (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
) => {
    const { svrState, svrData } = await fetchQuery(buildGetHierarchyTagCountSql(config, path));
    return svrState ? Number(firstCell(svrData) ?? 0) : 0;
};

export const getUnassignedTagsByDocument = async (
    config: HierarchyQueryConfig,
    document: HierarchyDocument,
    page = 0,
) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(
        buildGetUnassignedTagsByDocumentSql(config, document),
        page,
        PAGE_SIZE,
    );
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getUnassignedTagCountByDocument = async (
    config: HierarchyQueryConfig,
    document: HierarchyDocument,
) => {
    const { svrState, svrData } = await fetchQuery(
        buildGetUnassignedTagCountByDocumentSql(config, document),
    );
    return svrState ? Number(firstCell(svrData) ?? 0) : 0;
};

export const attachTagsToPath = async (
    config: HierarchyQueryConfig,
    tagNames: string[],
    targetPath: HierarchyPathItem[],
) => fetchQuery(buildAttachTagsSql(config, tagNames, targetPath));

export const moveTagsToHierarchyPath = async (
    config: HierarchyQueryConfig,
    tagNames: string[],
    schema: string[],
    targetPath: HierarchyPathItem[],
) => fetchQuery(buildMoveTagsToHierarchyPathSql(config, tagNames, schema, targetPath));

export const detachTagsFromHierarchy = async (
    config: HierarchyQueryConfig,
    tagNames: string[],
    keys: string[],
) => fetchQuery(buildDetachTagsSql(config, tagNames, keys));

export const renameHierarchyValue = async (
    config: HierarchyQueryConfig,
    path: HierarchyPathItem[],
    key: string,
    oldValue: string,
    newValue: string,
) => fetchQuery(buildRenameHierarchyValueSql(config, path, key, oldValue, newValue));
