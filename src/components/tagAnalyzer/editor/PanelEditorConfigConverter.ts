import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
} from '../utils/panelModelTypes';
import type {
    TagAnalyzerPanelAxesDraft,
    TagAnalyzerPanelDisplayDraft,
    TagAnalyzerPanelEditorConfig,
} from './PanelEditorTypes';

/**
 * Converts one persisted panel model into the editor draft grouped by editor tabs.
 * Intent: Keep the editor state aligned with the saved panel shape while exposing tab-friendly fields.
 * @param {PanelInfo} aPanelInfo The persisted panel model selected for editing.
 * @returns {TagAnalyzerPanelEditorConfig} The editor draft config used by the panel editor UI.
 */
export function convertPanelInfoToEditorConfig(
    aPanelInfo: PanelInfo,
): TagAnalyzerPanelEditorConfig {
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
            show_x_tickline: aPanelInfo.axes.show_x_tickline,
            pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
            pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
            use_sampling: aPanelInfo.axes.use_sampling,
            sampling_value: aPanelInfo.axes.sampling_value,
            zero_base: aPanelInfo.axes.zero_base,
            show_y_tickline: aPanelInfo.axes.show_y_tickline,
            custom_min: aPanelInfo.axes.primaryRange.min,
            custom_max: aPanelInfo.axes.primaryRange.max,
            custom_drilldown_min: aPanelInfo.axes.primaryDrilldownRange.min,
            custom_drilldown_max: aPanelInfo.axes.primaryDrilldownRange.max,
            use_ucl: aPanelInfo.axes.use_ucl,
            ucl_value: aPanelInfo.axes.ucl_value,
            use_lcl: aPanelInfo.axes.use_lcl,
            lcl_value: aPanelInfo.axes.lcl_value,
            use_right_y2: aPanelInfo.axes.use_right_y2,
            zero_base2: aPanelInfo.axes.zero_base2,
            show_y_tickline2: aPanelInfo.axes.show_y_tickline2,
            custom_min2: aPanelInfo.axes.secondaryRange.min,
            custom_max2: aPanelInfo.axes.secondaryRange.max,
            custom_drilldown_min2: aPanelInfo.axes.secondaryDrilldownRange.min,
            custom_drilldown_max2: aPanelInfo.axes.secondaryDrilldownRange.max,
            use_ucl2: aPanelInfo.axes.use_ucl2,
            ucl2_value: aPanelInfo.axes.ucl2_value,
            use_lcl2: aPanelInfo.axes.use_lcl2,
            lcl2_value: aPanelInfo.axes.lcl2_value,
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
 * @param {TagAnalyzerPanelEditorConfig} aEditorConfig The editor draft config to apply.
 * @returns {PanelInfo} The next persisted panel model with editor changes applied.
 */
export function mergeEditorConfigIntoPanelInfo(
    aBasePanelInfo: PanelInfo,
    aEditorConfig: TagAnalyzerPanelEditorConfig,
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
 * @param {TagAnalyzerPanelAxesDraft} aAxesDraft The axes draft from the editor form.
 * @returns {PanelAxes} The persisted axes model with normalized numeric values.
 */
function mergeAxesDraftIntoPanelAxes(aAxesDraft: TagAnalyzerPanelAxesDraft): PanelAxes {
    return {
        show_x_tickline: aAxesDraft.show_x_tickline,
        pixels_per_tick_raw: normalizeDraftNumber(aAxesDraft.pixels_per_tick_raw),
        pixels_per_tick: normalizeDraftNumber(aAxesDraft.pixels_per_tick),
        use_sampling: aAxesDraft.use_sampling,
        sampling_value: normalizeDraftNumber(aAxesDraft.sampling_value),
        zero_base: aAxesDraft.zero_base,
        show_y_tickline: aAxesDraft.show_y_tickline,
        primaryRange: {
            min: normalizeDraftNumber(aAxesDraft.custom_min),
            max: normalizeDraftNumber(aAxesDraft.custom_max),
        },
        primaryDrilldownRange: {
            min: normalizeDraftNumber(aAxesDraft.custom_drilldown_min),
            max: normalizeDraftNumber(aAxesDraft.custom_drilldown_max),
        },
        use_ucl: aAxesDraft.use_ucl,
        ucl_value: normalizeDraftNumber(aAxesDraft.ucl_value),
        use_lcl: aAxesDraft.use_lcl,
        lcl_value: normalizeDraftNumber(aAxesDraft.lcl_value),
        use_right_y2: aAxesDraft.use_right_y2,
        zero_base2: aAxesDraft.zero_base2,
        show_y_tickline2: aAxesDraft.show_y_tickline2,
        secondaryRange: {
            min: normalizeDraftNumber(aAxesDraft.custom_min2),
            max: normalizeDraftNumber(aAxesDraft.custom_max2),
        },
        secondaryDrilldownRange: {
            min: normalizeDraftNumber(aAxesDraft.custom_drilldown_min2),
            max: normalizeDraftNumber(aAxesDraft.custom_drilldown_max2),
        },
        use_ucl2: aAxesDraft.use_ucl2,
        ucl2_value: normalizeDraftNumber(aAxesDraft.ucl2_value),
        use_lcl2: aAxesDraft.use_lcl2,
        lcl2_value: normalizeDraftNumber(aAxesDraft.lcl2_value),
    };
}

/**
 * Converts one editor display draft into the persisted panel-display shape.
 * Intent: Normalize display inputs before they are saved back into the panel model.
 * @param {TagAnalyzerPanelDisplayDraft} aDisplayDraft The display draft from the editor form.
 * @returns {PanelDisplay} The persisted display model with normalized numeric values.
 */
function mergeDisplayDraftIntoPanelDisplay(
    aDisplayDraft: TagAnalyzerPanelDisplayDraft,
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
