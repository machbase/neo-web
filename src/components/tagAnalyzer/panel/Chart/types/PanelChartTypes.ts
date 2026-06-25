import type {
    PanelAnnotation,
    PanelHighlight,
} from '../../../domain/panel/PanelConfig';
import type {
    RuntimePanelAxes,
    RuntimePanelDisplay,
} from '../../../domain/panel/PanelRuntime';
import type { PanelSeriesDefinition } from '../../../domain/SeriesDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type { ChartSeriesData } from '../../../domain/ChartDomain';

export type ChartInfo = {
    mainSeriesData: ChartSeriesData[];
    seriesDefinitions: PanelSeriesDefinition[];
    displayPanelRange: TimeRangeMs;
    displayNavigatorRange: TimeRangeMs;
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
    draftHighlight?: PanelHighlight | undefined;
    annotations: PanelAnnotation[];
};

