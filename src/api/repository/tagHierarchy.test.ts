import {
    HIERARCHY_RESERVED_NAME,
    buildAttachTagsSql,
    buildCreateJsonMetadataColumnSql,
    buildCreateJsonPathIndexSql,
    buildDropJsonPathIndexSql,
    buildHierarchyIndexName,
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
    canIndentHierarchyValueNode,
    canOutdentHierarchyValueNode,
    canRemoveHierarchySchemaKey,
    canRemoveHierarchyValueNode,
    escapeSqlString,
    hierarchyValueSubtreeHeight,
    indentHierarchyValueNode,
    insertHierarchyValueChild,
    insertHierarchyValueSibling,
    moveHierarchyValueNode,
    outdentHierarchyValueNode,
    removeHierarchyValueNodeAt,
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

describe('tagHierarchy JSON-path index DDL', () => {
    const shortConfig: HierarchyQueryConfig = { tableName: 'TAG', nameColumn: 'NAME', jsonColumn: 'ASSET', specColumn: 'SPEC' };

    test('builds create index SQL on the metadata JSON path', () => {
        expect(buildCreateJsonPathIndexSql(shortConfig, 'country')).toBe("CREATE INDEX HIDX_TAG_ASSET_COUNTRY ON TAG METADATA (ASSET->'$.country')");
    });

    test('builds drop index SQL with the same derived name', () => {
        expect(buildDropJsonPathIndexSql(shortConfig, 'country')).toBe('DROP INDEX HIDX_TAG_ASSET_COUNTRY');
    });

    test('derives a deterministic, distinct, safe index name within the length limit', () => {
        const first = buildHierarchyIndexName(config, 'country');
        const second = buildHierarchyIndexName(config, 'country');
        const other = buildHierarchyIndexName(config, 'city');
        expect(first).toBe(second);
        expect(first).not.toBe(other);
        expect(first.length).toBeLessThanOrEqual(40);
        expect(first.startsWith('HIDX_')).toBe(true);
        expect(/^[A-Za-z_][A-Za-z0-9_]*$/.test(first)).toBe(true);
    });

    test('rejects an unsafe schema key', () => {
        expect(() => buildHierarchyIndexName(config, "bad'key")).toThrow();
        expect(() => buildCreateJsonPathIndexSql(config, 'bad-key')).toThrow();
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
        ).toEqual(expect.arrayContaining([{ level: 'blocking', message: 'Hierarchy node "Seoul" uses key "city", expected "country".', path: [0] }]));
    });

    test('tags node-level issues with their numeric tree path', () => {
        const issues = validateHierarchyDocument({
            schema: ['country', 'city'],
            tree: [
                {
                    key: 'country',
                    value: 'Korea',
                    children: [{ key: 'city', value: '  ', children: [] }],
                },
            ],
        });
        // The empty grandchild value is reported against [0, 0].
        expect(issues).toEqual(
            expect.arrayContaining([
                { level: 'blocking', message: 'Hierarchy node at depth 2 contains an empty value.', path: [0, 0] },
            ]),
        );
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

describe('tagHierarchy value-tree edits', () => {
    // Reads a node by numeric path: tree[0,0,1] -> Factory-B etc.
    const valueAt = (tree: HierarchyDocument['tree'], path: number[]) => {
        let list = tree;
        let node = list[path[0]];
        for (let i = 1; i < path.length; i += 1) {
            list = node.children;
            node = list[path[i]];
        }
        return node;
    };

    test('subtree height counts the deepest descendant', () => {
        expect(hierarchyValueSubtreeHeight(document.tree[0])).toBe(2); // Korea > Seoul > Factory
        expect(hierarchyValueSubtreeHeight(document.tree[0].children[0])).toBe(1); // Seoul > Factory
        expect(hierarchyValueSubtreeHeight(document.tree[1])).toBe(0); // Japan (leaf)
    });

    test('inserts an empty sibling at the same depth and focuses it', () => {
        const { tree, focusPath } = insertHierarchyValueSibling(document.tree, [0, 0, 0], document.schema);
        expect(focusPath).toEqual([0, 0, 1]);
        expect(valueAt(tree, [0, 0, 1])).toEqual({ key: 'factory', value: '', children: [] });
        expect(valueAt(tree, [0, 0, 2]).value).toBe('Factory-B'); // original shifted down
    });

    test('never inserts a sibling at the root (single depth-1 node)', () => {
        const result = insertHierarchyValueSibling(document.tree, [1], document.schema);
        expect(result.focusPath).toBeNull();
        expect(result.tree).toBe(document.tree); // unchanged
    });

    test('adds a first child (depth 2) when the root cannot take a sibling', () => {
        const singleRoot = [{ key: 'country', value: 'qqq', children: [] }];
        const seeded = insertHierarchyValueChild(singleRoot, [0], ['country', 'city'])!;
        expect(seeded.focusPath).toEqual([0, 0]);
        expect(valueAt(seeded.tree, [0, 0])).toEqual({ key: 'city', value: '', children: [] });

        // Prepends, so existing children shift back.
        const withChild = insertHierarchyValueChild(document.tree, [0], document.schema)!;
        expect(withChild.focusPath).toEqual([0, 0]);
        expect(valueAt(withChild.tree, [0, 0]).value).toBe('');
        expect(valueAt(withChild.tree, [0, 1]).value).toBe('Seoul');

        // A single-level schema has no room for a child.
        expect(insertHierarchyValueChild(singleRoot, [0], ['country'])).toBeNull();
    });

    test('guards indent against missing previous sibling and schema overflow', () => {
        expect(canIndentHierarchyValueNode(document.tree, [0, 0, 0], 3)).toBe(false); // no prev sibling
        expect(canIndentHierarchyValueNode(document.tree, [0, 0, 1], 3)).toBe(false); // would exceed schema depth
        expect(canIndentHierarchyValueNode(document.tree, [0, 1], 3)).toBe(true); // Busan under Seoul
        expect(indentHierarchyValueNode(document.tree, [0, 0, 0], document.schema)).toBeNull();
    });

    test('indents a node under its previous sibling', () => {
        const result = indentHierarchyValueNode(document.tree, [0, 1], document.schema);
        expect(result).not.toBeNull();
        const { tree, focusPath } = result!;
        expect(focusPath).toEqual([0, 0, 2]);
        expect(valueAt(tree, [0, 0, 2]).value).toBe('Busan'); // appended after Seoul's children
        expect(valueAt(tree, [0]).children).toHaveLength(1); // Korea now only has Seoul
    });

    test('outdents a node to sit after its parent, never to a new root', () => {
        expect(canOutdentHierarchyValueNode([0])).toBe(false); // root
        expect(canOutdentHierarchyValueNode([0, 1])).toBe(false); // depth 2 -> would create a 2nd root
        expect(canOutdentHierarchyValueNode([0, 0, 0])).toBe(true); // depth 3 -> ok
        expect(outdentHierarchyValueNode(document.tree, [0, 1])).toBeNull();

        const result = outdentHierarchyValueNode(document.tree, [0, 0, 1]); // Factory-B
        const { tree, focusPath } = result!;
        expect(focusPath).toEqual([0, 1]); // sits right after Seoul under Korea
        expect(valueAt(tree, [0, 1]).value).toBe('Factory-B');
        expect(valueAt(tree, [0, 0]).children).toHaveLength(1); // Seoul kept Factory-A only
    });

    test('reorders a node among its siblings, carrying its subtree', () => {
        // Move Factory-A (with no children) down past Factory-B.
        const down = moveHierarchyValueNode(document.tree, [0, 0, 0], 1)!;
        expect(down.focusPath).toEqual([0, 0, 1]);
        expect(valueAt(down.tree, [0, 0, 0]).value).toBe('Factory-B');
        expect(valueAt(down.tree, [0, 0, 1]).value).toBe('Factory-A');

        // Move Seoul (subtree) down past Busan; its children come along.
        const seoulDown = moveHierarchyValueNode(document.tree, [0, 0], 1)!;
        expect(seoulDown.focusPath).toEqual([0, 1]);
        expect(valueAt(seoulDown.tree, [0, 1]).value).toBe('Seoul');
        expect(valueAt(seoulDown.tree, [0, 1]).children).toHaveLength(2);
        expect(valueAt(seoulDown.tree, [0, 0]).value).toBe('Busan');

        // Boundaries: first sibling up / last sibling down -> no-op.
        expect(moveHierarchyValueNode(document.tree, [0, 0, 0], -1)).toBeNull();
        expect(moveHierarchyValueNode(document.tree, [0, 1], 1)).toBeNull();
    });

    test('removes a node and focuses the row above it', () => {
        // previous sibling (leaf) becomes the focus target
        expect(removeHierarchyValueNodeAt(document.tree, [0, 0, 1]).focusPath).toEqual([0, 0, 0]);
        // no previous sibling -> focus the parent
        expect(removeHierarchyValueNodeAt(document.tree, [0, 0, 0]).focusPath).toEqual([0, 0]);
        // first root with nothing above -> null
        expect(removeHierarchyValueNodeAt(document.tree, [0]).focusPath).toBeNull();
        // previous root's deepest tail (Korea > Seoul > Busan)
        expect(removeHierarchyValueNodeAt(document.tree, [1]).focusPath).toEqual([0, 1]);
        const { tree } = removeHierarchyValueNodeAt(document.tree, [0, 0, 1]);
        expect(valueAt(tree, [0, 0]).children).toHaveLength(1);
    });
});
