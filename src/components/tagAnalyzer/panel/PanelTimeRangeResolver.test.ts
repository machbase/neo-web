import {
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import { isSameTimeRange } from '../domain/time/TimeRangeUtils';
import { parseTimeRangeConfigFromBoundaryValues } from '../domain/time/TimeBoundaryParser';
import {
    createTagAnalyzerPanelDataFixture,
} from '../TestData/PanelTestData';

describe('PanelTimeRangeResolver', () => {
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

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('isSameTimeRange', () => {
        it('returns true only when both bounds match exactly', () => {
            expect(
                isSameTimeRange(
                    { startTime: 10, endTime: 20 },
                    { startTime: 10, endTime: 20 },
                ),
            ).toBe(true);
            expect(
                isSameTimeRange(
                    { startTime: 10, endTime: 20 },
                    { startTime: 10, endTime: 21 },
                ),
            ).toBe(false);
        });
    });

    describe('resolvePanelTimeRange initialize mode', () => {
        it('keeps a concrete panel range instead of shrinking to a board relative range', async () => {
            const sResolvedRange = await resolvePanelTimeRange(
                parseTimeRangeConfigFromBoundaryValues('last-1h', 'last'),
                createTagAnalyzerPanelDataFixture(undefined),
                {
                    rangeConfig: parseTimeRangeConfigFromBoundaryValues(100, 400),
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                },
                createFetchedTimeBoundaryRange(100, 100, 400, 400),
                'initialize',
            );

            expect(sResolvedRange).toEqual({
                startTime: 100,
                endTime: 400,
            });
        });
    });

    describe('resolvePanelTimeRange reset mode', () => {
        it('falls back to fetched time boundaries when persisted ranges are empty', async () => {
            const sResolvedRange = await resolvePanelTimeRange(
                parseTimeRangeConfigFromBoundaryValues('', ''),
                createTagAnalyzerPanelDataFixture(undefined),
                {
                    rangeConfig: parseTimeRangeConfigFromBoundaryValues('', ''),
                    useTimeKeeper: false,
                    timeKeeper: undefined,
                },
                createFetchedTimeBoundaryRange(100, 200, 250, 400),
                'reset',
            );

            expect(sResolvedRange).toEqual({
                startTime: 100,
                endTime: 400,
            });
        });
    });
});

