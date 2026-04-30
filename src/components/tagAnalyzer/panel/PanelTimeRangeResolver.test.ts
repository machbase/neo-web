import {
    isSameTimeRange,
    resolvePanelTimeRange,
} from './PanelTimeRangeResolver';
import { parseTimeRangeConfigFromBoundaryValues } from './editor/EditorTimeBoundaryParser';
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
                false,
                'reset',
            );

            expect(sResolvedRange).toEqual({
                startTime: 100,
                endTime: 400,
            });
        });
    });
});

