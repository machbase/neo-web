import { type EChartsOption } from 'echarts';
import type { PanelRangeState } from '../range/rangeModel';
import { AUTO_VALUE_RANGE, type PanelAxes, type PanelAxisThreshold, type PanelDisplay, type PanelHighlight, type PanelInfo, type PanelSampling, type PanelYAxis, type ValueRange } from '../model';
import { type ChartSeriesData } from './chartData';

// ECharts boundary types
export type EChartDataZoomEventItem = {
    id?: string;
    dataZoomId?: string;
    start: number;
    end: number;
    startValue?: number;
    endValue?: number;
};

export type EChartDataZoomEventPayload =
    | EChartDataZoomEventItem
    | {
          batch: EChartDataZoomEventItem[];
      };

export type EChartDataZoomOptionStateItem = {
    id?: string;
    dataZoomId?: string;
    start?: number;
    end?: number;
    startValue?: number | string | Date;
    endValue?: number | string | Date;
};

type EChartBrushAreaPayload = {
    coordRange: [number, number] | undefined;
    range: [number, number] | undefined;
};

export type EChartBrushPayload = {
    areas: EChartBrushAreaPayload[] | undefined;
    batch:
        | Array<{
              areas: EChartBrushAreaPayload[] | undefined;
          }>
        | undefined;
};

type PanelChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode?: 'single';
    xAxisIndex?: number;
};

type PanelChartAction =
    | { type: 'takeGlobalCursor'; key: 'brush'; brushOption: PanelChartBrushOption }
    | { type: 'brush'; areas: [] }
    | { type: 'dataZoom'; dataZoomId?: string; startValue: number; endValue: number }
    | { type: 'hideTip' };

type PanelChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

type PanelChartPixelFinder = { xAxisIndex: number } | { gridIndex: number };

export type PanelChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

export type PanelChartAxisPointerPayload = Partial<{
    axesInfo: Array<
        Partial<{
            axisDim: string;
            axisIndex: number;
            value: unknown;
        }>
    >;
}>;

export type PanelChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

type PanelChartPointerCoordinates = Partial<{
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
    zrX: number;
    zrY: number;
}>;

type PanelChartPointerPayload = PanelChartPointerCoordinates & {
    event?: PanelChartPointerCoordinates & {
        event?: PanelChartPointerCoordinates;
    };
};

export type PanelChartClickPayload = PanelChartPointerPayload & Partial<{
    componentType: string;
    componentSubType: string;
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    dataIndex: number;
    data: unknown;
    value: unknown;
    axisValue: number | string;
}>;

export type PanelChartBlankClickPayload = PanelChartPointerPayload & {
    target?: unknown;
};

type PanelChartZrElement = {
    type?: string;
    draggable?: boolean;
    cursor?: string;
    __tagAnalyzerNavigatorCursor?: string;
    attr?: (attributes: { cursor: string }) => void;
    on?: (
        eventName: 'mousedown' | 'mouseup' | 'mouseout' | 'dragend',
        handler: () => void,
    ) => void;
};

export type PanelChartInstance = {
    dispatchAction: (action: PanelChartAction) => void;
    getOption?: () => PanelChartOptionState;
    setOption?: (
        option: EChartsOption,
        options?: {
            lazyUpdate?: boolean;
            notMerge?: boolean;
            replaceMerge?: string | string[];
        },
    ) => void;
    clear?: () => void;
    hideLoading?: () => void;
    containPixel?: (finder: { gridIndex: number }, value: [number, number]) => boolean;
    convertFromPixel?: (finder: PanelChartPixelFinder, value: [number, number]) => unknown;
    getZr?: () => {
        on?: (eventName: 'click', handler: (event: PanelChartBlankClickPayload) => void) => void;
        off?: (eventName: 'click', handler: (event: PanelChartBlankClickPayload) => void) => void;
        storage?: {
            getDisplayList?: () => PanelChartZrElement[];
        };
    };
};

// Runtime config
type WithDefinedFields<T, K extends keyof T> = Omit<T, K> & {
    [P in K]-?: Exclude<T[P], undefined>;
};

type RuntimePanelAxisThreshold = WithDefinedFields<
    PanelAxisThreshold,
    'value'
>;

type RuntimePanelYAxis = Omit<
    PanelYAxis,
    'upperControlLimit' | 'lowerControlLimit'
> & {
    upperControlLimit: RuntimePanelAxisThreshold;
    lowerControlLimit: RuntimePanelAxisThreshold;
};

export type RuntimePanelAxes = {
    x: PanelAxes['x'];
    leftY: RuntimePanelYAxis;
    rightY: RuntimePanelYAxis;
    rightYEnabled: boolean;
};

export type RuntimePanelDisplay = Omit<
    WithDefinedFields<PanelDisplay, 'pointRadius' | 'fill' | 'stroke'>,
    | 'chartType'
    | 'pixelsPerTick'
    | 'mainChartSampling'
    | 'rawNavigatorSampling'
>;

export type RuntimePanelChartConfig = Pick<
    PanelInfo,
    'query' | 'mode' | 'highlights' | 'annotations'
> & {
    axes: RuntimePanelAxes;
    display: RuntimePanelDisplay;
};

export type PanelChartRuntime = {
    config: RuntimePanelChartConfig;
    data: {
        mainSeriesData: ChartSeriesData[];
        navigatorSeriesData: ChartSeriesData[];
    };
    ranges: PanelRangeState;
    interaction: {
        visibleSeries: Record<string, boolean>;
        hoveredLegendSeries?: string;
        draftHighlight?: PanelHighlight;
        isWheelZoomEnabled: boolean;
    };
    rendering: {
        isNumericXAxis: boolean;
        animateMainDataUpdate: boolean;
        animateNavigatorDataUpdate: boolean;
    };
};

export function resolveRuntimePanelChartConfig(
    panelInfo: PanelInfo,
): RuntimePanelChartConfig {
    assertValidPanelSampling(
        panelInfo.display.mainChartSampling,
        'main chart sampling',
    );

    return {
        query: panelInfo.query,
        mode: panelInfo.mode,
        highlights: panelInfo.highlights,
        annotations: panelInfo.annotations,
        axes: {
            x: { ...panelInfo.axes.x },
            leftY: resolvePanelYAxisForRuntime(
                panelInfo.axes.leftY,
                'left y-axis',
            ),
            rightY: resolvePanelYAxisForRuntime(
                panelInfo.axes.rightY,
                'right y-axis',
            ),
            rightYEnabled: panelInfo.axes.rightY.enabled,
        },
        display: {
            showLegend: panelInfo.display.showLegend,
            showPoint: panelInfo.display.showPoint,
            connectNulls: panelInfo.display.connectNulls,
            useZoom: panelInfo.display.useZoom,
            pointRadius: panelInfo.display.pointRadius ?? 0,
            fill: panelInfo.display.fill ?? 0,
            stroke: panelInfo.display.stroke ?? 0,
        },
    };
}

function assertValidPanelSampling(
    sampling: PanelSampling,
    label: string,
): void {
    if (
        sampling.enabled &&
        (sampling.sampleCount === undefined ||
            !Number.isFinite(sampling.sampleCount) ||
            sampling.sampleCount <= 0)
    ) {
        throw new Error(`${label} requires a positive sample count when enabled.`);
    }
}

function resolvePanelYAxisForRuntime(
    axis: PanelYAxis,
    label: string,
): RuntimePanelYAxis {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: resolveValueRangeForRuntime(
            axis.valueRange,
            `${label} value range`,
        ),
        rawValueRange: resolveValueRangeForRuntime(
            axis.rawValueRange,
            `${label} raw value range`,
        ),
        upperControlLimit: resolveAxisThresholdForRuntime(
            axis.upperControlLimit,
            `${label} upper control limit`,
        ),
        lowerControlLimit: resolveAxisThresholdForRuntime(
            axis.lowerControlLimit,
            `${label} lower control limit`,
        ),
    };
}

function resolveValueRangeForRuntime(
    range: ValueRange,
    label: string,
): ValueRange {
    const sMin = range.min;
    const sMax = range.max;

    if (sMin === undefined || sMax === undefined) {
        if (sMin !== sMax) {
            throw new Error(`${label} requires both min and max values.`);
        }
        return { ...AUTO_VALUE_RANGE };
    }

    if (!Number.isFinite(sMin) || !Number.isFinite(sMax)) {
        throw new Error(`${label} min and max must be finite numbers.`);
    }

    if (sMin >= sMax) {
        throw new Error(`${label} min must be less than max.`);
    }

    return { min: sMin, max: sMax };
}

function resolveAxisThresholdForRuntime(
    threshold: PanelAxisThreshold,
    label: string,
): RuntimePanelAxisThreshold {
    if (
        threshold.enabled &&
        (threshold.value === undefined ||
            !Number.isFinite(threshold.value))
    ) {
        throw new Error(`${label} requires a finite value when enabled.`);
    }

    return {
        enabled: threshold.enabled,
        value: threshold.value ?? 0,
    };
}

// Navigator cursor
const NAVIGATOR_BODY_CURSOR = 'grab';
const NAVIGATOR_BODY_ACTIVE_CURSOR = 'grabbing';
const NAVIGATOR_EDGE_CURSOR = 'ew-resize';

function setCursor(element: PanelChartZrElement, cursor: string): void {
    element.attr?.({ cursor });
    element.cursor = cursor;
}

function setNavigatorElementCursor(
    element: PanelChartZrElement,
    cursor: string,
    activeCursor = cursor,
): void {
    if (element.__tagAnalyzerNavigatorCursor === cursor) {
        setCursor(element, cursor);
        return;
    }

    element.__tagAnalyzerNavigatorCursor = cursor;
    element.on?.('mousedown', () => setCursor(element, activeCursor));
    element.on?.('mouseup', () => setCursor(element, cursor));
    element.on?.('mouseout', () => setCursor(element, cursor));
    element.on?.('dragend', () => setCursor(element, cursor));
    setCursor(element, cursor);
}

export function applyPanelNavigatorCursorStyles(
    instance: PanelChartInstance | undefined,
): void {
    const sDisplayList = instance?.getZr?.()?.storage?.getDisplayList?.();

    if (!sDisplayList) {
        return;
    }

    for (const element of sDisplayList) {
        if (!element.draggable || element.cursor !== NAVIGATOR_EDGE_CURSOR) {
            continue;
        }

        if (element.type === 'rect') {
            setNavigatorElementCursor(
                element,
                NAVIGATOR_BODY_CURSOR,
                NAVIGATOR_BODY_ACTIVE_CURSOR,
            );
            continue;
        }

        if (element.type === 'path') {
            setNavigatorElementCursor(element, NAVIGATOR_EDGE_CURSOR);
        }
    }
}
