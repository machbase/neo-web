import type { buildChartSeriesOption } from './options/ChartOptionBuilder';
import type {
    EChartDataZoomOptionStateItem,
} from './ChartInteractionTypes';

// Used by PanelChart to type brush option.
export type ChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode: 'single' | undefined;
    xAxisIndex: number | undefined;
};

// Used by PanelChart to type action.
export type ChartAction =
    | {
          type: 'takeGlobalCursor';
          key: 'brush';
          brushOption: ChartBrushOption;
      }
    | {
          type: 'brush';
          areas: [];
      }
    | {
          type: 'dataZoom';
          startValue: number;
          endValue: number;
      };

// Used by PanelChart to type option state.
export type ChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

// Used by PanelChart to type hover-only option patches.
export type ChartSeriesOptionState = ReturnType<typeof buildChartSeriesOption>;

// Used by PanelChart to type legend change payload.
export type ChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

// Used by PanelChart to type legend hover payload.
export type ChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

// Used by PanelChart to type click payload.
export type ChartClickPayload = Partial<{
    seriesId: string;
    dataIndex: number;
    event: {
        event: Partial<{
            clientX: number;
            clientY: number;
        }>;
    };
}>;

// Used by PanelChart to type instance.
export type ChartInstance = {
    dispatchAction: (aAction: ChartAction) => void;
    getOption: (() => ChartOptionState) | undefined;
    setOption:
        | ((aOption: ChartSeriesOptionState, aOptions?: { lazyUpdate?: boolean }) => void)
        | undefined;
    containPixel?: (
        aFinder: { gridIndex: number },
        aValue: [number, number],
    ) => boolean;
    convertFromPixel?: (
        aFinder: { xAxisIndex: number },
        aValue: [number, number],
    ) => unknown;
};

// Used by PanelChart to type wrapper handle.
export type ChartWrapperHandle = {
    getEchartsInstance: () => ChartInstance;
};
