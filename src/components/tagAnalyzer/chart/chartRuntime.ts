import type {
    ECElementEvent,
    EChartsOption,
    EChartsType,
    ElementEvent,
} from 'echarts';
import type { RangeState } from '../range/rangeModel';
import type { PanelHighlight } from '../markup/markupModel';
import { type PanelInfo, type PanelYAxis } from '../panel/panelModel';
import { type ChartSeriesData, type ChartSeriesVisibilityMap } from './chartData';

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export type PanelOverlayCursorHintState = {
    x: number;
    y: number;
    isValidTarget: boolean;
    hoveredMainSeriesName: string | undefined;
    overlayMode:
        | PanelOverlayMode.ANNOTATION
        | PanelOverlayMode.HIGHLIGHT
        | PanelOverlayMode.DRAG_SELECT;
};

// ECharts boundary types
type EChartDataZoomEventItem = Partial<{
    id: string;
    dataZoomId: string;
    start: number;
    end: number;
    startValue: number | string | Date;
    endValue: number | string | Date;
}>;

export type EChartDataZoomEventPayload =
    | EChartDataZoomEventItem
    | {
          batch: EChartDataZoomEventItem[];
      };

export type EChartDataZoomOptionStateItem = EChartDataZoomEventItem;

type EChartBrushAreaPayload = {
    coordRange?: [number, number];
    range?: [number, number];
};

type EChartBrushSelection = { areas?: EChartBrushAreaPayload[] };

export type EChartBrushPayload = EChartBrushSelection & {
    batch?: EChartBrushSelection[];
};

export type PanelChartLegendChangePayload = {
    selected: ChartSeriesVisibilityMap | undefined;
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

export type PanelChartClickPayload = Partial<ECElementEvent> & {
    axisValue?: number | string;
};
export type PanelChartBlankClickPayload = ElementEvent;
export type PanelChartInstance = Omit<EChartsType, 'getOption' | 'setOption'> & {
    getOption?: () => {
        dataZoom: EChartDataZoomOptionStateItem[] | undefined;
    };
    setOption?: (
        option: EChartsOption,
        options?: {
            lazyUpdate?: boolean;
            notMerge?: boolean;
            replaceMerge?: string | string[];
        },
    ) => void;
};

// Runtime config
export function resolveRuntimePanelChartConfig(
    panelInfo: PanelInfo,
) {
    return {
        query: panelInfo.query,
        mode: panelInfo.mode,
        highlights: panelInfo.highlights,
        annotations: panelInfo.annotations,
        axes: {
            x: { ...panelInfo.axes.x },
            leftY: resolvePanelYAxisForRuntime(panelInfo.axes.leftY),
            rightY: resolvePanelYAxisForRuntime(panelInfo.axes.rightY),
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

export type RuntimePanelChartConfig = ReturnType<typeof resolveRuntimePanelChartConfig>;
export type RuntimePanelAxes = RuntimePanelChartConfig['axes'];
export type RuntimePanelDisplay = RuntimePanelChartConfig['display'];

export type PanelChartRuntime = {
    config: RuntimePanelChartConfig;
    data: {
        chartData: ChartSeriesData[];
        navigatorChartData: ChartSeriesData[];
    };
    ranges: RangeState;
    interaction: {
        visibleSeries: ChartSeriesVisibilityMap;
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

function resolvePanelYAxisForRuntime(axis: PanelYAxis) {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: { ...axis.valueRange },
        rawValueRange: { ...axis.rawValueRange },
        upperControlLimit: {
            enabled: axis.upperControlLimit.enabled,
            value: axis.upperControlLimit.value ?? 0,
        },
        lowerControlLimit: {
            enabled: axis.lowerControlLimit.enabled,
            value: axis.lowerControlLimit.value ?? 0,
        },
    };
}

// Navigator cursor
const NAVIGATOR_BODY_CURSOR = 'grab';
const NAVIGATOR_BODY_ACTIVE_CURSOR = 'grabbing';
const NAVIGATOR_EDGE_CURSOR = 'ew-resize';

type NavigatorElement = ReturnType<
    ReturnType<PanelChartInstance['getZr']>['storage']['getDisplayList']
>[number] & { __tagAnalyzerNavigatorCursor?: string };

function setCursor(element: NavigatorElement, cursor: string): void {
    element.attr?.({ cursor });
    element.cursor = cursor;
}

function setNavigatorElementCursor(
    element: NavigatorElement,
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
    const sDisplayList = instance?.getZr?.()?.storage?.getDisplayList?.() as
        | NavigatorElement[]
        | undefined;

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
