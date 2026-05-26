import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from './time/TimeTypes';
import type { PanelSeriesDefinition } from './SeriesDomain';

export type ValueRange = {
    min: number;
    max: number;
};

export const DEFAULT_VALUE_RANGE: ValueRange = { min: 0, max: 0 };

const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

const DEFAULT_PANEL_ECHART_TYPE: PanelEChartType = 'Line';

const PANEL_ECHART_TYPE_LOOKUP: Record<PanelEChartType, true> = {
    Line: true,
    Zone: true,
    Dot: true,
};

function isPanelEChartType(value: unknown): value is PanelEChartType {
    return typeof value === 'string' && value in PANEL_ECHART_TYPE_LOOKUP;
}

export function normalizePanelEChartType(value: unknown): PanelEChartType {
    return isPanelEChartType(value) ? value : DEFAULT_PANEL_ECHART_TYPE;
}

export type PanelMeta = {
    index_key: string;
    chart_title: string;
};

export type PanelData = {
    tag_set: PanelSeriesDefinition[];
    count: number;
    interval_type: string | undefined;
};

type PanelToolbarConfig = {
    isRaw: boolean;
};

export type PanelTime = {
    rangeConfig: TimeRangeConfig;
    useLastViewedRange: boolean;
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined;
};

export type PanelAxisThreshold = {
    enabled: boolean;
    value: number;
};

export type PanelXAxis = {
    show_tickline: boolean;
    raw_data_pixels_per_tick: number;
    calculated_data_pixels_per_tick: number;
};

export type PanelSampling = {
    enabled: boolean;
    sample_count: number;
};

export type PanelYAxis = {
    zero_base: boolean;
    show_tickline: boolean;
    value_range: ValueRange;
    raw_data_value_range: ValueRange;
    upper_control_limit: PanelAxisThreshold;
    lower_control_limit: PanelAxisThreshold;
};

export type PanelAxes = {
    x_axis: PanelXAxis;
    sampling: PanelSampling;
    main_chart_sampling: PanelSampling;
    left_y_axis: PanelYAxis;
    right_y_axis: PanelYAxis;
    right_y_axis_enabled: boolean;
};

export type PanelDisplay = {
    show_legend: boolean;
    use_zoom: boolean;
    chart_type: PanelEChartType;
    connect_nulls: boolean;
    show_point: boolean;
    point_radius: number;
    fill: number;
    stroke: number;
};

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';

export type PanelHighlight = {
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
};

export type PanelAnnotation = {
    seriesKey: string;
    text: string;
    timeRange: TimeRangeMs;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

export type PanelInfo = {
    meta: PanelMeta;
    data: PanelData;
    toolbar: PanelToolbarConfig;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
    use_normalize: boolean;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export type PanelOverlayMode =
    | 'noOverlay'
    | 'highlight'
    | 'annotation'
    | 'dragSelect';

export type PanelZoomActions = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorShiftActions = {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeState = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

export type PanelRangeHandlers = {
    onPanelRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onPanelRangeChangeFromNavigator: (event: PanelRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
};

type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
};

export type PanelBrushSelectionEvent = {
    min: number;
    max: number;
};

export type PanelChartHandle = {
    getVisibleSeries: () => PanelVisibleSeriesItem[];
};

export type PanelChartState = {
    axes: PanelAxes;
    display: PanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (
        position: { x: number; y: number },
        seriesIndex: number | undefined,
        timestamp: number,
    ) => unknown;
    onActivateHighlightEditor: (
        position: { x: number; y: number },
        highlightIndex: number,
    ) => unknown;
    onActivateAnnotationEditor: (
        position: { x: number; y: number },
        annotationIndex: number,
    ) => unknown;
};
