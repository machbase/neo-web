import {
    displayJsonPathLabel,
    extractJsonPathsFromSamples,
    formatJsonValueField,
    getJsonPathSegments,
    jsonPathInputToStoredPath,
    jsonValueFieldToSql,
    jsonPathToSqlPath,
    normalizeJsonPath,
    parseJsonValueField,
} from './dashboardJsonValue';

describe('dashboard JSON value path helpers', () => {
    test('normalizes legacy dotted paths as nested bracket paths', () => {
        expect(normalizeJsonPath('metrics.temperature')).toBe('[metrics][temperature]');
        expect(normalizeJsonPath('$.metrics.temperature')).toBe('[metrics][temperature]');
        expect(normalizeJsonPath('$metrics.temperature')).toBe('[metrics][temperature]');
    });

    test('keeps bracket paths so dotted key names stay single keys', () => {
        expect(normalizeJsonPath('[a.b.c]')).toBe('[a.b.c]');
        expect(formatJsonValueField('PAYLOAD', '[a.b.c]')).toBe('PAYLOAD->$[a.b.c]');
        expect(jsonValueFieldToSql('PAYLOAD', '[a.b.c]')).toBe("PAYLOAD->'$[a.b.c]'");
    });

    test('formats nested JSON paths with brackets in SQL', () => {
        expect(formatJsonValueField('PAYLOAD', 'a.b.c')).toBe('PAYLOAD->$[a][b][c]');
        expect(jsonValueFieldToSql('PAYLOAD', 'a.b.c')).toBe("PAYLOAD->'$[a][b][c]'");
    });

    test('parses legacy JSON value fields into canonical bracket paths', () => {
        expect(parseJsonValueField('PAYLOAD->$metrics.temperature')).toEqual({
            column: 'PAYLOAD',
            path: '[metrics][temperature]',
        });
        expect(parseJsonValueField('PAYLOAD->$[metrics.temperature]')).toEqual({
            column: 'PAYLOAD',
            path: '[metrics.temperature]',
        });
    });

    test('extracts dotted key names and nested keys as different bracket paths', () => {
        expect(
            extractJsonPathsFromSamples([
                JSON.stringify({
                    'a.b.c': 10,
                    a: {
                        b: {
                            c: 20,
                        },
                    },
                }),
            ])
        ).toEqual(['[a.b.c]', '[a][b][c]']);
    });

    test('displays dotted key names with brackets and nested keys as dot paths', () => {
        expect(displayJsonPathLabel('[a.b.c]')).toBe('[a.b.c]');
        expect(displayJsonPathLabel('[a][b][c]')).toBe('a.b.c');
        expect(displayJsonPathLabel('metrics.temperature')).toBe('metrics.temperature');
    });

    test('keeps ambiguous dotted path segments bracketed in display labels', () => {
        expect(displayJsonPathLabel('[a.b][c]')).toBe('[a.b][c]');
        expect(displayJsonPathLabel('[a][b.c]')).toBe('[a][b.c]');
        expect(displayJsonPathLabel('[a.b][c.d]')).toBe('[a.b][c.d]');
    });

    test('keeps bracket path input explicit and treats plain dot input as legacy nested path', () => {
        const paths = ['[a.b.c]', '[a][b][c]'];

        expect(jsonPathInputToStoredPath('[a.b.c]', paths)).toBe('[a.b.c]');
        expect(jsonPathInputToStoredPath('[a][b][c]', paths)).toBe('[a][b][c]');
        expect(jsonPathInputToStoredPath('a.b.c', paths)).toBe('[a][b][c]');
        expect(jsonPathInputToStoredPath('metrics.temperature', paths)).toBe('[metrics][temperature]');
    });

    test('treats direct dot input as nested path even when known paths have dotted segments', () => {
        expect(jsonPathInputToStoredPath('a.b.c', ['[a.b][c]'])).toBe('[a][b][c]');
    });

    test('does not throw while a user is still typing an incomplete bracket path', () => {
        expect(() => jsonPathInputToStoredPath('[')).not.toThrow();
        expect(jsonPathInputToStoredPath('[')).toBe('');
        expect(() => jsonPathInputToStoredPath("['a")).not.toThrow();
        expect(jsonPathInputToStoredPath("['a")).toBe('');
        expect(() => jsonPathToSqlPath("['a")).toThrow('Invalid JSON path');
    });

    test('preserves exact whitespace and empty key names in explicit bracket paths', () => {
        expect(normalizeJsonPath("[' a ']")) .toBe("[' a ']");
        expect(normalizeJsonPath("['']")).toBe("['']");
        expect(getJsonPathSegments("[' a ']['']")).toEqual([' a ', '']);
        expect(jsonValueFieldToSql('VALUE', "[' a ']")) .toBe("VALUE->'$['' a '']'");
        expect(() => jsonValueFieldToSql('VALUE', "['']")).toThrow('cannot be queried');
    });
});

// A key may contain the very characters the path syntax uses. The reader used to stop at the first
// `]`, so `[TEST] RENAME_1` was cut down to `[TEST` and every such key collapsed onto one path.
describe('paths whose keys carry bracket syntax', () => {
    it('quotes only the segments that need it, leaving stored paths untouched', () => {
        expect(normalizeJsonPath('[temp]')).toBe('[temp]');
        expect(normalizeJsonPath('[pos][x]')).toBe('[pos][x]');
        expect(normalizeJsonPath("['[TEST] RENAME_1']")).toBe("['[TEST] RENAME_1']");
    });

    it('reads a quoted segment back whole', () => {
        expect(getJsonPathSegments("['[TEST] RENAME_1']")).toEqual(['[TEST] RENAME_1']);
        expect(displayJsonPathLabel("['[TEST] RENAME_1']")).toBe("['[TEST] RENAME_1']");
    });

    it('keeps distinct bracketed keys distinct', () => {
        const paths = ["['[TEST] RENAME_1']", "['[TEST] RENAME_2']"].map(normalizeJsonPath);
        expect(new Set(paths).size).toBe(2);
    });

    it('round-trips a key containing a quote', () => {
        const path = formatJsonValueField('VALUE', "[it's]").replace('VALUE->$', '');
        expect(getJsonPathSegments(path)).toEqual(["it's"]);
        expect(path).toBe('["it\'s"]');
        expect(jsonValueFieldToSql('VALUE', path)).toBe("VALUE->'$[\"it''s\"]'");
    });

    it('keeps legacy single-quoted saved paths readable while using a DB-safe path', () => {
        expect(normalizeJsonPath("['a''b']")).toBe('["a\'b"]');
        expect(getJsonPathSegments("['a''b']")).toEqual(["a'b"]);
    });

    it('keeps quote, bracket, and backslash key identities distinct', () => {
        const keys = ["a'b", 'a"b', 'a]b', 'a\\b', "a'\"b"];
        const paths = extractJsonPathsFromSamples([JSON.stringify(Object.fromEntries(keys.map((key) => [key, 42])))]);
        expect(paths.map(getJsonPathSegments)).toEqual(keys.map((key) => [key]));
        expect(paths).toEqual(['["a\'b"]', '[a"b]', "['a]b']", "['a\\b']", '[a\'"b]']);
        expect(jsonValueFieldToSql('VALUE', paths[3])).toBe("VALUE->'$[''a\\\\b'']'");
    });

    it('reports keys that Machbase cannot address', () => {
        expect(() => jsonPathToSqlPath("['']")).toThrow('cannot be queried');
        expect(() => jsonPathToSqlPath("['a''\"b]']")).toThrow('cannot be queried');
        expect(() => jsonPathToSqlPath("['\"a''b']")).toThrow('cannot be queried');
        expect(() => jsonPathToSqlPath("['broken']tail")).toThrow('Invalid JSON path');
    });

    it('keeps keys beginning with either quote separate from JSONPath delimiters', () => {
        const paths = extractJsonPathsFromSamples([JSON.stringify({ '"abc': 1, "'abc": 2 })]);
        expect(paths).toEqual(["['\"abc']", '["\'abc"]']);
        expect(paths.map(getJsonPathSegments)).toEqual([['"abc'], ["'abc"]]);
    });

    it('discovers a bracketed key from a sample in addressable form', () => {
        const paths = extractJsonPathsFromSamples(['{"[TEST] RENAME_1":1}']);
        expect(getJsonPathSegments(paths[0])).toEqual(['[TEST] RENAME_1']);
    });
});
