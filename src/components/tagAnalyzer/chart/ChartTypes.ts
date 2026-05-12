import type { PanelAxes, PanelDisplay, PanelHighlight } from '../domain/PanelModel';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import type { TimeRangeMs } from '../time/TimeTypes';
import type { ChartSeriesData } from '../domain/ChartDataModel';

export type {
    ChartData,
    ChartRow,
    ChartSeriesData,
    SelectedRangeSeriesSummary,
} from '../domain/ChartDataModel';

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

