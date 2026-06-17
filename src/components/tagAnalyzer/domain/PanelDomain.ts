import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from './time/model/TimeTypes';
import type { PanelSeriesDefinition } from './SeriesDomain';

export type ValueRange = {
    min: number | undefined;
    max: number | undefined;
};

export const DEFAULT_VALUE_RANGE: ValueRange = { min: 0, max: 0 };

const PANEL_ECHART_TYPE_VALUES = ['Line', 'Zone', 'Dot', 'Custom'] as const;

export type PanelEChartType = (typeof PANEL_ECHART_TYPE_VALUES)[number];

const DEFAULT_PANEL_ECHART_TYPE: PanelEChartType = 'Line';
const PANEL_ECHART_TYPE_LOOKUP: Record<PanelEChartType, true> = {
    Line: true,
    Zone: true,
    Dot: true,
    Custom: true,
};

function isPanelEChartType(value: unknown): value is PanelEChartType {
    return typeof value === 'string' && value in PANEL_ECHART_TYPE_LOOKUP;
}

export function normalizePanelEChartType(value: unknown): PanelEChartType {
    return isPanelEChartType(value) ? value : DEFAULT_PANEL_ECHART_TYPE;
}

export type PanelGeneral = {
    chart_title: string;
    use_zoom: boolean;
    use_last_viewed_range: boolean;
    last_viewed_range: PanelNavigatorRangePair | undefined;
    is_raw: boolean;
    is_order_by: boolean;
    use_normalize: boolean;
};

export type PanelData = {
    index_key: string;
    tag_set: PanelSeriesDefinition[];
    count: number | undefined;
    interval_type: string | undefined;
};

export type PanelTime = {
    range_config: TimeRangeConfig;
};

export type PanelAxisThreshold = {
    enabled: boolean;
    value: number | undefined;
};

export type PanelXAxis = {
    show_tickline: boolean;
    raw_data_pixels_per_tick: number | undefined;
    calculated_data_pixels_per_tick: number | undefined;
};

export type PanelSampling = {
    enabled: boolean;
    sample_count: number | undefined;
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
    chart_type: PanelEChartType;
    connect_nulls: boolean;
    show_point: boolean;
    point_radius: number | undefined;
    fill: number | undefined;
    stroke: number | undefined;
};

export type RuntimeValueRange = {
    min: number;
    max: number;
};

export type RuntimePanelAxisThreshold = {
    enabled: boolean;
    value: number;
};

export type RuntimePanelXAxis = {
    show_tickline: boolean;
    raw_data_pixels_per_tick: number;
    calculated_data_pixels_per_tick: number;
};

export type RuntimePanelSampling = {
    enabled: boolean;
    sample_count: number;
};

export type RuntimePanelYAxis = {
    zero_base: boolean;
    show_tickline: boolean;
    value_range: RuntimeValueRange;
    raw_data_value_range: RuntimeValueRange;
    upper_control_limit: RuntimePanelAxisThreshold;
    lower_control_limit: RuntimePanelAxisThreshold;
};

export type RuntimePanelAxes = {
    x_axis: RuntimePanelXAxis;
    main_chart_sampling: RuntimePanelSampling;
    left_y_axis: RuntimePanelYAxis;
    right_y_axis: RuntimePanelYAxis;
    right_y_axis_enabled: boolean;
};

export type RuntimePanelDisplay = {
    show_legend: boolean;
    chart_type: PanelEChartType;
    connect_nulls: boolean;
    show_point: boolean;
    point_radius: number;
    fill: number;
    stroke: number;
    use_zoom: boolean;
};

export const DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR = '#fdb532';
export const DEFAULT_PANEL_HIGHLIGHT_LABEL = 'unnamed';

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
    general: PanelGeneral;
    data: PanelData;
    time: PanelTime;
    axes: PanelAxes;
    display: PanelDisplay;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export function resolvePanelAxesForRuntime(axes: PanelAxes): RuntimePanelAxes {
    return {
        x_axis: {
            show_tickline: axes.x_axis.show_tickline,
            raw_data_pixels_per_tick:
                axes.x_axis.raw_data_pixels_per_tick ?? 0,
            calculated_data_pixels_per_tick:
                axes.x_axis.calculated_data_pixels_per_tick ?? 0,
        },
        main_chart_sampling: resolvePanelSamplingForRuntime(
            axes.main_chart_sampling,
            'main chart sampling',
        ),
        left_y_axis: resolvePanelYAxisForRuntime(axes.left_y_axis, 'left y-axis'),
        right_y_axis: resolvePanelYAxisForRuntime(
            axes.right_y_axis,
            'right y-axis',
        ),
        right_y_axis_enabled: axes.right_y_axis_enabled,
    };
}

export function resolvePanelDisplayForRuntime(
    display: PanelDisplay,
    useZoom: boolean,
): RuntimePanelDisplay {
    return {
        ...display,
        use_zoom: useZoom,
        point_radius: display.point_radius ?? 0,
        fill: display.fill ?? 0,
        stroke: display.stroke ?? 0,
    };
}

function resolvePanelSamplingForRuntime(
    sampling: PanelSampling,
    label: string,
): RuntimePanelSampling {
    if (sampling.enabled && sampling.sample_count === undefined) {
        throw new Error(`${label} requires a sample count when enabled.`);
    }

    return {
        enabled: sampling.enabled,
        sample_count: sampling.sample_count ?? 0,
    };
}

function resolvePanelYAxisForRuntime(
    axis: PanelYAxis,
    label: string,
): RuntimePanelYAxis {
    return {
        zero_base: axis.zero_base,
        show_tickline: axis.show_tickline,
        value_range: resolveValueRangeForRuntime(
            axis.value_range,
            `${label} value range`,
        ),
        raw_data_value_range: resolveValueRangeForRuntime(
            axis.raw_data_value_range,
            `${label} raw data value range`,
        ),
        upper_control_limit: resolveAxisThresholdForRuntime(
            axis.upper_control_limit,
            `${label} upper control limit`,
        ),
        lower_control_limit: resolveAxisThresholdForRuntime(
            axis.lower_control_limit,
            `${label} lower control limit`,
        ),
    };
}

function resolveValueRangeForRuntime(
    range: ValueRange,
    label: string,
): RuntimeValueRange {
    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;

    if (sHasMin !== sHasMax) {
        throw new Error(`${label} requires both min and max values.`);
    }

    if (!sHasMin || !sHasMax) {
        return { min: 0, max: 0 };
    }

    if (sMin !== 0 || sMax !== 0) {
        if (sMin >= sMax) {
            throw new Error(`${label} min must be less than max.`);
        }
    }

    return { min: sMin, max: sMax };
}

function resolveAxisThresholdForRuntime(
    threshold: PanelAxisThreshold,
    label: string,
): RuntimePanelAxisThreshold {
    if (threshold.enabled && threshold.value === undefined) {
        throw new Error(`${label} requires a value when enabled.`);
    }

    return {
        enabled: threshold.enabled,
        value: threshold.value ?? 0,
    };
}

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

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
    fullRange: TimeRangeMs;
};

export type PanelRangeActions = {
    applyMainZoomRange: (event: PanelRangeChangeEvent) => unknown;
    applyMainNavigatorSelectionRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactMainRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactNavigatorRange: (event: PanelRangeChangeEvent) => unknown;
    shiftMainRangeLeft: () => void;
    shiftMainRangeRight: () => void;
};

type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
};

export type PanelChartHandle = {
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

export type PanelChartState = {
    axes: RuntimePanelAxes;
    display: RuntimePanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    useOrderBy: boolean;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export type PanelPoint = {
    x: number;
    y: number;
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (
        position: PanelPoint,
        seriesIndex: number | undefined,
        timestamp: number,
    ) => unknown;
    onActivateHighlightEditor: (
        position: PanelPoint,
        highlightIndex: number,
    ) => unknown;
    onActivateAnnotationEditor: (
        position: PanelPoint,
        annotationIndex: number,
    ) => unknown;
};
