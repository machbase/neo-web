import type { MutableRefObject } from 'react';
import type {
    ChartSeriesData,
    PanelSeriesDefinition,
} from '../utils/series/PanelSeriesTypes';
import type {
    PanelAxes,
    PanelDisplay,
    PanelHighlight,
} from '../utils/panelModelTypes';
import type { IntervalOption, TimeRangeMs } from '../utils/time/types/TimeTypes';

export type PanelPresentationState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
    isDragSelectActive: boolean;
    canOpenFft: boolean;
    canSetGlobalTime: boolean;
    canSaveLocal: boolean;
};

export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleHighlight: () => void;
    onToggleAnnotation: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onOpenEdit: () => void;
    onDelete: () => void;
};

export type PanelRefreshHandlers = {
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
};

export type PanelZoomHandlers = {
    onZoomIn: (zoom: number) => void;
    onZoomOut: (zoom: number) => void;
    onFocus: () => void;
};

export type PanelShiftHandlers = {
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

export type PanelSavedChartInfo = {
    chartData: unknown;
    chartRef: unknown;
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

export type PanelRangeAppliedContext = {
    navigatorRange: TimeRangeMs;
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
    setPanelRange: (range: TimeRangeMs) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
    getHighlightIndexAtClientPosition: (clientX: number, clientY: number) => number | undefined;
};

export type PanelSummaryState = {
    tagCount: number;
    showLegend: boolean;
};

export type PanelChartRefs = {
    areaChart: MutableRefObject<HTMLDivElement | null>;
    chartWrap: MutableRefObject<PanelChartHandle | null>;
};

export type PanelState = {
    isRaw: boolean;
    isFFTModal: boolean;
    isHighlightActive: boolean;
    isAnnotationActive: boolean;
    isDragSelectActive: boolean;
};

export type PanelNavigateState = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    rangeOption: IntervalOption | undefined;
    preOverflowTimeRange: TimeRangeMs;
};

export type PanelChartState = {
    axes: PanelAxes;
    display: PanelDisplay;
    seriesList: PanelSeriesDefinition[];
    useNormalize: boolean;
    highlights: PanelHighlight[];
};

export type PanelChartHandlers = {
    onSetExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSetNavigatorExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
    onOpenHighlightRename: (request: PanelHighlightEditRequest) => unknown;
    onOpenSeriesAnnotationEditor: (request: PanelSeriesAnnotationEditRequest) => unknown;
};
