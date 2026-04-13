import type { MutableRefObject } from 'react';

// --- Domain model types ---

export type TagAnalyzerYN = 'Y' | 'N';

export type TagAnalyzerInputRangeValue = string | number | '';

export type TimeRange = {
    startTime: number;
    endTime: number;
};

export type Range = [number, number];

export type TagAnalyzerDefaultRange = {
    min: number;
    max: number;
};

export type TagAnalyzerBgnEndTimeRange = {
    bgn: TagAnalyzerDefaultRange;
    end: TagAnalyzerDefaultRange;
};

export type TagAnalyzerIntervalOption = {
    IntervalType: string;
    IntervalValue: number;
};

export type TagAnalyzerGlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: TagAnalyzerIntervalOption;
};

export type TagAnalyzerPanelTimeKeeper = {
    panelRange: TimeRange;
    navigatorRange: TimeRange;
};

export type TagAnalyzerSeriesColumns = {
    name: string | undefined;
    time: string | undefined;
    value: string | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerSeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: TagAnalyzerYN;
    id: string | undefined;
    onRollup: unknown | undefined;
    colName: TagAnalyzerSeriesColumns | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerPanelMeta = {
    index_key: string;
    chart_title: string;
};

export type TagAnalyzerPanelData = {
    tag_set: TagAnalyzerSeriesConfig[];
    raw_keeper: boolean | undefined;
    count: number | undefined;
    interval_type: string | undefined;
};

export type TagAnalyzerPanelTime = {
    range_bgn: TagAnalyzerInputRangeValue;
    range_end: TagAnalyzerInputRangeValue;
    use_time_keeper: TagAnalyzerYN;
    time_keeper: Partial<TagAnalyzerPanelTimeKeeper> | undefined;
    default_range: TagAnalyzerDefaultRange | undefined;
};

export type TagAnalyzerBoardRange = Pick<TagAnalyzerPanelTime, 'range_bgn' | 'range_end'>;

export type TagAnalyzerPanelAxes = {
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number;
    pixels_per_tick: number;
    use_sampling: boolean;
    sampling_value: number;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    primaryRange: TagAnalyzerDefaultRange;
    primaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl: TagAnalyzerYN;
    ucl_value: number;
    use_lcl: TagAnalyzerYN;
    lcl_value: number;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    secondaryRange: TagAnalyzerDefaultRange;
    secondaryDrilldownRange: TagAnalyzerDefaultRange;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number;
};

export type TagAnalyzerPanelDisplay = {
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number;
    fill: number;
    stroke: number;
};

export type TagAnalyzerPanelInfo = {
    meta: TagAnalyzerPanelMeta;
    data: TagAnalyzerPanelData;
    time: TagAnalyzerPanelTime;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    use_normalize: TagAnalyzerYN;
};

export type TagAnalyzerChartSeriesItem = {
    name: string;
    data: Range[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | null | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
    [key: string]: unknown;
};

export type TagAnalyzerChartRow = Range;

export type TagAnalyzerChartData = {
    datasets: TagAnalyzerChartSeriesItem[];
};

export type TagAnalyzerMinMaxItem = {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
};

export type TagAnalyzerOverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: TagAnalyzerPanelInfo;
};

// --- UI component types ---

export type PanelPresentationState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isDragSelectActive: boolean;
    canOpenFft: boolean;
    canSaveLocal: boolean;
};

export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onOpenEdit: () => void;
    onDelete: () => void;
};

export type PanelRefreshHandlers = {
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
};

export type PanelZoomHandlers = {
    onZoomIn: (aZoom: number) => void;
    onZoomOut: (aZoom: number) => void;
    onFocus: () => void;
};

export type PanelShiftHandlers = {
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

export type PanelRangeControlHandlers = PanelShiftHandlers & PanelZoomHandlers;

export type PanelSavedChartInfo = {
    chartData: unknown;
    chartRef: unknown;
};

export type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
    trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
};

export type PanelChartHandle = {
    setPanelRange: (aRange: TimeRange) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
};

export type PanelSummaryState = {
    tagCount: number;
    showLegend: TagAnalyzerYN;
};

export type PanelChartRefs = {
    areaChart: MutableRefObject<HTMLDivElement | null>;
    chartWrap: MutableRefObject<PanelChartHandle | null>;
};

export type PanelState = {
    isRaw: boolean;
    isFFTModal: boolean;
    isDragSelectActive: boolean;
};

export type PanelNavigateState = {
    chartData: TagAnalyzerChartSeriesItem[] | undefined;
    navigatorChartData: TagAnalyzerChartSeriesItem[] | undefined;
    panelRange: TimeRange;
    navigatorRange: TimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    preOverflowTimeRange: TimeRange;
};

export type PanelChartState = {
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    useNormalize: TagAnalyzerYN;
};

export type PanelChartHandlers = {
    onSetExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSetNavigatorExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
};
