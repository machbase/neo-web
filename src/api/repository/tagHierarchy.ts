import { fetchQuery, fetchTqlQuery } from './database';

export const HIERARCHY_RESERVED_NAME = '__machbase_hierarchy__';
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

const PAGE_SIZE = 50;

export const escapeSqlString = (value: string) => String(value ?? '').replace(/'/g, "''");

const quoteSql = (value: string) => `'${escapeSqlString(value)}'`;

const metadataTable = (tableName: string) => `${tableName} METADATA`;

const jsonPath = (key: string) => `$.${key}`;

const jsonValueExpr = (jsonColumn: string, key: string) => `${jsonColumn}->'${jsonPath(key)}'`;

const jsonAlias = (key: string) => `H_${key.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()}`;

const pathConditions = (jsonColumn: string, path: HierarchyPathItem[]) =>
    path.map((item) => `${jsonValueExpr(jsonColumn, item.key)} = ${quoteSql(item.value)}`);

const baseWhere = (nameColumn: string) => [`${nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`];

const buildWhereClause = (conditions: string[]) => (conditions.length > 0 ? ` where ${conditions.join(' and ')}` : '');

const writableJsonExpr = (jsonColumn: string) => `nvl(${jsonColumn}, '{}')`;

const nestedJsonSet = (jsonColumn: string, values: HierarchyPathItem[]) =>
    values.reduce((expr, item) => `json_set(${expr}, ${quoteSql(jsonPath(item.key))}, ${quoteSql(item.value)})`, writableJsonExpr(jsonColumn));

export const buildGetHierarchyTemplateSql = ({ tableName, nameColumn, jsonColumn }: HierarchyQueryConfig) =>
    `select ${jsonColumn} from ${metadataTable(tableName)} where ${nameColumn} = ${quoteSql(HIERARCHY_RESERVED_NAME)}`;

export const buildCreateHierarchyTemplateSql = ({ tableName, nameColumn, jsonColumn }: HierarchyQueryConfig, template: HierarchyTemplate | HierarchyDocument = DEFAULT_HIERARCHY_TEMPLATE) =>
    `insert into ${metadataTable(tableName)} (${nameColumn}, ${jsonColumn}) values (${quoteSql(HIERARCHY_RESERVED_NAME)}, ${quoteSql(JSON.stringify(template))})`;

export const buildUpdateHierarchyTemplateSql = ({ tableName, nameColumn, jsonColumn }: HierarchyQueryConfig, template: HierarchyTemplate | HierarchyDocument) =>
    `update ${metadataTable(tableName)} set ${jsonColumn} = ${quoteSql(JSON.stringify(template))} where ${nameColumn} = ${quoteSql(HIERARCHY_RESERVED_NAME)}`;

export const buildGetHierarchyChildrenSql = (config: HierarchyQueryConfig, keys: string[], parentPath: HierarchyPathItem[]) => {
    const childKey = keys[parentPath.length];
    const aliasSelects = parentPath.map((item) => `${jsonValueExpr(config.jsonColumn, item.key)} as ${jsonAlias(item.key)}`).concat(`${jsonValueExpr(config.jsonColumn, childKey)} as VALUE`);
    const innerSql = `select ${aliasSelects.join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
    const conditions = parentPath.map((item) => `${jsonAlias(item.key)} = ${quoteSql(item.value)}`).concat(['VALUE is not null', 'length(VALUE) > 0']);

    return `select VALUE, count(*) as COUNT from (${innerSql})${buildWhereClause(conditions)} group by VALUE order by VALUE`;
};

export const buildGetHierarchyTagsSql = (config: HierarchyQueryConfig, path: HierarchyPathItem[]) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean).join(', ');
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));

    return `select ${columns} from ${metadataTable(config.tableName)}${buildWhereClause(conditions)} order by ${config.nameColumn}`;
};

export const buildGetDirectHierarchyTagsSql = (config: HierarchyQueryConfig, schema: string[], path: HierarchyPathItem[]) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean).join(', ');
    const nextKey = schema[path.length];
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));
    if (nextKey) conditions.push(`(${jsonValueExpr(config.jsonColumn, nextKey)} is null or length(${jsonValueExpr(config.jsonColumn, nextKey)}) = 0)`);

    return `select ${columns} from ${metadataTable(config.tableName)}${buildWhereClause(conditions)} order by ${config.nameColumn}`;
};

export const buildGetHierarchyTagCountSql = (config: HierarchyQueryConfig, path: HierarchyPathItem[]) => {
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, path));

    return `select count(*) as COUNT from ${metadataTable(config.tableName)}${buildWhereClause(conditions)}`;
};

export const buildUnassignedCondition = (jsonColumn: string, keys: string[]) =>
    `(${keys.map((key) => `${jsonValueExpr(jsonColumn, key)} is null or length(${jsonValueExpr(jsonColumn, key)}) = 0`).join(' or ')})`;

const normalizeKeyPaths = (keySpec: HierarchyKeySpec): string[][] => {
    if (keySpec.length === 0) return [];
    return Array.isArray(keySpec[0]) ? (keySpec as string[][]).filter((path) => path.length > 0) : [keySpec as string[]];
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
    const assignedPathConditions = paths.map((path) => `(${path.map((key) => `${jsonAlias(key)} is not null and length(${jsonAlias(key)}) > 0`).join(' and ')})`);

    return assignedPathConditions.length === 0 ? '(1 = 0)' : `not (${assignedPathConditions.join(' or ')})`;
};

const buildUnassignedSourceSql = (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean);
    const keys = uniqueKeysFromSpec(keySpec);
    const aliasSelects = keys.map((key) => `${jsonValueExpr(config.jsonColumn, key)} as ${jsonAlias(key)}`);

    return `select ${columns.concat(aliasSelects).join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
};

export const buildGetUnassignedTagsSql = (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean).join(', ');
    const innerSql = buildUnassignedSourceSql(config, keySpec);

    return `select ${columns} from (${innerSql})${buildWhereClause([buildUnassignedAliasCondition(keySpec)])} order by ${config.nameColumn}`;
};

export const buildGetUnassignedTagCountSql = (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec) => {
    const innerSql = buildUnassignedSourceSql(config, keySpec);

    return `select count(*) as COUNT from (${innerSql})${buildWhereClause([buildUnassignedAliasCondition(keySpec)])}`;
};

export const buildAttachTagsSql = (config: HierarchyQueryConfig, tagNames: string[], targetPath: HierarchyPathItem[]) => {
    const tagList = tagNames.map(quoteSql).join(', ');

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = ${nestedJsonSet(config.jsonColumn, targetPath)} where ${
        config.nameColumn
    } in (${tagList}) and ${config.nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`;
};

export const buildMoveTagsToHierarchyPathSql = (config: HierarchyQueryConfig, tagNames: string[], schema: string[], targetPath: HierarchyPathItem[]) => {
    const targetValues = new Map(targetPath.map((item) => [item.key, item.value]));
    const completePath = schema.map((key) => ({ key, value: targetValues.get(key) ?? '' }));

    return buildAttachTagsSql(config, tagNames, completePath);
};

export const buildDetachTagsSql = (config: HierarchyQueryConfig, tagNames: string[], keys: string[]) => {
    const tagList = tagNames.map(quoteSql).join(', ');
    const emptyPath = keys.map((key) => ({ key, value: '' }));

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = ${nestedJsonSet(config.jsonColumn, emptyPath)} where ${
        config.nameColumn
    } in (${tagList}) and ${config.nameColumn} <> ${quoteSql(HIERARCHY_RESERVED_NAME)}`;
};

export const buildRenameHierarchyValueSql = (config: HierarchyQueryConfig, path: HierarchyPathItem[], key: string, oldValue: string, newValue: string) => {
    const parentPath = path.filter((item) => item.key !== key);
    const conditions = baseWhere(config.nameColumn).concat(pathConditions(config.jsonColumn, parentPath)).concat([`${jsonValueExpr(config.jsonColumn, key)} = ${quoteSql(oldValue)}`]);

    return `update ${metadataTable(config.tableName)} set ${config.jsonColumn} = json_set(${config.jsonColumn}, ${quoteSql(jsonPath(key))}, ${quoteSql(
        newValue
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
    if (typeof template !== 'object' || Array.isArray(template)) return { mode: 'invalid', reason: 'Hierarchy document must be an object.' };

    const candidate = template as Partial<HierarchyDocument>;
    if (Array.isArray(candidate.schema) || Array.isArray(candidate.tree)) {
        if (!Array.isArray(candidate.schema) || !Array.isArray(candidate.tree)) {
            return { mode: 'invalid', reason: 'Hierarchy document requires both schema and tree arrays.' };
        }

        const normalizeNodes = (nodes: unknown[]): HierarchyValueNode[] =>
            nodes
                .filter((node) => node && typeof node === 'object' && !Array.isArray(node))
                .map((node) => {
                    const valueNode = node as Partial<HierarchyValueNode>;
                    return {
                        key: String(valueNode.key ?? ''),
                        value: String(valueNode.value ?? ''),
                        children: Array.isArray(valueNode.children) ? normalizeNodes(valueNode.children) : [],
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
    const walk = (nodes: HierarchyValueNode[], parent: HierarchyPathItem[] = []): HierarchyPathItem[][] =>
        nodes.flatMap((node) => {
            const path = parent.concat({ key: node.key, value: node.value });
            if (node.children.length === 0) return [path];
            return walk(node.children, path);
        });

    return walk(document.tree);
};

export const validateHierarchyDocument = (document: HierarchyDocument): HierarchyValidationIssue[] => {
    const issues: HierarchyValidationIssue[] = [];
    const seenSchema = new Set<string>();

    if (!document || !Array.isArray(document.schema) || !Array.isArray(document.tree)) {
        return [{ level: 'blocking', message: 'Hierarchy document requires schema and tree arrays.' }];
    }

    if (document.schema.length === 0) issues.push({ level: 'blocking', message: 'Hierarchy schema must contain at least one key.' });

    document.schema.forEach((key) => {
        if (!key.trim()) issues.push({ level: 'blocking', message: 'Hierarchy schema contains an empty key.' });
        if (key === HIERARCHY_RESERVED_NAME) issues.push({ level: 'blocking', message: 'Hierarchy key cannot use the reserved row name.' });
        if (seenSchema.has(key)) issues.push({ level: 'blocking', message: `Hierarchy key "${key}" is duplicated.` });
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) issues.push({ level: 'blocking', message: `Hierarchy key "${key}" is not safe for JSON path queries.` });
        seenSchema.add(key);
    });

    const visit = (nodes: HierarchyValueNode[], depth: number, siblingKeys = new Set<string>()) => {
        nodes.forEach((node) => {
            const expectedKey = document.schema[depth];
            const nodeIdentity = `${node.key}\u0000${node.value}`;
            if (!node.value.trim()) issues.push({ level: 'blocking', message: `Hierarchy node at depth ${depth + 1} contains an empty value.` });
            if (node.key !== expectedKey) issues.push({ level: 'blocking', message: `Hierarchy node "${node.value}" uses key "${node.key}", expected "${expectedKey}".` });
            if (siblingKeys.has(nodeIdentity)) issues.push({ level: 'blocking', message: `Sibling node "${node.value}" is duplicated under key "${node.key}".` });
            if (depth >= document.schema.length) issues.push({ level: 'blocking', message: `Hierarchy node "${node.value}" exceeds schema depth.` });
            siblingKeys.add(nodeIdentity);
            visit(node.children, depth + 1, new Set<string>());
        });
    };
    visit(document.tree, 0);

    return issues;
};

const rootValuesFromDocument = (document: HierarchyDocument) => document.tree.filter((node) => node.key === document.schema[0] && node.value.trim()).map((node) => node.value);

const buildDocumentUnassignedAliasCondition = (document: HierarchyDocument) => {
    const rootKey = document.schema[0];
    const rootValues = rootValuesFromDocument(document);
    if (!rootKey || rootValues.length === 0) return '(1 = 1)';

    const rootAlias = jsonAlias(rootKey);
    return `${rootAlias} is null or length(${rootAlias}) = 0 or not (${rootValues.map((value) => `${rootAlias} = ${quoteSql(value)}`).join(' or ')})`;
};

const buildDocumentUnassignedSourceSql = (config: HierarchyQueryConfig, document: HierarchyDocument) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean);
    const keys = document.schema.slice(0, 1);
    const aliasSelects = keys.map((key) => `${jsonValueExpr(config.jsonColumn, key)} as ${jsonAlias(key)}`);

    return `select ${columns.concat(aliasSelects).join(', ')} from ${metadataTable(config.tableName)}${buildWhereClause(baseWhere(config.nameColumn))}`;
};

export const buildGetUnassignedTagsByDocumentSql = (config: HierarchyQueryConfig, document: HierarchyDocument) => {
    const columns = [config.nameColumn, config.jsonColumn, config.specColumn].filter(Boolean).join(', ');
    const innerSql = buildDocumentUnassignedSourceSql(config, document);

    return `select ${columns} from (${innerSql})${buildWhereClause([buildDocumentUnassignedAliasCondition(document)])} order by ${config.nameColumn}`;
};

export const buildGetUnassignedTagCountByDocumentSql = (config: HierarchyQueryConfig, document: HierarchyDocument) => {
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
        issues.push({ level: 'blocking', message: 'Hierarchy template must contain at least one key.' });
    }

    keys.forEach((key) => {
        if (!key.trim()) issues.push({ level: 'blocking', message: 'Hierarchy template contains an empty key.' });
        if (key === HIERARCHY_RESERVED_NAME) issues.push({ level: 'blocking', message: 'Hierarchy key cannot use the reserved row name.' });
        if (seen.has(key)) issues.push({ level: 'blocking', message: `Hierarchy key "${key}" is duplicated.` });
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) issues.push({ level: 'blocking', message: `Hierarchy key "${key}" is not safe for JSON path queries.` });
        seen.add(key);
    });

    return issues;
};

const firstCell = (data: any) => data?.rows?.[0]?.[0];

const normalizeRows = (data: any, config: HierarchyQueryConfig): HierarchyTagRow[] => {
    const nameIdx = data?.columns?.indexOf(config.nameColumn) ?? -1;
    const jsonIdx = data?.columns?.indexOf(config.jsonColumn) ?? -1;
    const specIdx = config.specColumn ? data?.columns?.indexOf(config.specColumn) ?? -1 : -1;

    return (data?.rows ?? []).map((row: any[]) => ({
        name: String(row[nameIdx] ?? ''),
        asset: String(row[jsonIdx] ?? ''),
        spec: specIdx >= 0 ? String(row[specIdx] ?? '') : undefined,
    }));
};

export const getHierarchyTemplate = async (config: HierarchyQueryConfig) => {
    const { svrState, svrData, svrReason } = await fetchQuery(buildGetHierarchyTemplateSql(config));
    if (!svrState) return { success: false, reason: svrReason, template: undefined, keys: [], hasRow: false };

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
                issues: [{ level: 'blocking', message: 'Legacy hierarchy template detected. Recreate the tree using the schema/tree format.' }],
                mode: parsed.mode,
                hasRow,
            };
        }
        if (parsed.mode === 'invalid') {
            return { success: false, reason: parsed.reason ?? 'Hierarchy document is invalid.', template: undefined, keys: [], hasRow };
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
        return { success: false, reason: 'Hierarchy template JSON parse failed.', template: undefined, keys: [], hasRow };
    }
};

export const createHierarchyTemplate = async (config: HierarchyQueryConfig, template: HierarchyTemplate | HierarchyDocument = DEFAULT_HIERARCHY_TEMPLATE) =>
    fetchQuery(buildCreateHierarchyTemplateSql(config, template));

export const updateHierarchyTemplate = async (config: HierarchyQueryConfig, template: HierarchyTemplate | HierarchyDocument) => fetchQuery(buildUpdateHierarchyTemplateSql(config, template));

export const getHierarchyChildren = async (config: HierarchyQueryConfig, keys: string[], parentPath: HierarchyPathItem[]) => {
    const { svrState, svrData, svrReason } = await fetchQuery(buildGetHierarchyChildrenSql(config, keys, parentPath));
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyChildRow[] };

    return {
        success: true,
        rows: (svrData?.rows ?? []).map((row: any[]) => ({
            key: keys[parentPath.length],
            value: String(row[0] ?? ''),
            path: parentPath.concat([{ key: keys[parentPath.length], value: String(row[0] ?? '') }]),
            tagCount: Number(row[1] ?? 0),
        })),
    };
};

export const getHierarchyTags = async (config: HierarchyQueryConfig, path: HierarchyPathItem[], page = 0) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(buildGetHierarchyTagsSql(config, path), page, PAGE_SIZE);
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getDirectHierarchyTags = async (config: HierarchyQueryConfig, schema: string[], path: HierarchyPathItem[], page = 0) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(buildGetDirectHierarchyTagsSql(config, schema, path), page, PAGE_SIZE);
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getHierarchyTagCount = async (config: HierarchyQueryConfig, path: HierarchyPathItem[]) => {
    const { svrState, svrData } = await fetchQuery(buildGetHierarchyTagCountSql(config, path));
    return svrState ? Number(firstCell(svrData) ?? 0) : 0;
};

export const getUnassignedTags = async (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec, page = 0) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(buildGetUnassignedTagsSql(config, keySpec), page, PAGE_SIZE);
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getUnassignedTagsByDocument = async (config: HierarchyQueryConfig, document: HierarchyDocument, page = 0) => {
    const { svrState, svrData, svrReason } = await fetchTqlQuery(buildGetUnassignedTagsByDocumentSql(config, document), page, PAGE_SIZE);
    if (!svrState) return { success: false, reason: svrReason, rows: [] as HierarchyTagRow[] };
    return { success: true, rows: normalizeRows(svrData, config) };
};

export const getUnassignedTagCount = async (config: HierarchyQueryConfig, keySpec: HierarchyKeySpec) => {
    const { svrState, svrData } = await fetchQuery(buildGetUnassignedTagCountSql(config, keySpec));
    return svrState ? Number(firstCell(svrData) ?? 0) : 0;
};

export const getUnassignedTagCountByDocument = async (config: HierarchyQueryConfig, document: HierarchyDocument) => {
    const { svrState, svrData } = await fetchQuery(buildGetUnassignedTagCountByDocumentSql(config, document));
    return svrState ? Number(firstCell(svrData) ?? 0) : 0;
};

export const attachTagsToPath = async (config: HierarchyQueryConfig, tagNames: string[], targetPath: HierarchyPathItem[]) => fetchQuery(buildAttachTagsSql(config, tagNames, targetPath));

export const moveTagsToHierarchyPath = async (config: HierarchyQueryConfig, tagNames: string[], schema: string[], targetPath: HierarchyPathItem[]) =>
    fetchQuery(buildMoveTagsToHierarchyPathSql(config, tagNames, schema, targetPath));

export const detachTagsFromHierarchy = async (config: HierarchyQueryConfig, tagNames: string[], keys: string[]) => fetchQuery(buildDetachTagsSql(config, tagNames, keys));

export const renameHierarchyValue = async (config: HierarchyQueryConfig, path: HierarchyPathItem[], key: string, oldValue: string, newValue: string) =>
    fetchQuery(buildRenameHierarchyValueSql(config, path, key, oldValue, newValue));
