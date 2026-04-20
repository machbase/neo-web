import {
    convertPanelInfoToEditorConfig,
    mergeEditorConfigIntoPanelInfo,
} from './PanelEditorConfigConverter';
import { createTagAnalyzerPanelInfoFixture } from '../TestData/PanelTestData';
import { normalizeLegacyTimeRangeBoundary } from '../utils/legacy/LegacyTimeAdapter';

/**
 * Builds one normalized editor time config for test data.
 * Intent: Keep the test fixtures focused on converter behavior instead of boundary parsing setup.
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

describe('PanelEditorConfigConverter', () => {
    describe('convertPanelInfoToEditorConfig', () => {
        it('maps the nested panel info into editor sections', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture(undefined);

            expect(convertPanelInfoToEditorConfig(panelInfo)).toEqual({
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

    describe('mergeEditorConfigIntoPanelInfo', () => {
        it('merges editor changes back into panel info and normalizes draft numbers', () => {
            const panelInfo = createTagAnalyzerPanelInfoFixture(undefined);

            const merged = mergeEditorConfigIntoPanelInfo(panelInfo, {
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
                    ...convertPanelInfoToEditorConfig(panelInfo).axes,
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
});
