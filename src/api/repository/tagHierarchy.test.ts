import {
    HIERARCHY_RESERVED_NAME,
    buildAttachTagsSql,
    buildCreateJsonMetadataColumnSql,
    buildDetachTagsSql,
    buildGetDirectHierarchyTagsSql,
    buildGetUnassignedTagsByDocumentSql,
    buildHierarchyTemplateFromKeys,
    buildHierarchyTemplateFromTree,
    buildGetHierarchyChildrenSql,
    buildGetHierarchyTagsSql,
    buildGetUnassignedTagsSql,
    buildMoveTagsToHierarchyPathSql,
    buildRenameHierarchyValueSql,
    buildUpdateHierarchyTemplateSql,
    canRemoveHierarchySchemaKey,
    canRemoveHierarchyValueNode,
    escapeSqlString,
    flattenHierarchyTemplate,
    getHierarchyDocumentPaths,
    getHierarchyTemplatePaths,
    hierarchyTreeHasDepth,
    parseHierarchyDocument,
    parseHierarchyTemplateTree,
    validateHierarchyDocument,
    validateHierarchyTemplate,
    type HierarchyDocument,
    type HierarchyQueryConfig,
} from './tagHierarchy';

const config: HierarchyQueryConfig = {
    tableName: 'MACHBASEDB.SYS.SENSOR_TAG',
    nameColumn: 'NAME',
    jsonColumn: 'ASSET',
    specColumn: 'SPEC',
};

const path = [
    { key: 'world', value: 'Global' },
    { key: 'city', value: 'Seoul' },
];

const document: HierarchyDocument = {
    schema: ['country', 'city', 'factory'],
    tree: [
        {
            key: 'country',
            value: 'Korea',
            children: [
                {
                    key: 'city',
                    value: 'Seoul',
                    children: [
                        { key: 'factory', value: 'Factory-A', children: [] },
                        { key: 'factory', value: 'Factory-B', children: [] },
                    ],
                },
                { key: 'city', value: 'Busan', children: [] },
            ],
        },
        { key: 'country', value: 'Japan', children: [] },
    ],
};

describe('tagHierarchy SQL builders', () => {
    test('escapes SQL string literals', () => {
        expect(escapeSqlString("Factory '01'")).toBe("Factory ''01''");
    });

    test('builds lazy child lookup SQL', () => {
        expect(buildGetHierarchyChildrenSql(config, ['world', 'city', 'factory'], path)).toBe(
            "select VALUE, count(*) as COUNT from (select ASSET->'$.world' as H_WORLD, ASSET->'$.city' as H_CITY, ASSET->'$.factory' as VALUE from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__') where H_WORLD = 'Global' and H_CITY = 'Seoul' and VALUE is not null and length(VALUE) > 0 group by VALUE order by VALUE"
        );
    });

    test('builds tag list SQL with reserved row excluded', () => {
        expect(buildGetHierarchyTagsSql(config, path)).toBe(
            "select NAME, ASSET, SPEC from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__' and ASSET->'$.world' = 'Global' and ASSET->'$.city' = 'Seoul' order by NAME"
        );
    });

    test('builds direct tag list SQL with next level empty', () => {
        expect(buildGetDirectHierarchyTagsSql(config, ['world', 'city', 'factory'], path)).toBe(
            "select NAME, ASSET, SPEC from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__' and ASSET->'$.world' = 'Global' and ASSET->'$.city' = 'Seoul' and (ASSET->'$.factory' is null or length(ASSET->'$.factory') = 0) order by NAME"
        );
    });

    test('builds unassigned SQL using null or empty string policy', () => {
        expect(buildGetUnassignedTagsSql(config, ['world', 'city'])).toBe(
            "select NAME, ASSET, SPEC from (select NAME, ASSET, SPEC, ASSET->'$.world' as H_WORLD, ASSET->'$.city' as H_CITY from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__') where not ((H_WORLD is not null and length(H_WORLD) > 0 and H_CITY is not null and length(H_CITY) > 0)) order by NAME"
        );
    });

    test('builds unassigned SQL for sibling hierarchy paths', () => {
        expect(
            buildGetUnassignedTagsSql(config, [
                ['site', 'line'],
                ['site', 'area'],
            ])
        ).toBe(
            "select NAME, ASSET, SPEC from (select NAME, ASSET, SPEC, ASSET->'$.site' as H_SITE, ASSET->'$.line' as H_LINE, ASSET->'$.area' as H_AREA from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__') where not ((H_SITE is not null and length(H_SITE) > 0 and H_LINE is not null and length(H_LINE) > 0) or (H_SITE is not null and length(H_SITE) > 0 and H_AREA is not null and length(H_AREA) > 0)) order by NAME"
        );
    });

    test('builds document unassigned SQL from root value nodes', () => {
        expect(buildGetUnassignedTagsByDocumentSql(config, document)).toBe(
            "select NAME, ASSET, SPEC from (select NAME, ASSET, SPEC, ASSET->'$.country' as H_COUNTRY, ASSET->'$.city' as H_CITY, ASSET->'$.factory' as H_FACTORY from MACHBASEDB.SYS.SENSOR_TAG METADATA where NAME <> '__machbase_hierarchy__') where not ((H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Korea' and (H_CITY is null or length(H_CITY) = 0)) or (H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Korea' and H_CITY is not null and length(H_CITY) > 0 and H_CITY = 'Seoul' and (H_FACTORY is null or length(H_FACTORY) = 0)) or (H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Korea' and H_CITY is not null and length(H_CITY) > 0 and H_CITY = 'Seoul' and H_FACTORY is not null and length(H_FACTORY) > 0 and H_FACTORY = 'Factory-A') or (H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Korea' and H_CITY is not null and length(H_CITY) > 0 and H_CITY = 'Seoul' and H_FACTORY is not null and length(H_FACTORY) > 0 and H_FACTORY = 'Factory-B') or (H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Korea' and H_CITY is not null and length(H_CITY) > 0 and H_CITY = 'Busan' and (H_FACTORY is null or length(H_FACTORY) = 0)) or (H_COUNTRY is not null and length(H_COUNTRY) > 0 and H_COUNTRY = 'Japan' and (H_CITY is null or length(H_CITY) = 0))) order by NAME"
        );
    });

    test('builds attach SQL using json_set for target path', () => {
        expect(buildAttachTagsSql(config, ['TAG_01', "TAG'02"], path)).toBe(
            "update MACHBASEDB.SYS.SENSOR_TAG METADATA set ASSET = json_set(json_set(nvl(ASSET, '{}'), '$.world', 'Global'), '$.city', 'Seoul') where NAME in ('TAG_01', 'TAG''02') and NAME <> '__machbase_hierarchy__'"
        );
    });

    test('builds drag-drop move SQL with empty remaining schema keys', () => {
        expect(buildMoveTagsToHierarchyPathSql(config, ['TAG_01'], document.schema, [{ key: 'country', value: 'Korea' }])).toBe(
            "update MACHBASEDB.SYS.SENSOR_TAG METADATA set ASSET = json_set(json_set(json_set(nvl(ASSET, '{}'), '$.country', 'Korea'), '$.city', ''), '$.factory', '') where NAME in ('TAG_01') and NAME <> '__machbase_hierarchy__'"
        );
    });

    test('builds detach SQL by setting hierarchy keys to empty strings', () => {
        expect(buildDetachTagsSql(config, ['TAG_01'], ['world', 'city'])).toBe(
            "update MACHBASEDB.SYS.SENSOR_TAG METADATA set ASSET = json_set(json_set(nvl(ASSET, '{}'), '$.world', ''), '$.city', '') where NAME in ('TAG_01') and NAME <> '__machbase_hierarchy__'"
        );
    });

    test('builds value rename SQL without changing hierarchy keys', () => {
        expect(buildRenameHierarchyValueSql(config, path, 'city', 'Seoul', 'Busan')).toBe(
            "update MACHBASEDB.SYS.SENSOR_TAG METADATA set ASSET = json_set(ASSET, '$.city', 'Busan') where NAME <> '__machbase_hierarchy__' and ASSET->'$.world' = 'Global' and ASSET->'$.city' = 'Seoul'"
        );
    });

    test('builds template update SQL for the reserved row', () => {
        expect(buildUpdateHierarchyTemplateSql(config, { site: { line: {} } })).toBe(
            "update MACHBASEDB.SYS.SENSOR_TAG METADATA set ASSET = '{\"site\":{\"line\":{}}}' where NAME = '__machbase_hierarchy__'"
        );
    });

    test('builds metadata JSON column creation SQL', () => {
        expect(buildCreateJsonMetadataColumnSql(config.tableName)).toBe('ALTER TABLE MACHBASEDB.SYS.SENSOR_TAG METADATA ADD COLUMN (ASSET JSON)');
    });
});

describe('tagHierarchy edit guards', () => {
    test('only allows removing leaf value nodes', () => {
        expect(canRemoveHierarchyValueNode(document.tree[0])).toBe(false);
        expect(canRemoveHierarchyValueNode(document.tree[0].children[0].children[0])).toBe(true);
    });

    test('only allows removing the deepest empty schema key', () => {
        expect(hierarchyTreeHasDepth(document.tree, 0)).toBe(true);
        expect(hierarchyTreeHasDepth(document.tree, 2)).toBe(true);
        expect(hierarchyTreeHasDepth(document.tree, 3)).toBe(false);
        expect(canRemoveHierarchySchemaKey(document.schema, document.tree, 1)).toBe(false);
        expect(canRemoveHierarchySchemaKey(document.schema, document.tree, 2)).toBe(false);
        expect(canRemoveHierarchySchemaKey(document.schema.concat('sensor'), document.tree, 3)).toBe(true);
    });
});

describe('tagHierarchy template helpers', () => {
    test('parses schema/tree hierarchy document', () => {
        expect(parseHierarchyDocument(document)).toEqual({ mode: 'document', document });
        expect(getHierarchyDocumentPaths(document)).toEqual([
            [
                { key: 'country', value: 'Korea' },
                { key: 'city', value: 'Seoul' },
                { key: 'factory', value: 'Factory-A' },
            ],
            [
                { key: 'country', value: 'Korea' },
                { key: 'city', value: 'Seoul' },
                { key: 'factory', value: 'Factory-B' },
            ],
            [
                { key: 'country', value: 'Korea' },
                { key: 'city', value: 'Busan' },
            ],
            [{ key: 'country', value: 'Japan' }],
        ]);
    });

    test('validates schema/tree key depth matching', () => {
        expect(validateHierarchyDocument(document)).toEqual([]);
        expect(
            validateHierarchyDocument({
                schema: ['country', 'city'],
                tree: [{ key: 'city', value: 'Seoul', children: [] }],
            })
        ).toEqual(expect.arrayContaining([{ level: 'blocking', message: 'Hierarchy node "Seoul" uses key "city", expected "country".' }]));
    });

    test('flattens the issue 1351 hierarchy template order', () => {
        expect(
            flattenHierarchyTemplate({
                world: {
                    city: {
                        factory: {
                            equipment: {
                                sensor: {},
                            },
                        },
                    },
                },
            })
        ).toEqual(['world', 'city', 'factory', 'equipment', 'sensor']);
    });

    test('builds nested template from ordered keys', () => {
        expect(buildHierarchyTemplateFromKeys(['site', 'line', 'point'])).toEqual({
            site: {
                line: {
                    point: {},
                },
            },
        });
    });

    test('parses sibling template nodes and paths', () => {
        const template = {
            site: {
                line: {
                    equipment: {},
                    point: {},
                },
                area: {},
            },
        };

        expect(parseHierarchyTemplateTree(template)).toEqual([
            {
                key: 'site',
                children: [
                    {
                        key: 'line',
                        children: [
                            { key: 'equipment', children: [] },
                            { key: 'point', children: [] },
                        ],
                    },
                    { key: 'area', children: [] },
                ],
            },
        ]);
        expect(getHierarchyTemplatePaths(template)).toEqual([
            ['site', 'line', 'equipment'],
            ['site', 'line', 'point'],
            ['site', 'area'],
        ]);
    });

    test('builds nested template from sibling tree nodes', () => {
        expect(
            buildHierarchyTemplateFromTree([
                {
                    key: 'site',
                    children: [
                        { key: 'line', children: [] },
                        { key: 'area', children: [] },
                    ],
                },
            ])
        ).toEqual({
            site: {
                line: {},
                area: {},
            },
        });
    });

    test('blocks invalid template keys', () => {
        const issues = validateHierarchyTemplate({ world: { [HIERARCHY_RESERVED_NAME]: {} } });

        expect(issues).toEqual(expect.arrayContaining([{ level: 'blocking', message: 'Hierarchy key cannot use the reserved row name.' }]));
    });
});
