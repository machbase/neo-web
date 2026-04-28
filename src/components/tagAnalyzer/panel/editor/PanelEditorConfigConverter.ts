import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
} from '../../utils/panelModelTypes';
import type {
    PanelAxesDraft,
    PanelDisplayDraft,
    PanelEditorConfig,
} from './EditorTypes';

/**
 * Converts one persisted panel model into the editor draft grouped by editor tabs.
 * Intent: Keep the editor state aligned with the saved panel shape while exposing tab-friendly fields.
 * @param {PanelInfo} panelInfo The persisted panel model selected for editing.
 * @returns {PanelEditorConfig} The editor draft config used by the panel editor UI.
 */
export function convertPanelInfoToEditorConfig(
    panelInfo: PanelInfo,
): PanelEditorConfig {
    return {
        general: {
            chart_title: panelInfo.meta.chart_title,
            use_zoom: panelInfo.display.use_zoom,
            use_time_keeper: panelInfo.time.use_time_keeper,
            time_keeper: panelInfo.time.time_keeper,
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
            range_bgn: panelInfo.time.range_bgn,
            range_end: panelInfo.time.range_end,
            range_config: panelInfo.time.range_config,
        },
    };
}

/**
 * Merges one editor draft back into the persisted panel model while preserving non-editor fields.
 * Intent: Apply editor changes without losing the panel data that the editor does not own.
 * @param {PanelInfo} basePanelInfo The persisted panel model that owns the non-editor fields.
 * @param {PanelEditorConfig} editorConfig The editor draft config to apply.
 * @returns {PanelInfo} The next persisted panel model with editor changes applied.
 */
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
            range_bgn: editorConfig.time.range_bgn,
            range_end: editorConfig.time.range_end,
            range_config: editorConfig.time.range_config,
            use_time_keeper: editorConfig.general.use_time_keeper,
            time_keeper: editorConfig.general.time_keeper,
        },
        axes: mergeAxesDraftIntoPanelAxes(editorConfig.axes),
        display: {
            ...mergeDisplayDraftIntoPanelDisplay(editorConfig.display),
            use_zoom: editorConfig.general.use_zoom,
        },
    };
}

/**
 * Converts one editor axes draft into the persisted panel-axes shape.
 * Intent: Normalize axes inputs before they are saved back into the panel model.
 * @param {PanelAxesDraft} axesDraft The axes draft from the editor form.
 * @returns {PanelAxes} The persisted axes model with normalized numeric values.
 */
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

/**
 * Converts one editor display draft into the persisted panel-display shape.
 * Intent: Normalize display inputs before they are saved back into the panel model.
 * @param {PanelDisplayDraft} displayDraft The display draft from the editor form.
 * @returns {PanelDisplay} The persisted display model with normalized numeric values.
 */
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

/**
 * Normalizes one draft number field so blank inputs still round-trip into numeric panel values.
 * Intent: Prevent empty editor inputs from leaking into the persisted numeric model as blanks.
 * @param {number | ''} value The draft number field from the editor form.
 * @returns {number} The normalized numeric value.
 */
function normalizeDraftNumber(value: number | ''): number {
    return value === '' ? 0 : value;
}

