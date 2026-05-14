import { parseTimeRangeConfigFromBoundaryValues } from './TimeBoundaryParser';
import {
    createTimeBoundaryFallbackRange,
    resolveAbsoluteTimeRangeConfig,
    resolveConcreteRangeFallback,
    resolveConcreteTimeRangeConfigOrEmpty,
    resolveLastTimeRangeConfig,
    resolveNowTimeRangeConfigFromSource,
} from './TimeRangeResolution';

function createFetchedTimeBoundaryRange(
    startMin: number,
    startMax: number,
    endMin: number,
    endMax: number,
) {
    return {
        start: {
            min: { kind: 'absolute' as const, timestamp: startMin },
            max: { kind: 'absolute' as const, timestamp: startMax },
        },
        end: {
            min: { kind: 'absolute' as const, timestamp: endMin },
            max: { kind: 'absolute' as const, timestamp: endMax },
        },
    };
}

describe('TimeRangeResolution', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('resolves concrete configs and rejects empty or last configs to the empty range', () => {
        expect(resolveConcreteTimeRangeConfigOrEmpty(
            parseTimeRangeConfigFromBoundaryValues(100, 200),
        )).toEqual({ startTime: 100, endTime: 200 });
        expect(resolveConcreteTimeRangeConfigOrEmpty(
            parseTimeRangeConfigFromBoundaryValues('', ''),
        )).toEqual({ startTime: 0, endTime: 0 });
        expect(resolveConcreteTimeRangeConfigOrEmpty(
            parseTimeRangeConfigFromBoundaryValues('last-1h', 'last'),
        )).toEqual({ startTime: 0, endTime: 0 });
    });

    it('resolves last-relative configs against fetched boundary ranges', () => {
        expect(resolveLastTimeRangeConfig(
            parseTimeRangeConfigFromBoundaryValues('last-2h', 'last-1h'),
            createFetchedTimeBoundaryRange(0, 0, 1_000_000, 1_000_000),
        )).toEqual({
            startTime: 1_000_000 - 2 * 60 * 60 * 1000,
            endTime: 1_000_000 - 60 * 60 * 1000,
        });
        expect(resolveLastTimeRangeConfig(
            parseTimeRangeConfigFromBoundaryValues(100, 200),
            createFetchedTimeBoundaryRange(0, 0, 1_000_000, 1_000_000),
        )).toBeUndefined();
    });

    it('resolves absolute and now-relative configs without panel orchestration', () => {
        expect(resolveAbsoluteTimeRangeConfig(
            parseTimeRangeConfigFromBoundaryValues(100, 200),
        )).toEqual({ startTime: 100, endTime: 200 });
        expect(resolveAbsoluteTimeRangeConfig(
            parseTimeRangeConfigFromBoundaryValues('now-1h', 'now'),
        )).toBeUndefined();
        expect(resolveNowTimeRangeConfigFromSource(
            { rangeConfig: parseTimeRangeConfigFromBoundaryValues('now-1h', 'now') },
            undefined,
        )).toEqual({
            startTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
            endTime: new Date('2026-04-07T00:00:00.000Z').getTime(),
        });
    });

    it('falls back from empty concrete ranges to valid fetched boundaries', () => {
        const sBoundaryRange = createFetchedTimeBoundaryRange(100, 200, 300, 400);

        expect(createTimeBoundaryFallbackRange(sBoundaryRange)).toEqual({
            startTime: 100,
            endTime: 400,
        });
        expect(resolveConcreteRangeFallback(
            { startTime: 0, endTime: 0 },
            sBoundaryRange,
        )).toEqual({
            startTime: 100,
            endTime: 400,
        });
        expect(resolveConcreteRangeFallback(
            { startTime: 10, endTime: 20 },
            sBoundaryRange,
        )).toEqual({
            startTime: 10,
            endTime: 20,
        });
    });
});
