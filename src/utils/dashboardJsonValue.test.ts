import {
    displayJsonPathLabel,
    extractJsonPathsFromSamples,
    formatJsonValueField,
    jsonPathInputToStoredPath,
    jsonValueFieldToSql,
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

    test('displays JSON paths without bracket syntax', () => {
        expect(displayJsonPathLabel('[a.b.c]')).toBe('a.b.c');
        expect(displayJsonPathLabel('[a][b][c]')).toBe('a > b > c');
        expect(displayJsonPathLabel('metrics.temperature')).toBe('metrics > temperature');
    });

    test('maps displayed JSON path labels back to stored bracket paths', () => {
        const paths = ['[a.b.c]', '[a][b][c]'];

        expect(jsonPathInputToStoredPath('a.b.c', paths)).toBe('[a.b.c]');
        expect(jsonPathInputToStoredPath('a > b > c', paths)).toBe('[a][b][c]');
        expect(jsonPathInputToStoredPath('metrics.temperature', paths)).toBe('[metrics][temperature]');
    });
});
