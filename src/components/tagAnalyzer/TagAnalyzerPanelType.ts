import type { Dispatch, SetStateAction } from 'react';

export type TagAnalyzerYN = 'Y' | 'N';
export type TagAnalyzerRangeValue = string | number | '';
export type TagAnalyzerPanelChangeType = 'delete' | 'changed';

export type TagAnalyzerTimeRange = {
    startTime: number | undefined;
    endTime: number | undefined;
};

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

export type TagAnalyzerPanelInfo = {
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

export type TagAnalyzerPanelInfoSetter = Dispatch<SetStateAction<TagAnalyzerPanelInfo>>;

export type TagAnalyzerPanelFooterSetButtonRangeProp = (aType?: string, aZoom?: number) => void;
export type TagAnalyzerPanelFooterPanelInfoProp = TagAnalyzerPanelInfo;
export type TagAnalyzerPanelFooterNavigatorRangeProp = TagAnalyzerTimeRange;
export type TagAnalyzerPanelFooterMoveNavigatorTimRangeProp = (aItem: string) => void;

export type TagAnalyzerPanelHeaderProps = {
    pSetSelectedChart: Dispatch<SetStateAction<boolean>>;
    pGetChartInfo: (...args: unknown[]) => unknown;
    pIsEdit?: boolean;
    pPanelRange: TagAnalyzerTimeRange;
    pFetchPanelData: (...args: unknown[]) => unknown;
    pSetGlobalTimeRange: (...args: unknown[]) => unknown;
    pBoardInfo: unknown;
    pPanelInfo: TagAnalyzerPanelInfo;
    pSetIsRaw: () => void;
    pIsRaw: boolean;
    pResetData: () => void | Promise<void>;
    pPanelsInfo: unknown;
    pSelectedChart: boolean;
    pRangeOption: TagAnalyzerIntervalOption;
    pSetIsFFTModal: Dispatch<SetStateAction<boolean>>;
    pIsUpdate: boolean;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
    pNavigatorRange: TagAnalyzerTimeRange;
    pCtrMinMaxPopupModal: () => void;
    pIsMinMaxMenuOpen: boolean;
    pChartData: unknown;
    pChartRef: unknown;
    pOnEditRequest?: (data: unknown) => void;
};

export type TagAnalyzerNewEChartProps = {
    pAreaChart: unknown;
    pChartWrap: unknown;
    pPanelInfo: TagAnalyzerPanelInfo;
    pIsRaw: boolean;
    pSetExtremes: (event: unknown) => unknown;
    pSetNavigatorExtremes: (event: unknown) => unknown;
    pNavigatorData?: TagAnalyzerChartData;
    pChartData?: TagAnalyzerChartSeriesItem[];
    pPanelRange: TagAnalyzerTimeRange;
    pNavigatorRange: TagAnalyzerTimeRange;
    pViewMinMaxPopup: (event: unknown) => unknown;
    pIsUpdate: boolean;
    pMinMaxList?: TagAnalyzerMinMaxItem[];
};
