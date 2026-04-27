import {
    convertPanelInfoToEditorConfig,
    mergeEditorConfigIntoPanelInfo,
} from './PanelEditorConfigConverter';
import { createTagAnalyzerPanelInfoFixture } from '../TestData/PanelTestData';
import { normalizeStoredTimeRangeBoundary } from '../utils/time/StoredTimeRangeAdapter';

/**
 * Builds one normalized editor time config for test data.
 * Intent: Keep the test fixtures focused on converter behavior instead of boundary parsing setup.
 * @param {string | number | ''} start The start boundary input.
 * @param {string | number | ''} end The end boundary input.
 * @returns {{ range_bgn: number; range_end: number; range_config: ReturnType<typeof normalizeStoredTimeRangeBoundary>['rangeConfig'] }}
 */
function createEditorTimeConfig(start: string | number | '', end: string | number | '') {
    const sTimeRange = normalizeStoredTimeRangeBoundary(start, end);
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
                    x_axis: {
                        show_tickline: panelInfo.axes.x_axis.show_tickline,
                        raw_data_pixels_per_tick:
                            panelInfo.axes.x_axis.raw_data_pixels_per_tick,
                        calculated_data_pixels_per_tick:
                            panelInfo.axes.x_axis.calculated_data_pixels_per_tick,
                    },
                    sampling: {
                        enabled: panelInfo.axes.sampling.enabled,
                        sample_count: panelInfo.axes.sampling.sample_count,
                    },
                    left_y_axis: {
                        zero_base: panelInfo.axes.left_y_axis.zero_base,
                        show_tickline: panelInfo.axes.left_y_axis.show_tickline,
                        value_range: panelInfo.axes.left_y_axis.value_range,
                        raw_data_value_range:
                            panelInfo.axes.left_y_axis.raw_data_value_range,
                        upper_control_limit:
                            panelInfo.axes.left_y_axis.upper_control_limit,
                        lower_control_limit:
                            panelInfo.axes.left_y_axis.lower_control_limit,
                    },
                    right_y_axis: {
                        enabled: panelInfo.axes.right_y_axis.enabled,
                        zero_base: panelInfo.axes.right_y_axis.zero_base,
                        show_tickline: panelInfo.axes.right_y_axis.show_tickline,
                        value_range: panelInfo.axes.right_y_axis.value_range,
                        raw_data_value_range:
                            panelInfo.axes.right_y_axis.raw_data_value_range,
                        upper_control_limit:
                            panelInfo.axes.right_y_axis.upper_control_limit,
                        lower_control_limit:
                            panelInfo.axes.right_y_axis.lower_control_limit,
                    },
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
                    x_axis: {
                        ...convertPanelInfoToEditorConfig(panelInfo).axes.x_axis,
                        raw_data_pixels_per_tick: '',
                        calculated_data_pixels_per_tick: 25,
                    },
                    sampling: {
                        ...convertPanelInfoToEditorConfig(panelInfo).axes.sampling,
                        sample_count: '',
                    },
                    left_y_axis: {
                        ...convertPanelInfoToEditorConfig(panelInfo).axes.left_y_axis,
                        value_range: {
                            min: '',
                            max: 55,
                        },
                        raw_data_value_range: {
                            min: '',
                            max: 75,
                        },
                        upper_control_limit: {
                            enabled: panelInfo.axes.left_y_axis.upper_control_limit.enabled,
                            value: '',
                        },
                        lower_control_limit: {
                            enabled: panelInfo.axes.left_y_axis.lower_control_limit.enabled,
                            value: 95,
                        },
                    },
                    right_y_axis: {
                        ...convertPanelInfoToEditorConfig(panelInfo).axes.right_y_axis,
                        value_range: {
                            min: '',
                            max: 115,
                        },
                        raw_data_value_range: {
                            min: '',
                            max: 135,
                        },
                        upper_control_limit: {
                            enabled:
                                panelInfo.axes.right_y_axis.upper_control_limit.enabled,
                            value: '',
                        },
                        lower_control_limit: {
                            enabled:
                                panelInfo.axes.right_y_axis.lower_control_limit.enabled,
                            value: 155,
                        },
                    },
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
                x_axis: {
                    raw_data_pixels_per_tick: 0,
                    calculated_data_pixels_per_tick: 25,
                },
                sampling: {
                    sample_count: 0,
                },
                left_y_axis: {
                    value_range: { min: 0, max: 55 },
                    raw_data_value_range: { min: 0, max: 75 },
                    upper_control_limit: { value: 0 },
                    lower_control_limit: { value: 95 },
                },
                right_y_axis: {
                    value_range: { min: 0, max: 115 },
                    raw_data_value_range: { min: 0, max: 135 },
                    upper_control_limit: { value: 0 },
                    lower_control_limit: { value: 155 },
                },
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

