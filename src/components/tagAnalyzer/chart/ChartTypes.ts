import type { PanelAxes, PanelDisplay, PanelHighlight } from '../domain/PanelModel';
import type {
    PanelSeriesDefinition,
    PanelSeriesSourceColumns,
} from '../domain/SeriesModel';
import type { TimeRangeMs } from '../time/TimeTypes';

export type ChartRow = [number, number];

export type ChartSeriesData = {
    name: string;
    data: ChartRow[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
    [key: string]: unknown;
};

export type ChartData = {
    datasets: ChartSeriesData[];
};

export type ChartInfo = {
    mainSeriesData: ChartSeriesData[];
    seriesDefinitions: PanelSeriesDefinition[];
    navigatorRange: TimeRangeMs;
    axes: PanelAxes;
    display: PanelDisplay;
    isRaw: boolean;
    useNormalize: boolean;
    visibleSeries: Record<string, boolean>;
    navigatorSeriesData: ChartSeriesData[];
    hoveredLegendSeries?: string;
    highlights: PanelHighlight[];
};

export type SelectedRangeSeriesSummary = {
    seriesIndex: number;
    table: string;
    name: string;
    alias: string;
    sourceColumns: PanelSeriesSourceColumns;
    min: string;
    max: string;
    avg: string;
};
