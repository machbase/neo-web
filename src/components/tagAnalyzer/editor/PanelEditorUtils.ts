import { subtractTime } from '@/utils/bgnEndTimeRange';
import { resolveTagAnalyzerTimeBoundaryRanges } from '../utils/TagAnalyzerTimeRangeResolution';
import type {
    PanelAxes,
    PanelDisplay,
    PanelInfo,
    SeriesConfig,
    TimeRange,
} from '../utils/ModelTypes';
import {
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    resolveTimeBoundaryValue,
    toLegacyTimeRangeInput,
} from '../utils/TagAnalyzerTimeRangeConfig';
import type {
    EditTabPanelType,
    TagAnalyzerPanelAxesDraft,
    TagAnalyzerPanelDisplayDraft,
    TagAnalyzerPanelEditorConfig,
    TagAnalyzerPanelTimeConfig,
} from './PanelEditorTypes';

export const EDITOR_TABS: EditTabPanelType[] = ['General', 'Data', 'Axes', 'Display', 'Time'];

/**
 * Splits one panel payload into the sectioned editor state used by the editor tabs.
 * @param aPanelInfo The current panel info.
 * @returns The editor config grouped by tab section.
 */
export function createPanelEditorConfig(
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
 * Merges editor tab state back into the canonical panel info payload.
 * @param aBasePanelInfo The currently applied panel info.
 * @param aEditorConfig The edited tab state from the panel editor.
 * @returns The merged panel info payload.
 */
export function mergePanelEditorConfig(
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
        axes: mergeAxesDraft(aEditorConfig.axes),
        display: {
            ...mergeDisplayDraft(aEditorConfig.display),
            use_zoom: aEditorConfig.general.use_zoom,
        },
    };
}

/**
 * Resolves the concrete preview bounds used by the editor time controls.
 * @param timeConfig The normalized editor time config.
 * @param tag_set The current series set used to resolve relative last-ranges.
 * @param navigatorRange The current navigator bounds used as the fallback preview window.
 * @returns The resolved preview range for the editor chart.
 */
export async function resolveEditorTimeBounds({
    timeConfig,
    tag_set,
    navigatorRange,
}: {
    timeConfig: TagAnalyzerPanelTimeConfig;
    tag_set: SeriesConfig[];
    navigatorRange: TimeRange;
}): Promise<TimeRange> {
    if (isLastRelativeTimeRangeConfig(timeConfig.range_config)) {
        const sLegacyRange = toLegacyTimeRangeInput(
            {
                range: { min: timeConfig.range_bgn, max: timeConfig.range_end },
                rangeConfig: timeConfig.range_config,
            },
        );
        const sLastRange = await resolveTagAnalyzerTimeBoundaryRanges(
            tag_set,
            sLegacyRange,
            { bgn: '', end: '' },
        );
        if (!sLastRange) {
            return navigatorRange;
        }

        return {
            startTime: subtractTime(sLastRange.end.max, sLegacyRange.bgn as string),
            endTime: subtractTime(sLastRange.end.max, sLegacyRange.end as string),
        };
    }

    if (isNowRelativeTimeRangeConfig(timeConfig.range_config)) {
        return {
            startTime: resolveTimeBoundaryValue(timeConfig.range_config.start),
            endTime: resolveTimeBoundaryValue(timeConfig.range_config.end),
        };
    }

    if (timeConfig.range_bgn <= 0 || timeConfig.range_end <= timeConfig.range_bgn) {
        return navigatorRange;
    }

    return {
        startTime: timeConfig.range_bgn,
        endTime: timeConfig.range_end,
    };
}

/**
 * Merges one axes draft into the persisted axes shape with numeric fields normalized.
 * @param aAxes The axes draft from the editor.
 * @returns The normalized axes config.
 */
function mergeAxesDraft(aAxes: TagAnalyzerPanelAxesDraft): PanelAxes {
    return {
        show_x_tickline: aAxes.show_x_tickline,
        pixels_per_tick_raw: normalizeDraftNumber(aAxes.pixels_per_tick_raw),
        pixels_per_tick: normalizeDraftNumber(aAxes.pixels_per_tick),
        use_sampling: aAxes.use_sampling,
        sampling_value: normalizeDraftNumber(aAxes.sampling_value),
        zero_base: aAxes.zero_base,
        show_y_tickline: aAxes.show_y_tickline,
        primaryRange: {
            min: normalizeDraftNumber(aAxes.custom_min),
            max: normalizeDraftNumber(aAxes.custom_max),
        },
        primaryDrilldownRange: {
            min: normalizeDraftNumber(aAxes.custom_drilldown_min),
            max: normalizeDraftNumber(aAxes.custom_drilldown_max),
        },
        use_ucl: aAxes.use_ucl,
        ucl_value: normalizeDraftNumber(aAxes.ucl_value),
        use_lcl: aAxes.use_lcl,
        lcl_value: normalizeDraftNumber(aAxes.lcl_value),
        use_right_y2: aAxes.use_right_y2,
        zero_base2: aAxes.zero_base2,
        show_y_tickline2: aAxes.show_y_tickline2,
        secondaryRange: {
            min: normalizeDraftNumber(aAxes.custom_min2),
            max: normalizeDraftNumber(aAxes.custom_max2),
        },
        secondaryDrilldownRange: {
            min: normalizeDraftNumber(aAxes.custom_drilldown_min2),
            max: normalizeDraftNumber(aAxes.custom_drilldown_max2),
        },
        use_ucl2: aAxes.use_ucl2,
        ucl2_value: normalizeDraftNumber(aAxes.ucl2_value),
        use_lcl2: aAxes.use_lcl2,
        lcl2_value: normalizeDraftNumber(aAxes.lcl2_value),
    };
}

/**
 * Merges one display draft into the persisted display shape with numeric fields normalized.
 * @param aDisplay The display draft from the editor.
 * @returns The normalized display config.
 */
function mergeDisplayDraft(
    aDisplay: TagAnalyzerPanelDisplayDraft,
): PanelDisplay {
    return {
        ...aDisplay,
        point_radius: normalizeDraftNumber(aDisplay.point_radius),
        fill: normalizeDraftNumber(aDisplay.fill),
        stroke: normalizeDraftNumber(aDisplay.stroke),
    };
}

/**
 * Normalizes editor number fields so blank inputs still round-trip into numeric panel config.
 * @param aValue The draft numeric value from the editor form.
 * @returns The normalized numeric value.
 */
function normalizeDraftNumber(aValue: number | ''): number {
    return aValue === '' ? 0 : aValue;
}
