import type { buildChartSeriesOption } from '../options/ChartOptionBuilder';
import type { EChartDataZoomOptionStateItem } from './ChartInteractionTypes';

export type PanelChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode: 'single' | undefined;
    xAxisIndex: number | undefined;
};

export type PanelChartAction =
    | { type: 'takeGlobalCursor'; key: 'brush'; brushOption: PanelChartBrushOption }
    | { type: 'brush'; areas: [] }
    | { type: 'dataZoom'; startValue: number; endValue: number };

export type PanelChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

export type PanelChartSeriesOptionPatch = ReturnType<typeof buildChartSeriesOption>;

export type PanelChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

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
    data: Record<string, unknown>;
    event: { event: Partial<{ clientX: number; clientY: number }> };
}>;

export type PanelChartInstance = {
    dispatchAction: (action: PanelChartAction) => void;
    getOption: (() => PanelChartOptionState) | undefined;
    setOption: ((option: PanelChartSeriesOptionPatch, options?: { lazyUpdate?: boolean }) => void) | undefined;
    containPixel?: (finder: { gridIndex: number }, value: [number, number]) => boolean;
    convertFromPixel?: (finder: { xAxisIndex: number }, value: [number, number]) => unknown;
};

export type PanelChartWrapperHandle = {
    getEchartsInstance: () => PanelChartInstance;
};
