import type { PanelSeriesDefinition } from '../SeriesDomain';
import type { TimeRangeInput } from '../time/TimeTypes';
import type { PanelAnnotation, PanelHighlight } from './PanelConfig';
import type { RuntimePanelAxes, RuntimePanelDisplay } from './PanelRuntime';

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export type PanelZoomActions = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorShiftActions = {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
};

export type PanelRangeActions = {
    applyMainZoomRange: (event: PanelRangeChangeEvent) => unknown;
    applyMainNavigatorSelectionRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactMainRange: (event: PanelRangeChangeEvent) => unknown;
    applyExactNavigatorRange: (
        event: PanelRangeChangeEvent,
        requestNavigatorRangeInput?: TimeRangeInput,
    ) => unknown;
    shiftMainRangeLeft: () => void;
    shiftMainRangeRight: () => void;
};

type PanelPoint = {
    x: number;
    y: number;
};

type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelChartHandle = {
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

export type PanelChartState = {
    axes: RuntimePanelAxes;
    display: RuntimePanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    useOrderBy: boolean;
    highlights: PanelHighlight[];
    draftHighlight?: PanelHighlight | undefined;
    annotations: PanelAnnotation[];
};

export type PanelMarkupHandlers = {
    onOpenCreateAnnotation: (
        position: PanelPoint,
        seriesIndex: number | undefined,
        timestamp: number,
    ) => unknown;
    onActivateHighlightEditor: (
        position: PanelPoint,
        highlightIndex: number,
    ) => unknown;
    onActivateAnnotationEditor: (
        position: PanelPoint,
        annotationIndex: number,
    ) => unknown;
};
