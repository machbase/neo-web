import type { Dispatch, SetStateAction } from 'react';
import type { OverlapShiftDirection } from '../utils/boardTypes';
import type {
    PanelAxisThreshold,
    PanelDisplay,
    PanelEChartType,
    PanelInfo,
    PanelRightYAxis,
    PanelSampling,
    PanelXAxis,
    PanelYAxis,
} from '../utils/panelModelTypes';
import type { PanelSeriesConfig } from '../utils/series/PanelSeriesTypes';
import type {
    TimeBoundary,
    TimeRangeConfig,
    TimeRangeMs,
    TimeRangePair,
} from '../utils/time/types/TimeTypes';

export type EditorChartType = PanelEChartType;

export type EditorCheckboxInputEvent = {
    target: {
        checked: boolean;
    };
};

export type EditorInputEvent = {
    target: {
        value: string;
    };
};

export type EditTabPanelType = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

export type PanelGeneralConfig = {
    chart_title: string;
    use_zoom: boolean;
    use_time_keeper: boolean;
    time_keeper: Partial<TimeRangePair> | undefined;
};

export type PanelDataConfig = {
    index_key: string;
    tag_set: PanelSeriesConfig[];
};

export type PanelTimeConfig = {
    range_bgn: number;
    range_end: number;
    range_config: TimeRangeConfig;
};

export type PanelAxisThresholdDraft = Omit<PanelAxisThreshold, 'value'> & {
    value: number | '';
};

export type PanelYAxisDraft = Omit<
    PanelYAxis,
    'value_range' | 'raw_data_value_range' | 'upper_control_limit' | 'lower_control_limit'
> & {
    value_range: {
        min: number | '';
        max: number | '';
    };
    raw_data_value_range: {
        min: number | '';
        max: number | '';
    };
    upper_control_limit: PanelAxisThresholdDraft;
    lower_control_limit: PanelAxisThresholdDraft;
};

export type PanelRightYAxisDraft = Omit<
    PanelRightYAxis,
    'value_range' | 'raw_data_value_range' | 'upper_control_limit' | 'lower_control_limit'
> & {
    value_range: {
        min: number | '';
        max: number | '';
    };
    raw_data_value_range: {
        min: number | '';
        max: number | '';
    };
    upper_control_limit: PanelAxisThresholdDraft;
    lower_control_limit: PanelAxisThresholdDraft;
};

export type PanelXAxisDraft = Omit<
    PanelXAxis,
    'raw_data_pixels_per_tick' | 'calculated_data_pixels_per_tick'
> & {
    raw_data_pixels_per_tick: number | '';
    calculated_data_pixels_per_tick: number | '';
};

export type PanelSamplingDraft = Omit<PanelSampling, 'sample_count'> & {
    sample_count: number | '';
};

export type PanelAxesDraft = {
    x_axis: PanelXAxisDraft;
    sampling: PanelSamplingDraft;
    left_y_axis: PanelYAxisDraft;
    right_y_axis: PanelRightYAxisDraft;
};

export type PanelDisplayDraft = Omit<
    PanelDisplay,
    'point_radius' | 'fill' | 'stroke'
> & {
    point_radius: number | '';
    fill: number | '';
    stroke: number | '';
};

export type PanelEditorConfig = {
    general: PanelGeneralConfig;
    data: PanelDataConfig;
    axes: PanelAxesDraft;
    display: PanelDisplayDraft;
    time: PanelTimeConfig;
};

export type AddTagsModalProps = {
    pCloseModal: () => void;
    pTagSet: PanelSeriesConfig[];
    pOnChangeTagSet: (tagSet: PanelSeriesConfig[]) => void;
    pTables: string[];
};

export type AxisKey = 'left_y_axis' | 'right_y_axis';
export type AxisRangeKey = 'value_range' | 'raw_data_value_range';
export type AxisThresholdKey = 'upper_control_limit' | 'lower_control_limit';

export type AxisRangeRowConfig = {
    label: string;
    axisKey: AxisKey;
    rangeKey: AxisRangeKey;
    disabled: boolean | undefined;
    labelMinWidth: string | undefined;
};

export type AxisThresholdRowConfig = {
    axisKey: AxisKey;
    thresholdKey: AxisThresholdKey;
    label: string;
    disabled: boolean | undefined;
};

export type EditorAxesTabProps = {
    pAxesConfig: PanelAxesDraft;
    pTagSet: PanelSeriesConfig[];
    pOnChangeAxesConfig: (config: PanelAxesDraft) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesConfig[]) => void;
};

export type EditableTagField = 'calculationMode' | 'alias' | 'color';

export type EditorDataTabProps = {
    pDataConfig: PanelDataConfig;
    pOnChangeTagSet: (tagSet: PanelSeriesConfig[]) => void;
    pTables: string[];
};

export type ChartTypeOption = {
    type: EditorChartType;
    src: string;
    alt: string;
};

export type EditorDisplayTabProps = {
    pDisplayConfig: PanelDisplayDraft;
    pOnChangeDisplayConfig: (config: PanelDisplayDraft) => void;
};

export type GeneralFlagField = 'use_zoom' | 'use_time_keeper';

export type EditorGeneralTabProps = {
    pGeneralConfig: PanelGeneralConfig;
    pOnChangeGeneralConfig: (config: PanelGeneralConfig) => void;
};

export type EditorTabContentProps = {
    selectedTabType: EditTabPanelType;
    editorConfig: PanelEditorConfig;
    setEditorConfig: Dispatch<SetStateAction<PanelEditorConfig>>;
    tables: string[];
};

export type EditorTimeTabProps = {
    pTimeConfig: PanelTimeConfig;
    pOnChangeTimeConfig: (config: PanelTimeConfig) => void;
};

export type PanelEditorSettingsProps = {
    pTabs: EditTabPanelType[];
    pSelectedTab: EditTabPanelType;
    pSetSelectedTab: Dispatch<SetStateAction<EditTabPanelType>>;
    pEditorConfig: PanelEditorConfig;
    pSetEditorConfig: Dispatch<SetStateAction<PanelEditorConfig>>;
    pTables: string[];
};

export type TimeInputField = 'range_bgn' | 'range_end';

export type TimeInputEvent = {
    target: {
        value: string;
    };
};

export type UseEditorTimeTabStateArgs = {
    timeConfig: PanelTimeConfig;
    onChangeTimeConfig: (config: PanelTimeConfig) => void;
};

export type TimeInputValues = {
    startTime: string;
    endTime: string;
};

export type EditorChartPreviewProps = {
    pPanelInfo: PanelInfo;
    pFooterRange: TimeRangeMs;
    pPreviewRange: TimeRangeMs;
    pRollupTableList: string[];
};

export type OverlapTimeShiftPanelProps = {
    pColorIndex: number;
    pLabel: string;
    pStart: number;
    pDuration: number;
    pOnShiftTime: (direction: OverlapShiftDirection, range: number) => void;
};

export type PanelEditorProps = {
    pInitialEditorConfig: PanelEditorConfig;
    pOnSavePanel: (panelInfo: PanelInfo) => void;
    pPanelInfo: PanelInfo;
    pSetEditPanel: () => void;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TimeRangeMs;
    pRollupTableList: string[];
    pTables: string[];
};

export type ResolveEditorTimeBoundsArgs = {
    timeConfig: PanelTimeConfig;
    tag_set: PanelSeriesConfig[];
    navigatorRange: TimeRangeMs;
};

export type EditorTimeRangeMode = 'lastRelative' | 'nowRelative' | 'absolute' | 'fallback';

export type TimeBoundaryPair = {
    startBoundary: TimeBoundary;
    endBoundary: TimeBoundary;
};
