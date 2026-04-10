import type { MutableRefObject } from 'react';
import type {
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TimeRange,
    TagAnalyzerYN,
} from './TagAnalyzerPanelModelTypes';

// Used by TagAnalyzer panel code to type presentation state.
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

// Used by TagAnalyzer panel code to type action handlers.
export type PanelActionHandlers = {
    onToggleOverlap: () => void;
    onToggleRaw: () => void;
    onToggleDragSelect: () => void;
    onOpenFft: () => void;
    onSetGlobalTime: () => void;
    onOpenEdit: () => void;
    onDelete: () => void;
};

// Used by TagAnalyzer panel code to type refresh handlers.
export type PanelRefreshHandlers = {
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
};

// Used by TagAnalyzer panel code to type zoom handlers.
export type PanelZoomHandlers = {
    onZoomIn: (aZoom: number) => void;
    onZoomOut: (aZoom: number) => void;
    onFocus: () => void;
};

// Used by TagAnalyzer panel code to type shift handlers.
export type PanelShiftHandlers = {
    onShiftPanelRangeLeft: () => void;
    onShiftPanelRangeRight: () => void;
    onShiftNavigatorRangeLeft: () => void;
    onShiftNavigatorRangeRight: () => void;
};

// Used by TagAnalyzer panel code to type the combined shift and zoom handler bundle.
export type PanelRangeControlHandlers = PanelShiftHandlers & PanelZoomHandlers;

// Used by TagAnalyzer panel code to type saved chart info.
export type PanelSavedChartInfo = {
    chartData: unknown;
    chartRef: unknown;
};

// Used by TagAnalyzer panel code to type visible series item.
export type PanelVisibleSeriesItem = {
    name: string;
    visible: boolean;
};

// Used by TagAnalyzer panel code to type range change event.
export type PanelRangeChangeEvent = {
    min: number;
    max: number;
    trigger?: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection';
};

// Used by TagAnalyzer panel code to type chart handle.
export type PanelChartHandle = {
    setPanelRange: (aRange: TimeRange) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
};

// Used by TagAnalyzer panel code to type summary state.
export type PanelSummaryState = {
    tagCount: number;
    showLegend: TagAnalyzerYN;
};

// Used by TagAnalyzer panel code to type chart refs.
export type PanelChartRefs = {
    areaChart: MutableRefObject<HTMLDivElement | null>;
    chartWrap: MutableRefObject<PanelChartHandle | null>;
};

// Used by TagAnalyzer panel code to type component state.
export type PanelState = {
    isRaw: boolean;
    isFFTModal: boolean;
    isDragSelectActive: boolean;
};

// Used by TagAnalyzer panel code to type navigate state.
export type PanelNavigateState = {
    chartData?: TagAnalyzerChartSeriesItem[];
    panelRange: TimeRange;
    navigatorRange: TimeRange;
    rangeOption: TagAnalyzerIntervalOption | null;
    preOverflowTimeRange: TimeRange;
};

// Used by TagAnalyzer panel code to type chart state.
export type PanelChartState = {
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    useNormalize?: TagAnalyzerYN;
};

// Used by TagAnalyzer panel code to type chart handlers.
export type PanelChartHandlers = {
    onSetExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSetNavigatorExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
};
