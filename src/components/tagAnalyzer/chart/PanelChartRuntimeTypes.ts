import type { buildChartSeriesOption } from './options/ChartOptionBuilder';
import type { EChartDataZoomOptionStateItem } from './ChartInteractionTypes';

// Used by PanelChart to type brush option.
export type PanelChartBrushOption = {
    brushType: 'lineX' | false;
    brushMode: 'single' | undefined;
    xAxisIndex: number | undefined;
};

// Used by PanelChart to type action.
export type PanelChartAction =
    | {
          type: 'takeGlobalCursor';
          key: 'brush';
          brushOption: PanelChartBrushOption;
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
export type PanelChartOptionState = {
    dataZoom: EChartDataZoomOptionStateItem[] | undefined;
};

// Used by PanelChart to type hover-only option patches.
export type PanelChartSeriesOptionPatch = ReturnType<typeof buildChartSeriesOption>;

// Used by PanelChart to type legend change payload.
export type PanelChartLegendChangePayload = {
    selected: Record<string, boolean> | undefined;
};

// Used by PanelChart to type legend hover payload.
export type PanelChartHighlightPayload = Partial<{
    seriesName: string;
    name: string;
    excludeSeriesId: string[];
}>;

// Used by PanelChart to type click payload.
export type PanelChartClickPayload = Partial<{
    componentType: string;
    componentSubType: string;
    seriesId: string;
    seriesIndex: number;
    seriesName: string;
    dataIndex: number;
    data: Record<string, unknown>;
    event: {
        event: Partial<{
            clientX: number;
            clientY: number;
        }>;
    };
}>;

// Used by PanelChart to type instance.
export type PanelChartInstance = {
    dispatchAction: (action: PanelChartAction) => void;
    getOption: (() => PanelChartOptionState) | undefined;
    setOption:
        | ((
              option: PanelChartSeriesOptionPatch,
              options?: { lazyUpdate?: boolean },
          ) => void)
        | undefined;
    containPixel?: (
        finder: { gridIndex: number },
        value: [number, number],
    ) => boolean;
    convertFromPixel?: (
        finder: { xAxisIndex: number },
        value: [number, number],
    ) => unknown;
};

// Used by PanelChart to type wrapper handle.
export type PanelChartWrapperHandle = {
    getEchartsInstance: () => PanelChartInstance;
};
