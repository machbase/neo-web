import {
    canResolveTimeStringToTimestamp,
    resolveBoardTimeRangeInput,
    resolveTimeStringToTimestamp,
} from './TimeRangeInputResolver';

const HOUR_MS = 60 * 60 * 1000;

describe('resolveTimeStringToTimestamp', () => {
    const anchors = { currentTime: 1_000_000, lastDataTime: 500_000 };

    it('resolves "now" to the current time', () => {
        expect(resolveTimeStringToTimestamp('now', anchors)).toBe(1_000_000);
    });

    it('resolves "now-1h" relative to the current time', () => {
        expect(resolveTimeStringToTimestamp('now-1h', anchors)).toBe(
            1_000_000 - HOUR_MS,
        );
    });

    it('resolves "last" to the data anchor', () => {
        expect(resolveTimeStringToTimestamp('last', anchors)).toBe(500_000);
    });

    it('resolves "last-5s" relative to the data anchor', () => {
        expect(resolveTimeStringToTimestamp('last-5s', anchors)).toBe(
            500_000 - 5_000,
        );
    });

    it('resolves an absolute datetime expression', () => {
        expect(
            resolveTimeStringToTimestamp('2024-01-01 00:00:00', anchors),
        ).toBe(new Date(2024, 0, 1, 0, 0, 0).getTime());
    });

    it('reports whether a single time expression can resolve', () => {
        expect(canResolveTimeStringToTimestamp('now-5m', anchors)).toBe(true);
        expect(canResolveTimeStringToTimestamp('not a time', anchors)).toBe(false);
    });

    it('throws on an empty expression', () => {
        expect(() => resolveTimeStringToTimestamp('', anchors)).toThrow();
    });

    it('throws on "last" without a data anchor', () => {
        expect(() =>
            resolveTimeStringToTimestamp('last-1h', {
                currentTime: 1_000_000,
                lastDataTime: undefined,
            }),
        ).toThrow();
    });

    it('throws on an unparseable expression', () => {
        expect(() => resolveTimeStringToTimestamp('not a time', anchors)).toThrow();
    });
});

describe('resolveBoardTimeRangeInput', () => {
    it('resolves a now-relative range to concrete milliseconds', () => {
        expect(
            resolveBoardTimeRangeInput(
                { start: 'now-1h', end: 'now' },
                { currentTime: 1_000_000 },
            ),
        ).toEqual({ startTime: 1_000_000 - HOUR_MS, endTime: 1_000_000 });
    });

    it('returns undefined when either side is empty', () => {
        expect(
            resolveBoardTimeRangeInput({ start: '', end: '' }, { currentTime: 1_000_000 }),
        ).toBeUndefined();
        expect(
            resolveBoardTimeRangeInput({ start: '', end: 'now' }, { currentTime: 1_000_000 }),
        ).toBeUndefined();
    });

    it('returns undefined when the resolved range is inverted', () => {
        expect(
            resolveBoardTimeRangeInput(
                { start: 'now', end: 'now-1h' },
                { currentTime: 1_000_000 },
            ),
        ).toBeUndefined();
    });
});
