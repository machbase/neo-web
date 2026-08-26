import { jsonKeyPathLabel, jsonKeyPathToSql } from '@/utils/jsonKeyCatalog';
import {
    buildJsonKeyTree,
    filterJsonKeyTree,
    jsonKeyDocumentHasKeys,
    jsonKeyTreeLeafPaths,
    jsonKeyTreeLeavesUnder,
    jsonKeyTreeSeriesCount,
    parseJsonKeyDocument,
    shortJsonKeyNames,
    visibleJsonKeyTree,
} from './jsonKeyTree';

const doc = {
    temp: 1,
    on: true,
    note: 'x',
    pos: { y: 2, z: { deep: 3 } },
    readings: [10, 20],
};

describe('parseJsonKeyDocument', () => {
    // Machbase returns a JSON column as text, but a row that came through a JSON transport may
    // already be parsed. The caller should not have to know which.
    it('accepts text and an already-parsed object alike', () => {
        expect(parseJsonKeyDocument('{"a":1}')).toEqual({ a: 1 });
        expect(parseJsonKeyDocument({ a: 1 })).toEqual({ a: 1 });
    });

    it('returns nothing for a value that is not a document', () => {
        expect(parseJsonKeyDocument('not json')).toBeUndefined();
        expect(parseJsonKeyDocument(42)).toBeUndefined();
    });
});

describe('buildJsonKeyTree', () => {
    const nodes = buildJsonKeyTree(doc);

    it('lists every leaf, in document order, with the type it holds', () => {
        expect(nodes.filter((node) => node.leaf).map((node) => [node.label, node.dataType])).toEqual([
            ['temp', 'NUMBER'],
            ['on', 'BOOLEAN'],
            ['note', 'STRING'],
            ['y', 'NUMBER'],
            ['deep', 'NUMBER'],
            ['0', 'NUMBER'],
            ['1', 'NUMBER'],
        ]);
    });

    // Depth is not a limit: a key three levels down is as selectable as one at the top.
    it('reaches keys at any depth', () => {
        const deep = nodes.find((node) => node.label === 'deep');
        expect(deep).toMatchObject({ path: '[pos][z][deep]', depth: 2, leaf: true });
        expect(jsonKeyPathToSql(deep!.path)).toBe('$[pos][z][deep]');
    });

    // The tree is parsed from the row the user opened, so every position in it is a real path.
    it('walks into arrays, addressing elements by position', () => {
        expect(nodes.filter((node) => node.path.startsWith('[readings]') && node.leaf).map((node) => node.path)).toEqual([
            '[readings][0]',
            '[readings][1]',
        ]);
    });

    // A container is not a series — putting one on a value axis has no meaning — so containers are
    // present for structure but never selectable.
    it('marks containers as non-leaves and counts their children', () => {
        expect(nodes.find((node) => node.label === 'pos')).toMatchObject({ leaf: false, childCount: 2 });
        expect(nodes.find((node) => node.label === 'readings')).toMatchObject({ leaf: false, childCount: 2 });
    });

    // The key can contain the very characters the path syntax uses; quoting is what keeps it
    // addressable, and the label has to come back out whole.
    it('quotes a key that carries bracket syntax, and reads it back', () => {
        const [node] = buildJsonKeyTree({ '[TEST] RENAME_1': 1 });
        expect(node.path).toBe("['[TEST] RENAME_1']");
        expect(jsonKeyPathLabel(node.path)).toBe('[TEST] RENAME_1');
    });

    // An array of objects is the case that decides this: leaving the array whole would put every
    // field inside it out of reach.
    it('reaches fields of objects nested inside an array', () => {
        const nested = buildJsonKeyTree({ items: [{ a: 1 }, { a: 2 }] });
        expect(nested.filter((node) => node.leaf).map((node) => node.path)).toEqual(['[items][0][a]', '[items][1][a]']);
    });

    it('returns nothing for a value that is not a document', () => {
        expect(buildJsonKeyTree('not json')).toEqual([]);
        expect(buildJsonKeyTree(null)).toEqual([]);
    });
});

describe('a document that is a bare value', () => {
    // JSON allows a scalar at the top, and Machbase is happy to store one. There is no key in it,
    // but the value is on the tag and reads over time like any other series — so the document
    // itself is what is on offer, under an empty path.
    it('offers itself as one series, named after the value column', () => {
        expect(buildJsonKeyTree('123', 'VALUE')).toEqual([
            expect.objectContaining({ path: '', label: 'VALUE', dotted: 'VALUE', leaf: true, dataType: 'NUMBER', numeric: true, preview: '123' }),
        ]);
    });

    it('does the same for text and for a boolean', () => {
        expect(buildJsonKeyTree('"RUNNING"')[0]).toMatchObject({ path: '', dataType: 'STRING', numeric: false });
        expect(buildJsonKeyTree('true')[0]).toMatchObject({ path: '', dataType: 'BOOLEAN' });
    });

    // `null` is a document too, but not one anybody can read as a series.
    it('offers nothing for null, or for text that is not JSON at all', () => {
        expect(jsonKeyDocumentHasKeys('null')).toBe(false);
        expect(jsonKeyDocumentHasKeys('not json')).toBe(false);
        expect(jsonKeyDocumentHasKeys('123')).toBe(true);
        expect(jsonKeyDocumentHasKeys('{"a":1}')).toBe(true);
    });

    it('is pickable on its own — the empty path is a leaf, not a prefix of everything', () => {
        const nodes = buildJsonKeyTree('123', 'VALUE');
        expect(jsonKeyTreeLeavesUnder(nodes, '')).toEqual(['']);
        expect(jsonKeyTreeSeriesCount(nodes, [''])).toBe(1);
    });
});

describe('jsonKeyTreeLeafPaths', () => {
    it('collects only what can be selected', () => {
        expect(jsonKeyTreeLeafPaths(buildJsonKeyTree({ a: 1, b: { c: 2 } }))).toEqual(['[a]', '[b][c]']);
    });
});

describe('filterJsonKeyTree', () => {
    const nodes = buildJsonKeyTree(doc);

    it('returns everything for an empty filter', () => {
        expect(filterJsonKeyTree(nodes, '  ')).toBe(nodes);
    });

    // Filtering flattens: the match alone is returned, and the caller writes its path ahead of it
    // rather than rendering every ancestor and pushing the matches off the first screen.
    it('returns the match without its ancestors', () => {
        expect(filterJsonKeyTree(nodes, 'deep').map((node) => node.path)).toEqual(['[pos][z][deep]']);
    });

    // A filter typed the way people say a path has to find it, or the dotted display is a lie.
    it('matches on the dotted path as well as the key', () => {
        expect(filterJsonKeyTree(nodes, 'pos.z').map((node) => node.path)).toEqual(['[pos][z][deep]']);
    });

    // A branch matches whenever anything above it does, so a deep document would answer one term
    // with its whole chain — and not one of those rows holds a value.
    it('returns only the keys that hold a value', () => {
        const deep = buildJsonKeyTree({ d1: { d2: { d3: { leaf: 1 } } } });
        expect(filterJsonKeyTree(deep, 'd2').map((node) => node.path)).toEqual(['[d1][d2][d3][leaf]']);
    });

    it('drops everything when nothing matches', () => {
        expect(filterJsonKeyTree(nodes, 'zzz')).toEqual([]);
    });
});

describe('visibleJsonKeyTree', () => {
    const nodes = buildJsonKeyTree(doc);

    it('returns everything when nothing is collapsed', () => {
        expect(visibleJsonKeyTree(nodes, new Set())).toBe(nodes);
    });

    // The collapsed node itself stays, or there would be nothing left to reopen it with.
    it('hides a collapsed node’s descendants but keeps the node', () => {
        const visible = visibleJsonKeyTree(nodes, new Set(['[pos]'])).map((node) => node.path);
        expect(visible).toContain('[pos]');
        expect(visible).not.toContain('[pos][y]');
        expect(visible).not.toContain('[pos][z][deep]');
        expect(visible).toContain('[temp]');
    });
});

describe('node previews', () => {
    const nodes = buildJsonKeyTree(doc);

    // A branch says what it holds in the row, so its size is known without opening it.
    it('summarises a branch by kind and child count', () => {
        expect(nodes.find((node) => node.label === 'pos')?.preview).toBe('object · 2');
        expect(nodes.find((node) => node.label === 'readings')?.preview).toBe('array · 2');
    });

    it('shows a leaf as its own value', () => {
        expect(nodes.find((node) => node.label === 'note')?.preview).toBe('x');
        expect(nodes.find((node) => node.label === 'on')?.preview).toBe('true');
    });

    // Both paths are carried so neither reader has to re-parse the other's.
    it('carries the dotted path and its parent', () => {
        expect(nodes.find((node) => node.label === 'deep')).toMatchObject({ dotted: 'pos.z.deep', parentDotted: 'pos.z' });
        expect(nodes.find((node) => node.label === 'temp')).toMatchObject({ dotted: 'temp', parentDotted: '' });
    });
});

describe('chartable leaves', () => {
    // The gate has to predict what the chart will do, not what the document declares: a payload
    // writing its readings as text is still perfectly drawable, and refusing it would leave such a
    // table permanently unchartable.
    it('counts a numeric string as chartable while still calling it a string', () => {
        const [node] = buildJsonKeyTree({ temp: '23.5' });
        expect(node).toMatchObject({ dataType: 'STRING', numeric: true });
    });

    it('does not count text that is not a number', () => {
        const [node] = buildJsonKeyTree({ state: 'RUNNING' });
        expect(node).toMatchObject({ dataType: 'STRING', numeric: false });
    });

    it('reports only the picked leaves the chart can draw', () => {
        const nodes = buildJsonKeyTree({ a: 1, b: 'text', c: 2 });
        expect(jsonKeyTreeSeriesCount(nodes, ['[a]', '[b]', '[c]'])).toBe(2);
    });

    it('counts nothing when nothing is picked', () => {
        expect(jsonKeyTreeSeriesCount(buildJsonKeyTree(doc), [])).toBe(0);
    });
});

describe('shortJsonKeyNames', () => {
    // Two branches ending in the same key would put two identical entries in the legend.
    it('grows a colliding name leftwards until the set is unique', () => {
        expect(shortJsonKeyNames(['sensor.temperature.value', 'sensor.humidity.value'])).toEqual([
            'temperature.value',
            'humidity.value',
        ]);
    });

    // A name that never collided stays short — length is a cost paid only where it buys something.
    it('leaves names that do not collide alone', () => {
        expect(shortJsonKeyNames(['sensor.temperature', 'status'])).toEqual(['temperature', 'status']);
    });

    it('stops growing at the full path rather than looping', () => {
        expect(shortJsonKeyNames(['a.b', 'a.b'])).toEqual(['a.b', 'a.b']);
    });
});
