import {
    TAZ_FORMAT_VERSION,
    TazVersion,
    normalizePersistedTazVersion,
} from '../TazVersion';

describe('normalizePersistedTazVersion', () => {
    it('treats missing or empty version as legacy', () => {
        expect(normalizePersistedTazVersion(undefined)).toBe(TazVersion.Legacy);
        expect(normalizePersistedTazVersion(null)).toBe(TazVersion.Legacy);
        expect(normalizePersistedTazVersion('')).toBe(TazVersion.Legacy);
        expect(normalizePersistedTazVersion('   ')).toBe(TazVersion.Legacy);
    });

    it('returns supported versions as TazVersion values', () => {
        expect(normalizePersistedTazVersion('2.0.1')).toBe(TazVersion.V201);
        expect(normalizePersistedTazVersion(TAZ_FORMAT_VERSION)).toBe(TazVersion.V210);
    });

    it('throws for unsupported versions', () => {
        expect(() => normalizePersistedTazVersion('3.0.0')).toThrow(
            'Unsupported TagAnalyzer .taz version:',
        );
    });
});