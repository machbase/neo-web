import type {
    TagAnalyzerChartData,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerTimeRange,
    TagAnalyzerYN,
} from './TagAnalyzerPanelModelTypes';

export type PanelPresentationState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isDragSelectActive: boolean;
    canOpenFft: boolean;
    canSaveLocal: boolean;
};

export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
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
    onZoomIn: (aZoom: number) => void;
    onZoomOut: (aZoom: number) => void;
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

export type PanelChartHandle = {
    setPanelRange: (aRange: TagAnalyzerTimeRange) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
};

export type PanelSummaryState = {
    tagCount: number;
    showLegend: TagAnalyzerYN;
};

export type PanelChartRefs = {
    areaChart: unknown;
    chartWrap: unknown;
};

export type PanelState = {
    isRaw: boolean;
    isFFTModal: boolean;
    isDragSelectActive: boolean;
};

export type PanelNavigateState = {
    chartData?: TagAnalyzerChartSeriesItem[];
    navigatorData?: TagAnalyzerChartData;
    panelRange: TagAnalyzerTimeRange;
    navigatorRange: TagAnalyzerTimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    preOverflowTimeRange: TagAnalyzerTimeRange;
};

export type PanelChartState = {
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    useNormalize?: TagAnalyzerYN;
};

export type PanelChartHandlers = {
    onSetExtremes: (event: unknown) => unknown;
    onSetNavigatorExtremes: (event: unknown) => unknown;
    onSelection: (event: unknown) => unknown;
};
