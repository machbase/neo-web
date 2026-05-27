import type {
    PanelAnnotation,
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import type { ChartSeriesData } from '../../domain/ChartDomain';

export type ChartInfo = {
    mainSeriesData: ChartSeriesData[];
    seriesDefinitions: PanelSeriesDefinition[];
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    axes: PanelAxes;
    display: PanelDisplay;
    isRaw: boolean;
    useNormalize: boolean;
    visibleSeries: Record<string, boolean>;
    navigatorSeriesData: ChartSeriesData[];
    navigatorSelectionMinValueSpan: number | undefined;
    isNumericXAxis: boolean;
    hoveredLegendSeries?: string;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

