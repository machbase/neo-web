import { TAG_ANALYZER_MAX_JSON_KEY_TEXT, jsonKeyPathLabel, jsonKeyPathToSql, jsonKeyTypeLabel, toTagAnalyzerJsonKeyPath } from './jsonKeyCatalog';

describe('jsonKeyTypeLabel', () => {
    it.each([
        ['n', 'NUMBER'],
        ['s', 'STRING'],
        ['b', 'BOOLEAN'],
    ])('labels %p as %p', (type, label) => {
        expect(jsonKeyTypeLabel(type)).toBe(label);
    });

    // Null or a nested value has nothing worth announcing, and an empty label renders as no badge.
    it('says nothing for a type it cannot name', () => {
        expect(jsonKeyTypeLabel('x')).toBe('');
        expect(jsonKeyTypeLabel(undefined)).toBe('');
    });
});

describe('jsonKeyPathLabel', () => {
    it('shows a plain key as itself and joins a nested path', () => {
        expect(jsonKeyPathLabel('[temp]')).toBe('temp');
        expect(jsonKeyPathLabel('[pos][x]')).toBe('pos.x');
    });

    // An OPC UA node may be called `[TEST] RENAME_1`. The old segment regex stopped at the first
    // `]`, so every such key rendered as `[TEST` and a dozen distinct keys looked identical.
    it('recovers a key that contains brackets of its own', () => {
        expect(jsonKeyPathLabel("['[TEST] RENAME_1']")).toBe('[TEST] RENAME_1');
        const labels = ["['[TEST] RENAME_1']", "['[TEST] RENAME_2']"].map(jsonKeyPathLabel);
        expect(new Set(labels).size).toBe(2);
    });

    it('returns nothing for an empty path', () => {
        expect(jsonKeyPathLabel('  ')).toBe('');
    });
});

describe('jsonKeyPathToSql', () => {
    // One spelling for both the query and the handoff. A key needing no quoting keeps its historical
    // form, so paths already stored in a .taz or .dsh are untouched.
    it('keeps a plain key plain and quotes only what needs it', () => {
        expect(jsonKeyPathToSql('[temp]')).toBe('$[temp]');
        expect(jsonKeyPathToSql('[pos][x]')).toBe('$[pos][x]');
        expect(jsonKeyPathToSql("['[TEST] RENAME_1']")).toBe("$['[TEST] RENAME_1']");
    });

    it('returns nothing for an empty path', () => {
        expect(jsonKeyPathToSql('')).toBe('');
    });
});

describe('toTagAnalyzerJsonKeyPath', () => {
    // Bracket, not dotted: `$[a.b]` addresses a literal key named `a.b` while `$.a.b` walks two
    // levels, and OPC UA node names routinely contain dots.
    it('hands over the same form the query uses', () => {
        expect(toTagAnalyzerJsonKeyPath('[Plant1.Line1.Temperature]')).toEqual({ ok: true, path: '[Plant1.Line1.Temperature]' });
        expect(toTagAnalyzerJsonKeyPath("['[TEST] RENAME_1']")).toEqual({ ok: true, path: "['[TEST] RENAME_1']" });
    });

    it('refuses a key too long for the handoff field, and an empty one', () => {
        expect(toTagAnalyzerJsonKeyPath(`[${'k'.repeat(TAG_ANALYZER_MAX_JSON_KEY_TEXT)}]`)).toMatchObject({ ok: false });
        expect(toTagAnalyzerJsonKeyPath('')).toMatchObject({ ok: false });
    });
});

