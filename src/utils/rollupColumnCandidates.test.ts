import { getRollupColumnNameCandidates } from './rollupColumnCandidates';

describe('rollup column candidates for JSON paths', () => {
    test('uses only the base column for an explicit dotted JSON key', () => {
        expect(getRollupColumnNameCandidates('PAYLOAD', '[a.b.c]')).toEqual(['PAYLOAD']);
        expect(getRollupColumnNameCandidates('PAYLOAD->$[a.b.c]')).toEqual(['PAYLOAD']);
    });

    test('uses legacy dot rollup candidates for nested JSON paths', () => {
        expect(getRollupColumnNameCandidates('PAYLOAD', '[a][b][c]')).toEqual(['PAYLOAD->$a.b.c', 'PAYLOAD']);
        expect(getRollupColumnNameCandidates('PAYLOAD', 'a.b.c')).toEqual(['PAYLOAD->$a.b.c', 'PAYLOAD']);
    });

    test('uses only the base column for nested paths with dotted key segments', () => {
        expect(getRollupColumnNameCandidates('PAYLOAD', '[a.b][c]')).toEqual(['PAYLOAD']);
        expect(getRollupColumnNameCandidates('PAYLOAD', '[a][b.c]')).toEqual(['PAYLOAD']);
    });

    test('keeps single plain JSON keys compatible with existing rollups', () => {
        expect(getRollupColumnNameCandidates('PAYLOAD', '[temperature]')).toEqual(['PAYLOAD->$temperature', 'PAYLOAD']);
    });
});
