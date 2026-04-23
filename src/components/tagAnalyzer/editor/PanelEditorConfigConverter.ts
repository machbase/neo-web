import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
} from '../utils/panelModelTypes';
import type {
    PanelAxesDraft,
    PanelDisplayDraft,
    PanelEditorConfig,
} from './EditorTypes';

/**
 * Converts one persisted panel model into the editor draft grouped by editor tabs.
 * Intent: Keep the editor state aligned with the saved panel shape while exposing tab-friendly fields.
 * @param {PanelInfo} aPanelInfo The persisted panel model selected for editing.
 * @returns {PanelEditorConfig} The editor draft config used by the panel editor UI.
 */
export function convertPanelInfoToEditorConfig(
    aPanelInfo: PanelInfo,
): PanelEditorConfig {
    return {
        general: {
            chart_title: aPanelInfo.meta.chart_title,
            use_zoom: aPanelInfo.display.use_zoom,
            use_time_keeper: aPanelInfo.time.use_time_keeper,
            time_keeper: aPanelInfo.time.time_keeper,
        },
        data: {
            index_key: aPanelInfo.meta.index_key,
            tag_set: aPanelInfo.data.tag_set,
        },
        axes: {
            x_axis: {
                show_tickline: aPanelInfo.axes.x_axis.show_tickline,
                raw_data_pixels_per_tick: aPanelInfo.axes.x_axis.raw_data_pixels_per_tick,
                calculated_data_pixels_per_tick:
                    aPanelInfo.axes.x_axis.calculated_data_pixels_per_tick,
            },
            sampling: {
                enabled: aPanelInfo.axes.sampling.enabled,
                sample_count: aPanelInfo.axes.sampling.sample_count,
            },
            left_y_axis: {
                zero_base: aPanelInfo.axes.left_y_axis.zero_base,
                show_tickline: aPanelInfo.axes.left_y_axis.show_tickline,
                value_range: {
                    min: aPanelInfo.axes.left_y_axis.value_range.min,
                    max: aPanelInfo.axes.left_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: aPanelInfo.axes.left_y_axis.raw_data_value_range.min,
                    max: aPanelInfo.axes.left_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: aPanelInfo.axes.left_y_axis.upper_control_limit.enabled,
                    value: aPanelInfo.axes.left_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.left_y_axis.lower_control_limit.enabled,
                    value: aPanelInfo.axes.left_y_axis.lower_control_limit.value,
                },
            },
            right_y_axis: {
                enabled: aPanelInfo.axes.right_y_axis.enabled,
                zero_base: aPanelInfo.axes.right_y_axis.zero_base,
                show_tickline: aPanelInfo.axes.right_y_axis.show_tickline,
                value_range: {
                    min: aPanelInfo.axes.right_y_axis.value_range.min,
                    max: aPanelInfo.axes.right_y_axis.value_range.max,
                },
                raw_data_value_range: {
                    min: aPanelInfo.axes.right_y_axis.raw_data_value_range.min,
                    max: aPanelInfo.axes.right_y_axis.raw_data_value_range.max,
                },
                upper_control_limit: {
                    enabled: aPanelInfo.axes.right_y_axis.upper_control_limit.enabled,
                    value: aPanelInfo.axes.right_y_axis.upper_control_limit.value,
                },
                lower_control_limit: {
                    enabled: aPanelInfo.axes.right_y_axis.lower_control_limit.enabled,
                    value: aPanelInfo.axes.right_y_axis.lower_control_limit.value,
                },
            },
        },
        display: aPanelInfo.display,
        time: {
            range_bgn: aPanelInfo.time.range_bgn,
            range_end: aPanelInfo.time.range_end,
            range_config: aPanelInfo.time.range_config,
        },
    };
}

/**
 * Merges one editor draft back into the persisted panel model while preserving non-editor fields.
 * Intent: Apply editor changes without losing the panel data that the editor does not own.
 * @param {PanelInfo} aBasePanelInfo The persisted panel model that owns the non-editor fields.
 * @param {PanelEditorConfig} aEditorConfig The editor draft config to apply.
 * @returns {PanelInfo} The next persisted panel model with editor changes applied.
 */
export function mergeEditorConfigIntoPanelInfo(
    aBasePanelInfo: PanelInfo,
    aEditorConfig: PanelEditorConfig,
): PanelInfo {
    return {
        ...aBasePanelInfo,
        meta: {
            ...aBasePanelInfo.meta,
            index_key: aEditorConfig.data.index_key,
            chart_title: aEditorConfig.general.chart_title,
        },
        data: {
            ...aBasePanelInfo.data,
            tag_set: aEditorConfig.data.tag_set,
        },
        time: {
            ...aBasePanelInfo.time,
            range_bgn: aEditorConfig.time.range_bgn,
            range_end: aEditorConfig.time.range_end,
            range_config: aEditorConfig.time.range_config,
            use_time_keeper: aEditorConfig.general.use_time_keeper,
            time_keeper: aEditorConfig.general.time_keeper,
        },
        axes: mergeAxesDraftIntoPanelAxes(aEditorConfig.axes),
        display: {
            ...mergeDisplayDraftIntoPanelDisplay(aEditorConfig.display),
            use_zoom: aEditorConfig.general.use_zoom,
        },
    };
}

/**
 * Converts one editor axes draft into the persisted panel-axes shape.
 * Intent: Normalize axes inputs before they are saved back into the panel model.
 * @param {PanelAxesDraft} aAxesDraft The axes draft from the editor form.
 * @returns {PanelAxes} The persisted axes model with normalized numeric values.
 */
function mergeAxesDraftIntoPanelAxes(aAxesDraft: PanelAxesDraft): PanelAxes {
    return {
        x_axis: {
            show_tickline: aAxesDraft.x_axis.show_tickline,
            raw_data_pixels_per_tick: normalizeDraftNumber(
                aAxesDraft.x_axis.raw_data_pixels_per_tick,
            ),
            calculated_data_pixels_per_tick: normalizeDraftNumber(
                aAxesDraft.x_axis.calculated_data_pixels_per_tick,
            ),
        },
        sampling: {
            enabled: aAxesDraft.sampling.enabled,
            sample_count: normalizeDraftNumber(aAxesDraft.sampling.sample_count),
        },
        left_y_axis: {
            zero_base: aAxesDraft.left_y_axis.zero_base,
            show_tickline: aAxesDraft.left_y_axis.show_tickline,
            value_range: {
                min: normalizeDraftNumber(aAxesDraft.left_y_axis.value_range.min),
                max: normalizeDraftNumber(aAxesDraft.left_y_axis.value_range.max),
            },
            raw_data_value_range: {
                min: normalizeDraftNumber(
                    aAxesDraft.left_y_axis.raw_data_value_range.min,
                ),
                max: normalizeDraftNumber(
                    aAxesDraft.left_y_axis.raw_data_value_range.max,
                ),
            },
            upper_control_limit: {
                enabled: aAxesDraft.left_y_axis.upper_control_limit.enabled,
                value: normalizeDraftNumber(aAxesDraft.left_y_axis.upper_control_limit.value),
            },
            lower_control_limit: {
                enabled: aAxesDraft.left_y_axis.lower_control_limit.enabled,
                value: normalizeDraftNumber(aAxesDraft.left_y_axis.lower_control_limit.value),
            },
        },
        right_y_axis: {
            enabled: aAxesDraft.right_y_axis.enabled,
            zero_base: aAxesDraft.right_y_axis.zero_base,
            show_tickline: aAxesDraft.right_y_axis.show_tickline,
            value_range: {
                min: normalizeDraftNumber(aAxesDraft.right_y_axis.value_range.min),
                max: normalizeDraftNumber(aAxesDraft.right_y_axis.value_range.max),
            },
            raw_data_value_range: {
                min: normalizeDraftNumber(
                    aAxesDraft.right_y_axis.raw_data_value_range.min,
                ),
                max: normalizeDraftNumber(
                    aAxesDraft.right_y_axis.raw_data_value_range.max,
                ),
            },
            upper_control_limit: {
                enabled: aAxesDraft.right_y_axis.upper_control_limit.enabled,
                value: normalizeDraftNumber(aAxesDraft.right_y_axis.upper_control_limit.value),
            },
            lower_control_limit: {
                enabled: aAxesDraft.right_y_axis.lower_control_limit.enabled,
                value: normalizeDraftNumber(aAxesDraft.right_y_axis.lower_control_limit.value),
            },
        },
    };
}

/**
 * Converts one editor display draft into the persisted panel-display shape.
 * Intent: Normalize display inputs before they are saved back into the panel model.
 * @param {PanelDisplayDraft} aDisplayDraft The display draft from the editor form.
 * @returns {PanelDisplay} The persisted display model with normalized numeric values.
 */
function mergeDisplayDraftIntoPanelDisplay(
    aDisplayDraft: PanelDisplayDraft,
): PanelDisplay {
    return {
        ...aDisplayDraft,
        point_radius: normalizeDraftNumber(aDisplayDraft.point_radius),
        fill: normalizeDraftNumber(aDisplayDraft.fill),
        stroke: normalizeDraftNumber(aDisplayDraft.stroke),
    };
}

/**
 * Normalizes one draft number field so blank inputs still round-trip into numeric panel values.
 * Intent: Prevent empty editor inputs from leaking into the persisted numeric model as blanks.
 * @param {number | ''} aValue The draft number field from the editor form.
 * @returns {number} The normalized numeric value.
 */
function normalizeDraftNumber(aValue: number | ''): number {
    return aValue === '' ? 0 : aValue;
}

