import type { PanelAxes, PanelDisplay, PanelHighlight } from '../utils/panelModelTypes';
import type {
    ChartSeriesData,
    PanelSeriesDefinition,
} from '../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

export type PanelChartInfo = {
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
