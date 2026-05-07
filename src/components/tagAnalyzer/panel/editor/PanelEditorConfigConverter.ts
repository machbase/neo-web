import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
} from '../../domain/PanelModel';
import { convertTimeRangeConfigToResolvedTimeRangeMs } from '../../time/TimeBoundaryConverters';
import type {
    PanelAxesDraft,
    PanelDisplayDraft,
    PanelEditorConfig,
} from './EditorTypes';

export function convertPanelInfoToEditorConfig(
    panelInfo: PanelInfo,
): PanelEditorConfig {
    const sResolvedPanelTimeRange = convertTimeRangeConfigToResolvedTimeRangeMs(panelInfo.time.rangeConfig);

    return {
        general: {
            chart_title: panelInfo.meta.chart_title,
            use_zoom: panelInfo.display.use_zoom,
            use_time_keeper: panelInfo.time.useTimeKeeper,
            time_keeper: panelInfo.time.timeKeeper,
        },
        data: {
            index_key: panelInfo.meta.index_key,
            tag_set: panelInfo.data.tag_set,
        },
        axes: {
            x_axis: {
                show_tickline: panelInfo.axes.x_axis.show_tickline,
                raw_data_pixels_per_tick: panelInfo.axes.x_axis.raw_data_pixels_per_tick,
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
                value_range: {
                    min: panelInfo.axes.left_y_axis.value_range.min,
                    max: panelInfo.axes.left_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: panelInfo.axes.left_y_axis.raw_data_value_range.min,
                    max: panelInfo.axes.left_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: panelInfo.axes.left_y_axis.upper_control_limit.enabled,
                    value: panelInfo.axes.left_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: panelInfo.axes.left_y_axis.lower_control_limit.enabled,
                    value: panelInfo.axes.left_y_axis.lower_control_limit.value,
                },
            },
            right_y_axis: {
                zero_base: panelInfo.axes.right_y_axis.zero_base,
                show_tickline: panelInfo.axes.right_y_axis.show_tickline,
                value_range: {
                    min: panelInfo.axes.right_y_axis.value_range.min,
                    max: panelInfo.axes.right_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: panelInfo.axes.right_y_axis.raw_data_value_range.min,
                    max: panelInfo.axes.right_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: panelInfo.axes.right_y_axis.upper_control_limit.enabled,
                    value: panelInfo.axes.right_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: panelInfo.axes.right_y_axis.lower_control_limit.enabled,
                    value: panelInfo.axes.right_y_axis.lower_control_limit.value,
                },
            },
            right_y_axis_enabled: panelInfo.axes.right_y_axis_enabled,
        },
        display: panelInfo.display,
        time: {
            range_bgn: sResolvedPanelTimeRange.startTime,
            range_end: sResolvedPanelTimeRange.endTime,
            range_config: panelInfo.time.rangeConfig,
        },
    };
}

export function mergeEditorConfigIntoPanelInfo(
    basePanelInfo: PanelInfo,
    editorConfig: PanelEditorConfig,
): PanelInfo {
    return {
        ...basePanelInfo,
        meta: {
            ...basePanelInfo.meta,
            index_key: editorConfig.data.index_key,
            chart_title: editorConfig.general.chart_title,
        },
        data: {
            ...basePanelInfo.data,
            tag_set: editorConfig.data.tag_set,
        },
        time: {
            ...basePanelInfo.time,
            rangeConfig: editorConfig.time.range_config,
            useTimeKeeper: editorConfig.general.use_time_keeper,
            timeKeeper: editorConfig.general.time_keeper,
        },
        axes: mergeAxesDraftIntoPanelAxes(editorConfig.axes),
        display: {
            ...mergeDisplayDraftIntoPanelDisplay(editorConfig.display),
            use_zoom: editorConfig.general.use_zoom,
        },
    };
}

function mergeAxesDraftIntoPanelAxes(axesDraft: PanelAxesDraft): PanelAxes {
    return {
        x_axis: {
            show_tickline: axesDraft.x_axis.show_tickline,
            raw_data_pixels_per_tick: normalizeDraftNumber(
                axesDraft.x_axis.raw_data_pixels_per_tick,
            ),
            calculated_data_pixels_per_tick: normalizeDraftNumber(
                axesDraft.x_axis.calculated_data_pixels_per_tick,
            ),
        },
        sampling: {
            enabled: axesDraft.sampling.enabled,
            sample_count: normalizeDraftNumber(axesDraft.sampling.sample_count),
        },
        left_y_axis: {
            zero_base: axesDraft.left_y_axis.zero_base,
            show_tickline: axesDraft.left_y_axis.show_tickline,
            value_range: {
                min: normalizeDraftNumber(axesDraft.left_y_axis.value_range.min),
                max: normalizeDraftNumber(axesDraft.left_y_axis.value_range.max),
            },
            raw_data_value_range: {
                min: normalizeDraftNumber(
                    axesDraft.left_y_axis.raw_data_value_range.min,
                ),
                max: normalizeDraftNumber(
                    axesDraft.left_y_axis.raw_data_value_range.max,
                ),
            },
            upper_control_limit: {
                enabled: axesDraft.left_y_axis.upper_control_limit.enabled,
                value: normalizeDraftNumber(axesDraft.left_y_axis.upper_control_limit.value),
            },
            lower_control_limit: {
                enabled: axesDraft.left_y_axis.lower_control_limit.enabled,
                value: normalizeDraftNumber(axesDraft.left_y_axis.lower_control_limit.value),
            },
        },
        right_y_axis: {
            zero_base: axesDraft.right_y_axis.zero_base,
            show_tickline: axesDraft.right_y_axis.show_tickline,
            value_range: {
                min: normalizeDraftNumber(axesDraft.right_y_axis.value_range.min),
                max: normalizeDraftNumber(axesDraft.right_y_axis.value_range.max),
            },
            raw_data_value_range: {
                min: normalizeDraftNumber(
                    axesDraft.right_y_axis.raw_data_value_range.min,
                ),
                max: normalizeDraftNumber(
                    axesDraft.right_y_axis.raw_data_value_range.max,
                ),
            },
            upper_control_limit: {
                enabled: axesDraft.right_y_axis.upper_control_limit.enabled,
                value: normalizeDraftNumber(axesDraft.right_y_axis.upper_control_limit.value),
            },
            lower_control_limit: {
                enabled: axesDraft.right_y_axis.lower_control_limit.enabled,
                value: normalizeDraftNumber(axesDraft.right_y_axis.lower_control_limit.value),
            },
        },
        right_y_axis_enabled: axesDraft.right_y_axis_enabled,
    };
}

function mergeDisplayDraftIntoPanelDisplay(
    displayDraft: PanelDisplayDraft,
): PanelDisplay {
    return {
        ...displayDraft,
        point_radius: normalizeDraftNumber(displayDraft.point_radius),
        fill: normalizeDraftNumber(displayDraft.fill),
        stroke: normalizeDraftNumber(displayDraft.stroke),
    };
}

function normalizeDraftNumber(value: number | ''): number {
    return value === '' ? 0 : value;
}



