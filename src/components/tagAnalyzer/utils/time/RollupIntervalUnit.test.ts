import { normalizeRollupIntervalUnit } from './RollupIntervalUnit';

describe('RollupIntervalUnit', () => {
    it('normalizes supported rollup interval units', () => {
        expect(normalizeRollupIntervalUnit('sec')).toBe('SEC');
        expect(normalizeRollupIntervalUnit('min')).toBe('MIN');
        expect(normalizeRollupIntervalUnit('hour')).toBe('HOUR');
        expect(normalizeRollupIntervalUnit('day')).toBe('DAY');
    });

    it('uppercases unsupported interval units as-is', () => {
        expect(normalizeRollupIntervalUnit('week')).toBe('WEEK');
    });
});
