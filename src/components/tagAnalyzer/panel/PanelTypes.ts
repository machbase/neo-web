import type { ChartSeriesData } from '../chart/ChartTypes';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../domain/PanelModel';
import type { IntervalOption, ResolvedTimeRangeMs } from '../time/TimeTypes';

export type PanelHeaderState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEditing: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
    isDragSelectActive: boolean;
    canOpenFft: boolean;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
};

export type PanelHeaderActions = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleHighlight: () => void;
    onToggleAnnotation: () => void;
    onToggleDragSelect: () => void;
    onToggleEdit: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onOpenExportCsv: () => void;
    onOpenDeleteConfirm: () => void;
};

export type PanelZoomHandlers = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelNavigatorActions = PanelZoomHandlers & {
    onShiftLeft: () => void;
    onShiftRight: () => void;
};

export type PanelRangeHandlers = {
    onPanelRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onNavigatorRangeChange: (event: PanelRangeChangeEvent) => unknown;
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

export type PanelContextMenuViewState = {
    isEditing: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isDragSelectActive: boolean;
    isOverlapToggleAvailable: boolean;
    canOpenFft: boolean;
    canSetGlobalTime: boolean;
};

export type PanelContextMenuActions = Pick<
    PanelHeaderActions,
    | 'onToggleOverlap'
    | 'onToggleRaw'
    | 'onToggleDragSelect'
    | 'onToggleEdit'
    | 'onOpenFft'
    | 'onSetGlobalTime'
    | 'onRefreshData'
    | 'onRefreshTime'
    | 'onOpenDeleteConfirm'
>;

export type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
    trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
};

export type PanelRangeAppliedContext = {
    navigatorRange: ResolvedTimeRangeMs;
    isRaw: boolean;
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

export type PanelChartHandle = {
    setPanelRange: (range: ResolvedTimeRangeMs) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    getHighlightIndexAtClientPosition: (clientX: number, clientY: number) => number | undefined;
};

export type PanelState = {
    isRaw: boolean;
    isFFTModal: boolean;
    isEditing: boolean;
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
    isDragSelectActive: boolean;
};

export type PanelNavigateState = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    panelRange: ResolvedTimeRangeMs;
    navigatorRange: ResolvedTimeRangeMs;
    rangeOption: IntervalOption | undefined;
    preOverflowTimeRange: ResolvedTimeRangeMs;
};

export type PanelChartState = {
    axes: PanelAxes;
    display: PanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    highlights: PanelHighlight[];
};

export type PanelMarkupHandlers = {
    onOpenHighlightRename: (request: PanelHighlightEditRequest) => unknown;
    onOpenSeriesAnnotationEditor: (request: PanelSeriesAnnotationEditRequest) => unknown;
};
