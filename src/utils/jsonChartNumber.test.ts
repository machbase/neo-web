import { jsonChartNumber } from './jsonChartNumber';

describe('JSON chart numbers', () => {
    it.each([
        ['23.5', 23.5], ['  +2  ', 2], ['.5', 0.5], ['1.', 1], ['1e3', 1000],
        ['0x10', 16], ['-0X10', -16], ['0x1.2p3', 9], ['0x.8p2', 2],
    ])('accepts Machbase numeric text %s', (raw, expected) => {
        expect(jsonChartNumber(raw)).toBe(expected);
    });

    it.each(['0b10', '0o10', '', '  ', '1_000', '1e', '0xFG', 'Infinity', 'NaN', '1e309'])
    ('rejects unsupported or non-finite text %s', (raw) => {
        expect(jsonChartNumber(raw)).toBeNull();
    });

    it('never treats a boolean or null as a number', () => {
        expect(jsonChartNumber(true)).toBeNull();
        expect(jsonChartNumber(null)).toBeNull();
        expect(jsonChartNumber(42)).toBe(42);
    });
});
