import type {
    PanelAxes,
    PanelDisplay,
} from '../utils/panelModelTypes';
import type { SeriesConfig } from '../utils/series/seriesTypes';
import type { TimeRangeConfig, TimeRangePair } from '../utils/time/timeTypes';

// Shared checkbox input event type used across editor section components.
export type EditorCheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

// Shared text/number input event type used across editor section components.
export type EditorInputEvent = {
    target: {
        value: string;
    };
};

/**
 * Parses one editor field into either a number or an empty draft value.
 * Intent: Preserve blank numeric inputs while still converting entered text into numbers.
 * @param {string} aValue The raw editor input value.
 * @returns {number | ''} The parsed numeric draft value.
 */
export const parseEditorNumber = (aValue: string): number | '' => {
    return aValue === '' ? '' : Number(aValue);
};

// Used by TagAnalyzer editor code to type edit tab panel type.
export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

// Used by TagAnalyzer editor code to type panel general config.
export type TagAnalyzerPanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
};

// Used by TagAnalyzer editor code to type panel data config.
export type TagAnalyzerPanelDataConfig = {
    index_key: string;
    tag_set: SeriesConfig[];
};

// Used by TagAnalyzer editor code to type panel time config.
export type TagAnalyzerPanelTimeConfig = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
};

// Used by TagAnalyzer editor code to type panel axes draft.
export type TagAnalyzerPanelAxesDraft = Omit<
    PanelAxes,
    | 'pixels_per_tick_raw'
    | 'pixels_per_tick'
    | 'sampling_value'
    | 'primaryRange'
    | 'primaryDrilldownRange'
    | 'ucl_value'
    | 'lcl_value'
    | 'secondaryRange'
    | 'secondaryDrilldownRange'
    | 'ucl2_value'
    | 'lcl2_value'
> & {
    pixels_per_tick_raw: number | '';
    pixels_per_tick: number | '';
    sampling_value: number | '';
    custom_min: number | '';
    custom_max: number | '';
    custom_drilldown_min: number | '';
    custom_drilldown_max: number | '';
    ucl_value: number | '';
    lcl_value: number | '';
    custom_min2: number | '';
    custom_max2: number | '';
    custom_drilldown_min2: number | '';
    custom_drilldown_max2: number | '';
    ucl2_value: number | '';
    lcl2_value: number | '';
};

// Used by TagAnalyzer editor code to type panel display draft.
export type TagAnalyzerPanelDisplayDraft = Omit<
    PanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: number | '';
    fill: number | '';
    stroke: number | '';
};

// Used by TagAnalyzer editor code to type panel editor config.
export type TagAnalyzerPanelEditorConfig = {
    general: TagAnalyzerPanelGeneralConfig;
    data: TagAnalyzerPanelDataConfig;
    axes: TagAnalyzerPanelAxesDraft;
    display: TagAnalyzerPanelDisplayDraft;
    time: TagAnalyzerPanelTimeConfig;
};
