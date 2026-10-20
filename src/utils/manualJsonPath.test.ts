import { parseManualJsonPath } from './manualJsonPath';
import { displayJsonPathLabel, getJsonPathSegments, jsonPathSegment, jsonPathToSqlPath, normalizeJsonPath } from './dashboardJsonValue';

describe('manual JSON paths', () => {
    test.each([
        'Device 1', 'sensor:temperature', '123abc', ' leading ', '한글키', '温度', 'e\u0301',
        'sensor*', '?(@.value)', '@value', 'value()', 'a.b', 'a[b]', 'a\\b', 'a\\\\b',
        "a'b", 'a"b', String.raw`a\'"b`, String.raw`a\'"b:*?@([`, '\nvalue',
    ])('keeps input, display, and re-entry equivalent for literal key %s', key => {
        const input = `['${key.replace(/'/g, "''")}'].temperature`;
        const original = parseManualJsonPath(input);
        const displayed = displayJsonPathLabel(original.path);
        const reparsed = parseManualJsonPath(displayed);
        expect(reparsed.path).toBe(original.path);
        expect(reparsed.segments).toEqual(original.segments);
        expect(normalizeJsonPath(displayed)).toBe(original.path);
        expect(jsonPathToSqlPath(reparsed.path)).toBe(jsonPathToSqlPath(original.path));
    });

    test.each(['a\\b', 'a\\\\b', 'a\\', 'a\\\\', "a\\'b", 'a\\"b', 'a\\]b'])('preserves literal backslashes in displayed key %s', key => {
        const path = `[device]${jsonPathSegment(key)}`;
        const parsed = parseManualJsonPath(displayJsonPathLabel(path));
        expect(parsed.path).toBe(path);
        expect(parsed.segments).toEqual([{ kind: 'key', value: 'device' }, { kind: 'key', value: key }]);
        expect(getJsonPathSegments(parsed.path)).toEqual(['device', key]);
        expect(jsonPathToSqlPath(parsed.path)).toBe(`$${path}`);
    });
    test.each([String.raw`a\'"b`, String.raw`a\\'"b`, "a'\"b\\", String.raw`a'"b\\`])('preserves displayed mixed-quote key %s', key => {
        const path = `[device]${jsonPathSegment(key)}`;
        const parsed = parseManualJsonPath(displayJsonPathLabel(path));
        expect(parsed.path).toBe(path);
        expect(parsed.segments).toEqual([{ kind: 'key', value: 'device' }, { kind: 'key', value: key }]);
        expect(getJsonPathSegments(parsed.path)).toEqual(['device', key]);
        expect(jsonPathToSqlPath(parsed.path)).toBe(`$${path}`);
    });
    it('keeps one and two backslashes distinct in mixed-quote keys', () => {
        const paths = [String.raw`a\'"b`, String.raw`a\\'"b`].map(key => parseManualJsonPath(jsonPathSegment(key)).path);
        expect(new Set(paths).size).toBe(2);
    });
    test.each([String.raw`[device][\*]`, String.raw`[device][\?(@.value)]`, String.raw`[device][a\:b]`])('does not treat backslashes as JSONPath escapes in %s', input => {
        expect(() => parseManualJsonPath(input)).toThrow();
    });
    it('keeps one and two backslashes as different keys', () => {
        const paths = ['a\\b', 'a\\\\b'].map(key => parseManualJsonPath(jsonPathSegment(key)).path);
        expect(new Set(paths).size).toBe(2);
    });
    test.each([
        ['device.value', '[device][value]'],
        ['[device][a.b]', '[device][a.b]'],
        ['$[device][a.b]', '[device][a.b]'],
        ['$.device.value', '[device][value]'],
        ['channels[0].value', '[channels][0][value]'],
        ["device['a.b']", '[device][a.b]'],
        ["['device.temperature']", '[device.temperature]'],
        ['[0].value', '[0][value]'],
        ["device[\"a'b\"]", '[device]["a\'b"]'],
    ])('parses complete input %s', (input, path) => {
        expect(parseManualJsonPath(input).path).toBe(path);
        expect(normalizeJsonPath(path)).toBe(path);
    });
    test.each(['', '$', '$.', 'device..value', 'device.', '.device', 'device[01]', 'device[-1]', 'device[*]', 'device[0]junk', 'device[', "device['a']oops", "device['']", "device['0']", 'device[9007199254740992]', 'device value', '[device][a.b]junk', '[device][?(@.value)]'])('rejects %s', input => {
        expect(() => parseManualJsonPath(input)).toThrow();
    });
    it('keeps typed segments before storage', () => {
        expect(parseManualJsonPath("device[0]['a.b']").segments).toEqual([{kind:'key', value:'device'}, {kind:'index', value:0}, {kind:'key', value:'a.b'}]);
    });
});
