import {
    createPanelEditorConfig,
    mergePanelEditorConfig,
    resolveEditorTimeBounds,
} from './PanelEditorUtils';
import { createTagAnalyzerPanelInfoFixture } from '../TestData/PanelTestData';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyUtils';

jest.mock('@/utils/bgnEndTimeRange', () => ({
    subtractTime: jest.fn(),
}));

jest.mock('../TagAnalyzerUtilCaller', () => ({
    resolveTagAnalyzerBgnEndTimeRange: jest.fn(),
}));

jest.mock('../utils/TagAnalyzerDateUtils', () => ({
    ...jest.requireActual('../utils/TagAnalyzerDateUtils'),
    convertTimeToFullDate: jest.fn(),
}));

const { subtractTime } = jest.requireMock('@/utils/bgnEndTimeRange') as {
    subtractTime: jest.Mock;
};

const { resolveTagAnalyzerBgnEndTimeRange } = jest.requireMock('../TagAnalyzerUtilCaller') as {
    resolveTagAnalyzerBgnEndTimeRange: jest.Mock;
};

const { convertTimeToFullDate } = jest.requireMock('../utils/TagAnalyzerDateUtils') as {
    convertTimeToFullDate: jest.Mock;
};

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

    describe('createPanelEditorConfig', () => {
        it('maps the nested panel info into editor sections', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture(undefined);

            expect(createPanelEditorConfig(panelInfo)).toEqual({
                general: {
                    chart_title: 'Panel One',
                    use_zoom: false,
                    use_time_keeper: false,
                    time_keeper: panelInfo.time.time_keeper,
                },
                data: {
                    index_key: 'panel-1',
                    tag_set: panelInfo.data.tag_set,
                },
                axes: {
                    show_x_tickline: panelInfo.axes.show_x_tickline,
                    pixels_per_tick_raw: panelInfo.axes.pixels_per_tick_raw,
                    pixels_per_tick: panelInfo.axes.pixels_per_tick,
                    use_sampling: panelInfo.axes.use_sampling,
                    sampling_value: panelInfo.axes.sampling_value,
                    zero_base: panelInfo.axes.zero_base,
                    show_y_tickline: panelInfo.axes.show_y_tickline,
                    custom_min: panelInfo.axes.primaryRange.min,
                    custom_max: panelInfo.axes.primaryRange.max,
                    custom_drilldown_min: panelInfo.axes.primaryDrilldownRange.min,
                    custom_drilldown_max: panelInfo.axes.primaryDrilldownRange.max,
                    use_ucl: panelInfo.axes.use_ucl,
                    ucl_value: panelInfo.axes.ucl_value,
                    use_lcl: panelInfo.axes.use_lcl,
                    lcl_value: panelInfo.axes.lcl_value,
                    use_right_y2: panelInfo.axes.use_right_y2,
                    zero_base2: panelInfo.axes.zero_base2,
                    show_y_tickline2: panelInfo.axes.show_y_tickline2,
                    custom_min2: panelInfo.axes.secondaryRange.min,
                    custom_max2: panelInfo.axes.secondaryRange.max,
                    custom_drilldown_min2: panelInfo.axes.secondaryDrilldownRange.min,
                    custom_drilldown_max2: panelInfo.axes.secondaryDrilldownRange.max,
                    use_ucl2: panelInfo.axes.use_ucl2,
                    ucl2_value: panelInfo.axes.ucl2_value,
                    use_lcl2: panelInfo.axes.use_lcl2,
                    lcl2_value: panelInfo.axes.lcl2_value,
                },
                display: panelInfo.display,
                time: {
                    range_bgn: panelInfo.time.range_bgn,
                    range_end: panelInfo.time.range_end,
                    range_config: panelInfo.time.range_config,
                },
            });
        });
    });

    describe('mergePanelEditorConfig', () => {
        it('merges editor changes back into panel info and normalizes draft numbers', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture(undefined);

            const merged = mergePanelEditorConfig(panelInfo, {
                general: {
                    chart_title: 'Updated Title',
                    use_zoom: true,
                    use_time_keeper: true,
                    time_keeper: panelInfo.time.time_keeper,
                },
                data: {
                    index_key: 'panel-2',
                    tag_set: panelInfo.data.tag_set,
                },
                axes: {
                    ...createPanelEditorConfig(panelInfo).axes,
                    pixels_per_tick_raw: '',
                    pixels_per_tick: 25,
                    sampling_value: '',
                    custom_min: '',
                    custom_max: 55,
                    custom_drilldown_min: '',
                    custom_drilldown_max: 75,
                    ucl_value: '',
                    lcl_value: 95,
                    custom_min2: '',
                    custom_max2: 115,
                    custom_drilldown_min2: '',
                    custom_drilldown_max2: 135,
                    ucl2_value: '',
                    lcl2_value: 155,
                },
                display: {
                    ...panelInfo.display,
                    point_radius: '',
                    fill: 8,
                    stroke: '',
                },
                time: {
                    range_bgn: 1000,
                    range_end: 2000,
                    range_config: createEditorTimeConfig(1000, 2000).range_config,
                },
            });

            expect(merged.meta).toEqual({
                index_key: 'panel-2',
                chart_title: 'Updated Title',
            });
            expect(merged.time).toMatchObject({
                range_bgn: 1000,
                range_end: 2000,
                range_config: createEditorTimeConfig(1000, 2000).range_config,
                use_time_keeper: true,
            });
            expect(merged.axes).toMatchObject({
                pixels_per_tick_raw: 0,
                pixels_per_tick: 25,
                sampling_value: 0,
                primaryRange: { min: 0, max: 55 },
                primaryDrilldownRange: { min: 0, max: 75 },
                ucl_value: 0,
                lcl_value: 95,
                secondaryRange: { min: 0, max: 115 },
                secondaryDrilldownRange: { min: 0, max: 135 },
                ucl2_value: 0,
                lcl2_value: 155,
            });
            expect(merged.display).toMatchObject({
                use_zoom: true,
                point_radius: 0,
                fill: 8,
                stroke: 0,
            });
        });
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
        resolveTagAnalyzerBgnEndTimeRange.mockResolvedValue({
                bgn: { min: 0, max: 0 },
                end: { min: 10_000, max: 10_000 },
            });
            subtractTime.mockImplementation((aEndMax: number, aRange: string) => {
                return aRange === 'last-1h' ? aEndMax - 1000 : aEndMax - 500;
            });

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('last-1h', 'last-30m'),
                }),
            ).resolves.toEqual({
                startTime: 9_000,
                endTime: 9_500,
            });

        expect(resolveTagAnalyzerBgnEndTimeRange).toHaveBeenCalled();
            expect(subtractTime).toHaveBeenCalledWith(10_000, 'last-1h');
            expect(subtractTime).toHaveBeenCalledWith(10_000, 'last-30m');
        });

        it('resolves now-based ranges through convertTimeToFullDate', async () => {
            convertTimeToFullDate.mockReturnValueOnce(2_000).mockReturnValueOnce(3_000);

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('now-1h', 'now'),
                }),
            ).resolves.toEqual({
                startTime: 2_000,
                endTime: 3_000,
            });
        });

        it('resolves mixed-case now-based ranges through convertTimeToFullDate', async () => {
            convertTimeToFullDate.mockReturnValueOnce(4_000).mockReturnValueOnce(5_000);

            await expect(
                resolveEditorTimeBounds({
                    ...baseArgs,
                    timeConfig: createEditorTimeConfig('Now-1h', 'Now'),
                }),
            ).resolves.toEqual({
                startTime: 4_000,
                endTime: 5_000,
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
