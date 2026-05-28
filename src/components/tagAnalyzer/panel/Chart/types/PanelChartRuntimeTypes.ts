import type { buildChartSeriesOption } from '../options/buildPanelChartOption';

export type EChartDataZoomEventItem = {
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
    start?: number;
    end?: number;
    startValue?: number | string | Date;
    endValue?: number | string | Date;
};

export type EChartBrushAreaPayload = {
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

export type PanelChartAction =
    | { type: 'takeGlobalCursor'; key: 'brush'; brushOption: PanelChartBrushOption }
    | { type: 'brush'; areas: [] }
    | { type: 'dataZoom'; startValue: number; endValue: number };

type PanelChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

type PanelChartSeriesOptionPatch = ReturnType<typeof buildChartSeriesOption>;
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

export type PanelChartClickPayload = Partial<{
    componentType: string;
    componentSubType: string;
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    dataIndex: number;
    data: unknown;
    value: unknown;
    axisValue: number | string;
    event: Partial<{
        clientX: number;
        clientY: number;
        offsetX: number;
        offsetY: number;
        zrX: number;
        zrY: number;
        event: Partial<{
            clientX: number;
            clientY: number;
            offsetX: number;
            offsetY: number;
        }>;
    }>;
}>;

export type PanelChartBlankClickPayload = Partial<{
    target: unknown;
    offsetX: number;
    offsetY: number;
    zrX: number;
    zrY: number;
    event: Partial<{
        clientX: number;
        clientY: number;
        offsetX: number;
        offsetY: number;
        zrX: number;
        zrY: number;
        event: Partial<{
            clientX: number;
            clientY: number;
            offsetX: number;
            offsetY: number;
        }>;
    }>;
}>;

export type PanelChartZrElement = {
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
    getOption: (() => PanelChartOptionState) | undefined;
    setOption: ((option: PanelChartSeriesOptionPatch, options?: { lazyUpdate?: boolean }) => void) | undefined;
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

