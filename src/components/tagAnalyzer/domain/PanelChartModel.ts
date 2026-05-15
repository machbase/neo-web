import type { IntervalOption, TimeRangeMs } from './time/TimeTypes';
import type { ChartSeriesData } from './ChartDataModel';
import type { PanelAxes, PanelDisplay, PanelHighlight } from './PanelModel';
import type { PanelSeriesDefinition } from './SeriesModel';

export type PanelOverlayModeState = {
    isEditing: boolean;
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
    isDragSelectActive: boolean;
};

export type PanelZoomActions = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorShiftActions = {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeShiftActions = {
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

export type PanelRangeHandlers = {
    onPanelRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

export type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
    trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
};

export type PanelBrushSelectionEvent = {
    min?: number;
    max?: number;
};

export type PanelHighlightEditRequest = {
    highlightIndex: number;
    position: {
        x: number;
        y: number;
    };
};

export type PanelSeriesAnnotationEditRequest = {
    seriesIndex: number;
    annotationIndex: number;
    position: {
        x: number;
        y: number;
    };
};

export type PanelCreateAnnotationRequest = {
    timestamp: number;
    seriesIndex?: number;
    position: {
        x: number;
        y: number;
    };
};

export type PanelChartHandle = {
    setPanelRange: (range: TimeRangeMs) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    getHighlightIndexAtClientPosition: (clientX: number, clientY: number) => number | undefined;
};

export type PanelNavigateState = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    rangeOption: IntervalOption | undefined;
};

export type PanelChartState = {
    axes: PanelAxes;
    display: PanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    highlights: PanelHighlight[];
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (request: PanelCreateAnnotationRequest) => unknown;
    onActivateHighlightEditor: (request: PanelHighlightEditRequest) => unknown;
    onActivateAnnotationEditor: (request: PanelSeriesAnnotationEditRequest) => unknown;
};
