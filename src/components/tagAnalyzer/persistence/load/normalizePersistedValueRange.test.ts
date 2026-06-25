import { normalizePersistedValueRange } from './normalizePersistedValueRange';

describe('normalizePersistedValueRange', () => {
    it('converts legacy 0/0 range sentinel to auto range', () => {
        expect(normalizePersistedValueRange({ min: 0, max: 0 })).toEqual({
            min: undefined,
            max: undefined,
        });
    });

    it('keeps current auto range as undefined min/max', () => {
        expect(normalizePersistedValueRange({})).toEqual({
            min: undefined,
            max: undefined,
        });
    });

    it('keeps valid concrete ranges', () => {
        expect(normalizePersistedValueRange({ min: -10, max: 10 })).toEqual({
            min: -10,
            max: 10,
        });
    });

    it('rejects partial, inverted, and non-finite ranges', () => {
        expect(normalizePersistedValueRange({ min: 1 })).toBeUndefined();
        expect(normalizePersistedValueRange({ min: 10, max: 1 })).toBeUndefined();
        expect(normalizePersistedValueRange({ min: 1, max: Number.NaN })).toBeUndefined();
    });
});