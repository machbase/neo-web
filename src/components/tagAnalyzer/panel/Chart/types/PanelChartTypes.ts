import type {
    PanelAnnotation,
    PanelHighlight,
    RuntimePanelAxes,
    RuntimePanelDisplay,
} from '../../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../../domain/time/model/TimeTypes';
import type { ChartSeriesData } from '../../../domain/ChartDomain';

export type ChartInfo = {
    mainSeriesData: ChartSeriesData[];
    seriesDefinitions: PanelSeriesDefinition[];
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    axes: RuntimePanelAxes;
    display: RuntimePanelDisplay;
    isRaw: boolean;
    useNormalize: boolean;
    visibleSeries: Record<string, boolean>;
    navigatorSeriesData: ChartSeriesData[];
    isNumericXAxis: boolean;
    isWheelZoomEnabled: boolean;
    hoveredLegendSeries?: string;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

