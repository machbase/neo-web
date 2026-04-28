import type {
    Dispatch,
    ReactNode,
    SetStateAction,
} from 'react';
import type {
    PanelAxisThreshold,
    PanelDisplay,
    PanelEChartType,
    PanelInfo,
    PanelSampling,
    PanelXAxis,
    PanelYAxis,
} from '../utils/panelModelTypes';
import type { PanelSeriesDefinition } from '../utils/series/PanelSeriesTypes';
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
    tag_set: PanelSeriesDefinition[];
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
    right_y_axis: PanelYAxisDraft;
    right_y_axis_enabled: boolean;
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
    pTagSet: PanelSeriesDefinition[];
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
    pTables: string[];
};

export type AxisRangeKey = 'value_range' | 'raw_data_value_range';
export type AxisThresholdKey = 'upper_control_limit' | 'lower_control_limit';

export type EditorAxesTabProps = {
    pAxesConfig: PanelAxesDraft;
    pTagSet: PanelSeriesDefinition[];
    pOnChangeAxesConfig: (config: PanelAxesDraft) => void;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
};

export type EditorXAxisSectionProps = {
    xAxisConfig: PanelXAxisDraft;
    samplingConfig: PanelSamplingDraft;
    onChangeXAxisConfig: (patch: Partial<PanelXAxisDraft>) => void;
    onChangeSamplingConfig: (patch: Partial<PanelSamplingDraft>) => void;
};

export type AxisRangeRow = {
    label: string;
    rangeKey: AxisRangeKey;
    disabled?: boolean;
    labelMinWidth?: string;
};

export type AxisThresholdRow = {
    thresholdKey: AxisThresholdKey;
    label: string;
    disabled?: boolean;
};

export type EditorYAxisToggleConfig = {
    checked: boolean;
    label: string;
    onChange: (checked: boolean) => void;
};

export type EditorYAxisSectionProps = {
    title: string;
    axisConfig: PanelYAxisDraft;
    onChangeAxisConfig: (patch: Partial<PanelYAxisDraft>) => void;
    rangeRows: AxisRangeRow[];
    thresholdRows: AxisThresholdRow[];
    enableToggle?: EditorYAxisToggleConfig;
    isRightYAxis?: boolean;
    zeroBaseDisabled?: boolean;
    tickLineDisabled?: boolean;
    children?: ReactNode;
};

export type EditorRightAxisSeriesSectionProps = {
    isEnabled: boolean;
    tagSet: PanelSeriesDefinition[];
    onAssignSeries: (seriesKey: string) => void;
    onRemoveSeries: (seriesKey: string) => void;
};

export type EditableTagField = 'calculationMode' | 'alias' | 'color';

export type EditorDataTabProps = {
    pDataConfig: PanelDataConfig;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
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
    tag_set: PanelSeriesDefinition[];
    navigatorRange: TimeRangeMs;
};

export type EditorTimeRangeMode = 'lastRelative' | 'nowRelative' | 'absolute' | 'fallback';

export type TimeBoundaryPair = {
    startBoundary: TimeBoundary;
    endBoundary: TimeBoundary;
};
