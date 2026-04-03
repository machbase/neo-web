import type { Dispatch, SetStateAction } from 'react';
import type { CordinateType } from './PanelUtilTypes';

export type TagAnalyzerYN = 'Y' | 'N';

export type TagAnalyzerRangeValue = string | number | '';

export type TagAnalyzerTimeRange = {
    startTime: number | undefined;
    endTime: number | undefined;
};

export const createTagAnalyzerTimeRange = (
    startTime: TagAnalyzerTimeRange['startTime'],
    endTime: TagAnalyzerTimeRange['endTime'],
): TagAnalyzerTimeRange => {
    return { startTime, endTime };
};

export const EMPTY_TAG_ANALYZER_TIME_RANGE: TagAnalyzerTimeRange = createTagAnalyzerTimeRange(undefined, undefined);

export type TagAnalyzerBgnEndTimeRange = {
    bgn_min: number;
    bgn_max: number;
    end_min: number;
    end_max: number;
};

export type TagAnalyzerIntervalOption = {
    IntervalType: string | undefined;
    IntervalValue: number | undefined;
};

export const EMPTY_TAG_ANALYZER_INTERVAL_OPTION: TagAnalyzerIntervalOption = {
    IntervalType: undefined,
    IntervalValue: undefined,
};

export type TagAnalyzerGlobalTimeRangeState = {
    data: TagAnalyzerTimeRange;
    navigator: TagAnalyzerTimeRange;
    interval: TagAnalyzerIntervalOption;
};

export type TagAnalyzerPanelTimeKeeper = {
    startPanelTime: number;
    endPanelTime: number;
    startNaviTime: number;
    endNaviTime: number;
};

export type TagAnalyzerDefaultRange = {
    min: number;
    max: number;
};

export type TagAnalyzerTagItem = {
    key: string;
    table: string;
    tagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: TagAnalyzerYN;
    id?: string;
    onRollup?: unknown;
    colName?: any;
    [key: string]: unknown;
};

export type TagAnalyzerPanelMeta = {
    index_key: string;
    chart_title: string;
};

export type TagAnalyzerPanelData = {
    tag_set: TagAnalyzerTagItem[];
    raw_keeper?: boolean;
    count?: number;
    interval_type?: string;
};

export type TagAnalyzerPanelTime = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    use_time_keeper: TagAnalyzerYN;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
    default_range?: TagAnalyzerDefaultRange;
};

export type TagAnalyzerPanelAxes = {
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: TagAnalyzerYN;
    ucl_value: number | string;
    use_lcl: TagAnalyzerYN;
    lcl_value: number | string;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number | string;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number | string;
};

export type TagAnalyzerPanelDisplay = {
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
};

export type TagAnalyzerFlatPanelInfo = {
    index_key: string;
    chart_title: string;
    tag_set: TagAnalyzerTagItem[];
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    raw_keeper?: boolean;
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
    default_range?: TagAnalyzerDefaultRange;
    count?: number;
    interval_type?: string;
    show_legend: TagAnalyzerYN;
    use_zoom: TagAnalyzerYN;
    use_time_keeper: TagAnalyzerYN;
    show_x_tickline: TagAnalyzerYN;
    pixels_per_tick_raw: number | string;
    pixels_per_tick: number | string;
    use_sampling: boolean;
    sampling_value: number | string;
    zero_base: TagAnalyzerYN;
    show_y_tickline: TagAnalyzerYN;
    custom_min: number | string;
    custom_max: number | string;
    custom_drilldown_min: number | string;
    custom_drilldown_max: number | string;
    use_ucl: TagAnalyzerYN;
    ucl_value: number | string;
    use_lcl: TagAnalyzerYN;
    lcl_value: number | string;
    use_right_y2: TagAnalyzerYN;
    zero_base2: TagAnalyzerYN;
    show_y_tickline2: TagAnalyzerYN;
    custom_min2: number | string;
    custom_max2: number | string;
    custom_drilldown_min2: number | string;
    custom_drilldown_max2: number | string;
    use_ucl2: TagAnalyzerYN;
    ucl2_value: number | string;
    use_lcl2: TagAnalyzerYN;
    lcl2_value: number | string;
    chart_type: string;
    show_point: TagAnalyzerYN;
    point_radius: number | string;
    fill: number | string;
    stroke: number | string;
    [key: string]: unknown;
};

export type TagAnalyzerPanelInfo = {
    meta: TagAnalyzerPanelMeta;
    data: TagAnalyzerPanelData;
    time: TagAnalyzerPanelTime;
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
};

const isNestedPanelInfo = (aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): aPanelInfo is TagAnalyzerPanelInfo => {
    return 'meta' in aPanelInfo && 'data' in aPanelInfo && 'time' in aPanelInfo && 'axes' in aPanelInfo && 'display' in aPanelInfo;
};

export const normalizeTagAnalyzerPanelInfo = (aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): TagAnalyzerPanelInfo => {
    if (isNestedPanelInfo(aPanelInfo)) {
        return aPanelInfo;
    }

    return {
        meta: {
            index_key: aPanelInfo.index_key,
            chart_title: aPanelInfo.chart_title,
        },
        data: {
            tag_set: aPanelInfo.tag_set,
            raw_keeper: aPanelInfo.raw_keeper,
            count: aPanelInfo.count,
            interval_type: aPanelInfo.interval_type,
        },
        time: {
            range_bgn: aPanelInfo.range_bgn,
            range_end: aPanelInfo.range_end,
            use_time_keeper: aPanelInfo.use_time_keeper,
            time_keeper: aPanelInfo.time_keeper,
            default_range: aPanelInfo.default_range,
        },
        axes: {
            show_x_tickline: aPanelInfo.show_x_tickline,
            pixels_per_tick_raw: aPanelInfo.pixels_per_tick_raw,
            pixels_per_tick: aPanelInfo.pixels_per_tick,
            use_sampling: aPanelInfo.use_sampling,
            sampling_value: aPanelInfo.sampling_value,
            zero_base: aPanelInfo.zero_base,
            show_y_tickline: aPanelInfo.show_y_tickline,
            custom_min: aPanelInfo.custom_min,
            custom_max: aPanelInfo.custom_max,
            custom_drilldown_min: aPanelInfo.custom_drilldown_min,
            custom_drilldown_max: aPanelInfo.custom_drilldown_max,
            use_ucl: aPanelInfo.use_ucl,
            ucl_value: aPanelInfo.ucl_value,
            use_lcl: aPanelInfo.use_lcl,
            lcl_value: aPanelInfo.lcl_value,
            use_right_y2: aPanelInfo.use_right_y2,
            zero_base2: aPanelInfo.zero_base2,
            show_y_tickline2: aPanelInfo.show_y_tickline2,
            custom_min2: aPanelInfo.custom_min2,
            custom_max2: aPanelInfo.custom_max2,
            custom_drilldown_min2: aPanelInfo.custom_drilldown_min2,
            custom_drilldown_max2: aPanelInfo.custom_drilldown_max2,
            use_ucl2: aPanelInfo.use_ucl2,
            ucl2_value: aPanelInfo.ucl2_value,
            use_lcl2: aPanelInfo.use_lcl2,
            lcl2_value: aPanelInfo.lcl2_value,
        },
        display: {
            show_legend: aPanelInfo.show_legend,
            use_zoom: aPanelInfo.use_zoom,
            chart_type: aPanelInfo.chart_type,
            show_point: aPanelInfo.show_point,
            point_radius: aPanelInfo.point_radius,
            fill: aPanelInfo.fill,
            stroke: aPanelInfo.stroke,
        },
    };
};

export const flattenTagAnalyzerPanelInfo = (aPanelInfo: TagAnalyzerFlatPanelInfo | TagAnalyzerPanelInfo): TagAnalyzerFlatPanelInfo => {
    if (!isNestedPanelInfo(aPanelInfo)) {
        return aPanelInfo;
    }

    return {
        index_key: aPanelInfo.meta.index_key,
        chart_title: aPanelInfo.meta.chart_title,
        tag_set: aPanelInfo.data.tag_set,
        range_bgn: aPanelInfo.time.range_bgn,
        range_end: aPanelInfo.time.range_end,
        raw_keeper: aPanelInfo.data.raw_keeper,
        time_keeper: aPanelInfo.time.time_keeper,
        default_range: aPanelInfo.time.default_range,
        count: aPanelInfo.data.count,
        interval_type: aPanelInfo.data.interval_type,
        show_legend: aPanelInfo.display.show_legend,
        use_zoom: aPanelInfo.display.use_zoom,
        use_time_keeper: aPanelInfo.time.use_time_keeper,
        show_x_tickline: aPanelInfo.axes.show_x_tickline,
        pixels_per_tick_raw: aPanelInfo.axes.pixels_per_tick_raw,
        pixels_per_tick: aPanelInfo.axes.pixels_per_tick,
        use_sampling: aPanelInfo.axes.use_sampling,
        sampling_value: aPanelInfo.axes.sampling_value,
        zero_base: aPanelInfo.axes.zero_base,
        show_y_tickline: aPanelInfo.axes.show_y_tickline,
        custom_min: aPanelInfo.axes.custom_min,
        custom_max: aPanelInfo.axes.custom_max,
        custom_drilldown_min: aPanelInfo.axes.custom_drilldown_min,
        custom_drilldown_max: aPanelInfo.axes.custom_drilldown_max,
        use_ucl: aPanelInfo.axes.use_ucl,
        ucl_value: aPanelInfo.axes.ucl_value,
        use_lcl: aPanelInfo.axes.use_lcl,
        lcl_value: aPanelInfo.axes.lcl_value,
        use_right_y2: aPanelInfo.axes.use_right_y2,
        zero_base2: aPanelInfo.axes.zero_base2,
        show_y_tickline2: aPanelInfo.axes.show_y_tickline2,
        custom_min2: aPanelInfo.axes.custom_min2,
        custom_max2: aPanelInfo.axes.custom_max2,
        custom_drilldown_min2: aPanelInfo.axes.custom_drilldown_min2,
        custom_drilldown_max2: aPanelInfo.axes.custom_drilldown_max2,
        use_ucl2: aPanelInfo.axes.use_ucl2,
        ucl2_value: aPanelInfo.axes.ucl2_value,
        use_lcl2: aPanelInfo.axes.use_lcl2,
        lcl2_value: aPanelInfo.axes.lcl2_value,
        chart_type: aPanelInfo.display.chart_type,
        show_point: aPanelInfo.display.show_point,
        point_radius: aPanelInfo.display.point_radius,
        fill: aPanelInfo.display.fill,
        stroke: aPanelInfo.display.stroke,
    };
};

export type TagAnalyzerChartSeriesItem = {
    name: string;
    data: Array<[number, number]>;
    yAxis: number;
    marker?: {
        symbol?: string;
        lineColor?: string | null;
        lineWidth?: number;
    };
    color?: string;
    [key: string]: unknown;
};

export type TagAnalyzerChartRow = [number, number];

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

export type TagAnalyzerTimeConversionTarget = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    tag_set: TagAnalyzerTagItem[];
};

export type TagAnalyzerPanelHeaderState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEdit?: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isSelectionActive: boolean;
    canOpenFft: boolean;
    canSaveLocal: boolean;
};

export type TagAnalyzerPanelHeaderActions = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleSelection: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
    onOpenEdit: () => void;
    onDelete: () => void;
};

export type TagAnalyzerPanelHeaderSavedToLocalInfo = {
    chartData: unknown;
    chartRef: unknown;
};

export type TagAnalyzerPanelHeaderProps = {
    pHeaderState: TagAnalyzerPanelHeaderState;
    pHeaderActions: TagAnalyzerPanelHeaderActions;
    pSavedToLocalInfo: TagAnalyzerPanelHeaderSavedToLocalInfo;
};

export type TagAnalyzerPanelFooterDisplay = {
    tagCount: number;
    showLegend: TagAnalyzerYN;
};

export type TagAnalyzerNewEChartRefs = {
    areaChart: unknown;
    chartWrap: unknown;
};

export type TagAnalyzerNewEChartModel = {
    panelInfo: TagAnalyzerPanelInfo;
    isRaw: boolean;
    navigatorData?: TagAnalyzerChartData;
    chartData?: TagAnalyzerChartSeriesItem[];
    panelRange: TagAnalyzerTimeRange;
    navigatorRange: TagAnalyzerTimeRange;
    isUpdate: boolean;
};

export type TagAnalyzerNewEChartActions = {
    onSetExtremes: (event: unknown) => unknown;
    onSetNavigatorExtremes: (event: unknown) => unknown;
    onSelection: (event: unknown) => unknown;
};

export type TagAnalyzerNewEChartProps = {
    pChartRefs: TagAnalyzerNewEChartRefs;
    pChartModel: TagAnalyzerNewEChartModel;
    pChartActions: TagAnalyzerNewEChartActions;
};

export type TagAnalyzerPanelBodyPopupState = {
    minMaxList: TagAnalyzerMinMaxItem[];
    isFFTModal: boolean;
    setIsFFTModal: Dispatch<SetStateAction<boolean>>;
    fftMinTime: number;
    fftMaxTime: number;
    isMinMaxMenu: boolean;
    menuPosition: CordinateType;
};

export type TagAnalyzerPanelBodyActions = {
    onMoveTimeRange: (aItem: string) => void;
    onCloseMinMaxPopup: () => void;
    getDuration: (aStartTime: number, aEndTime: number) => string;
};

export type TagAnalyzerPanelBodyProps = {
    pChartRefs: TagAnalyzerNewEChartRefs;
    pChartModel: TagAnalyzerNewEChartModel;
    pChartActions: TagAnalyzerNewEChartActions;
    pBodyActions: TagAnalyzerPanelBodyActions;
    pPopupState: TagAnalyzerPanelBodyPopupState;
};
