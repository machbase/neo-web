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
