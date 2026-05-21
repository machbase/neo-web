import type { TimeRangeMs } from './time/TimeTypes';
import type {
    PanelAnnotation,
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from './PanelModel';
import type { PanelSeriesDefinition } from './SeriesModel';

export type PanelOverlayMode =
    | 'noOverlay'
    | 'highlight'
    | 'annotation'
    | 'dragSelect';

export type PanelZoomActions = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorShiftActions = {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeState = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

export type PanelRangeHandlers = {
    onPanelRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
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

export type PanelChartHandle = {
    getVisibleSeries: () => PanelVisibleSeriesItem[];
};

export type PanelChartState = {
    axes: PanelAxes;
    display: PanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    highlights: PanelHighlight[];
    annotations: PanelAnnotation[];
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (
        position: { x: number; y: number },
        seriesIndex: number | undefined,
        timestamp: number,
    ) => unknown;
    onActivateHighlightEditor: (
        position: { x: number; y: number },
        highlightIndex: number,
    ) => unknown;
    onActivateAnnotationEditor: (
        position: { x: number; y: number },
        annotationIndex: number,
    ) => unknown;
};
