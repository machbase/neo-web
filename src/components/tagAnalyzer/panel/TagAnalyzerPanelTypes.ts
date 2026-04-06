import type {
    TagAnalyzerChartData,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerMinMaxItem,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerTimeRange,
    TagAnalyzerYN,
} from './TagAnalyzerPanelModelTypes';

export type CoordinateType = {
    x: number;
    y: number;
};

export type PanelPresentationState = {
    title: string;
    timeText: string;
    intervalText: string;
    isEdit: boolean;
    isRaw: boolean;
    isSelectedForOverlap: boolean;
    isOverlapAnchor: boolean;
    canToggleOverlap: boolean;
    isSelectionActive: boolean;
    canOpenFft: boolean;
    canSaveLocal: boolean;
};

export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleSelection: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onOpenEdit: () => void;
    onDelete: () => void;
};

export type PanelNavigationHandlers = {
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
    onZoomAction: (aAction: 'zoomIn' | 'zoomOut' | 'focus', aZoom?: number) => void;
    onShiftPanelRange: (aDirection: 'left' | 'right') => void;
    onShiftNavigatorRange: (aDirection: 'left' | 'right') => void;
};

export type PanelSavedChartInfo = {
    chartData: unknown;
    chartRef: unknown;
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
    isSelectionActive: boolean;
    isSelectionMenuOpen: boolean;
    fftMinTime: number;
    fftMaxTime: number;
    minMaxList: TagAnalyzerMinMaxItem[];
    menuPosition: CoordinateType;
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
