import type {
    PanelAxes,
    PanelData,
    PanelDisplay,
    PanelMeta,
    PanelTime,
} from '../../domain/PanelDomain';
import type {
    EditorNumberInputValue,
    PanelAxesDraft,
    PanelDisplayDraft,
    PanelEditorConfig,
} from './EditorTypes';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';

export type PanelEditorPanelState = {
    meta: PanelMeta;
    data: PanelData;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
};

export function convertPanelStateToEditorConfig({
    meta,
    data,
    time,
    axes,
    display,
}: PanelEditorPanelState): PanelEditorConfig {
    return {
        general: {
            chart_title: meta.chart_title,
            use_zoom: display.use_zoom,
            use_last_viewed_range: time.useLastViewedRange,
            last_viewed_range: time.lastViewedRange,
        },
        data: {
            index_key: meta.index_key,
            tag_set: normalizeTagSetForRightYAxis(
                data.tag_set,
                axes.right_y_axis_enabled,
            ),
        },
        axes: {
            x_axis: {
                show_tickline: axes.x_axis.show_tickline,
                raw_data_pixels_per_tick: axes.x_axis.raw_data_pixels_per_tick,
                calculated_data_pixels_per_tick:
                    axes.x_axis.calculated_data_pixels_per_tick,
            },
            sampling: {
                enabled: true,
                sample_count: axes.sampling.sample_count,
            },
            main_chart_sampling: {
                enabled: axes.main_chart_sampling.enabled,
                sample_count: axes.main_chart_sampling.sample_count,
            },
            left_y_axis: {
                zero_base: axes.left_y_axis.zero_base,
                show_tickline: axes.left_y_axis.show_tickline,
                value_range: {
                    min: axes.left_y_axis.value_range.min,
                    max: axes.left_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: axes.left_y_axis.raw_data_value_range.min,
                    max: axes.left_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: axes.left_y_axis.upper_control_limit.enabled,
                    value: axes.left_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: axes.left_y_axis.lower_control_limit.enabled,
                    value: axes.left_y_axis.lower_control_limit.value,
                },
            },
            right_y_axis: {
                zero_base: axes.right_y_axis.zero_base,
                show_tickline: axes.right_y_axis.show_tickline,
                value_range: {
                    min: axes.right_y_axis.value_range.min,
                    max: axes.right_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: axes.right_y_axis.raw_data_value_range.min,
                    max: axes.right_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: axes.right_y_axis.upper_control_limit.enabled,
                    value: axes.right_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: axes.right_y_axis.lower_control_limit.enabled,
                    value: axes.right_y_axis.lower_control_limit.value,
                },
            },
            right_y_axis_enabled: axes.right_y_axis_enabled,
        },
        display: display,
        time: {
            range_config: time.rangeConfig,
        },
    };
}

export function mergeEditorConfigIntoPanelState(
    basePanelState: PanelEditorPanelState,
    editorConfig: PanelEditorConfig,
): PanelEditorPanelState {
    return {
        ...basePanelState,
        meta: {
            ...basePanelState.meta,
            index_key: editorConfig.data.index_key,
            chart_title: editorConfig.general.chart_title,
        },
        data: {
            ...basePanelState.data,
            tag_set: normalizeTagSetForRightYAxis(
                editorConfig.data.tag_set,
                editorConfig.axes.right_y_axis_enabled,
            ),
        },
        time: {
            ...basePanelState.time,
            rangeConfig: editorConfig.time.range_config,
            useLastViewedRange: editorConfig.general.use_last_viewed_range,
            lastViewedRange: editorConfig.general.last_viewed_range,
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
            enabled: true,
            sample_count: normalizeDraftNumber(axesDraft.sampling.sample_count),
        },
        main_chart_sampling: {
            enabled: axesDraft.main_chart_sampling.enabled,
            sample_count: normalizeDraftNumber(
                axesDraft.main_chart_sampling.sample_count,
            ),
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

function normalizeDraftNumber(value: EditorNumberInputValue): number {
    return value === '' ? 0 : value;
}

function normalizeTagSetForRightYAxis(
    tagSet: PanelSeriesDefinition[],
    rightYAxisEnabled: boolean,
): PanelSeriesDefinition[] {
    return rightYAxisEnabled
        ? tagSet
        : tagSet.map((series) => ({
              ...series,
              useSecondaryAxis: false,
          }));
}



