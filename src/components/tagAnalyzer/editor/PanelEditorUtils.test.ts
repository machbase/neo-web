import { resolveEditorTimeBounds } from './PanelEditorUtils';
import { createTagAnalyzerPanelInfoFixture } from '../TestData/PanelTestData';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyTimeAdapter';

jest.mock('../utils/time/TimeBoundaryRangeResolver', () => ({
    ...jest.requireActual('../utils/time/TimeBoundaryRangeResolver'),
    resolveTimeBoundaryRanges: jest.fn(),
}));

const { resolveTimeBoundaryRanges } = jest.requireMock(
    '../utils/time/TimeBoundaryRangeResolver',
) as {
    resolveTimeBoundaryRanges: jest.Mock;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const RESOLVED_LAST_END_TIME = new Date('2026-04-07T02:00:00.000Z').getTime();

/**
 * Builds one normalized editor time config for test data.
 * Intent: Keep the resolver tests focused on range conversion behavior.
 * @param {string | number | ''} aStart The start boundary input.
 * @param {string | number | ''} aEnd The end boundary input.
 * @returns {{ range_bgn: number; range_end: number; range_config: ReturnType<typeof normalizeLegacyTimeRangeBoundary>['rangeConfig'] }}
 */
function createEditorTimeConfig(aStart: string | number | '', aEnd: string | number | '') {
    const sTimeRange = normalizeLegacyTimeRangeBoundary(aStart, aEnd);
    return {
        range_bgn: sTimeRange.range.min,
        range_end: sTimeRange.range.max,
        range_config: sTimeRange.rangeConfig,
    };
}

describe('PanelEditorUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    describe('resolveEditorTimeBounds', () => {
        const baseArgs = {
            tag_set: createTagAnalyzerPanelInfoFixture(undefined).data.tag_set,
            navigatorRange: {
                startTime: 1000,
                endTime: 2000,
            },
        };

        it('resolves last-based ranges through the fetched end bound', async () => {
            resolveTimeBoundaryRanges.mockResolvedValue({
                start: { min: 0, max: 0 },
                end: {
                    min: RESOLVED_LAST_END_TIME,
                    max: RESOLVED_LAST_END_TIME,
                },
            });

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('last-1h', 'last-30m'),
                }),
            ).resolves.toEqual({
                startTime: RESOLVED_LAST_END_TIME - HOUR_MS,
                endTime: RESOLVED_LAST_END_TIME - 30 * MINUTE_MS,
            });

            expect(resolveTimeBoundaryRanges).toHaveBeenCalled();
        });

        it('falls back to the navigator range when a last-based range cannot be resolved', async () => {
            resolveTimeBoundaryRanges.mockResolvedValue(undefined);

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('last-1h', 'last-30m'),
                }),
            ).resolves.toEqual({
                startTime: 1000,
                endTime: 2000,
            });
        });

        it('resolves now-based ranges through the normalized time boundaries', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('now-1h', 'now'),
                }),
            ).resolves.toEqual({
                startTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
                endTime: new Date('2026-04-07T00:00:00.000Z').getTime(),
            });
        });

        it('resolves mixed-case now-based ranges through the normalized time boundaries', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('Now-1h', 'Now'),
                }),
            ).resolves.toEqual({
                startTime: new Date('2026-04-06T23:00:00.000Z').getTime(),
                endTime: new Date('2026-04-07T00:00:00.000Z').getTime(),
            });
        });

        it('uses literal numeric ranges directly', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig(10, 20),
                }),
            ).resolves.toEqual({
                startTime: 10,
                endTime: 20,
            });
        });

        it('falls back to the navigator range when a numeric range is unresolved', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig(0, 0),
                }),
            ).resolves.toEqual({
                startTime: 1000,
                endTime: 2000,
            });
        });

        it('falls back to the navigator range when either side is empty', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('', ''),
                }),
            ).resolves.toEqual({
                startTime: 1000,
                endTime: 2000,
            });
        });

        it('uses the normalized numeric range for mixed legacy values after boundary conversion', async () => {
            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: {
                        range_bgn: 1_500,
                        range_end: 2_500,
                        range_config: normalizeLegacyTimeRangeBoundary(
                            '2026-04-01 12:00:00',
                            'now',
                        ).rangeConfig,
                    },
                }),
            ).resolves.toEqual({
                startTime: 1500,
                endTime: 2500,
            });
        });
    });
});
