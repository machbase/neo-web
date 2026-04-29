import type { PanelAxes, PanelDisplay, PanelHighlight } from '../utils/panelModelTypes';
import type { ChartSeriesData } from './ChartDataTypes';
import type { PanelSeriesDefinition } from '../series/PanelSeriesTypes';
import type { TimeRangeMs } from '../time/TimeTypes';

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
