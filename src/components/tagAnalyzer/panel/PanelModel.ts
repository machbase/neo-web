import type { MutableRefObject } from 'react';
import type {
    TagAnalyzerChartSeriesItem,
    TagAnalyzerIntervalOption,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TimeRange,
} from '../common/CommonType';

export type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartData,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerDefaultRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerIntervalOption,
    TagAnalyzerMinMaxItem,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelData,
    TagAnalyzerPanelDisplay,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelMeta,
    TagAnalyzerPanelTime,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerSeriesColumns,
    TagAnalyzerSeriesConfig,
    TagAnalyzerTimeUnit,
    TimeRange,
} from '../common/CommonType';

// --- UI component types ---

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

export type PanelRangeChangeEvent = {
    min: number;
    max: number;
    trigger: 'dataZoom' | 'brushZoom' | 'navigator' | 'selection' | undefined;
};

export type PanelChartHandle = {
    setPanelRange: (aRange: TimeRange) => void;
    getVisibleSeries: () => PanelVisibleSeriesItem[];
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
    isDragSelectActive: boolean;
};

export type PanelNavigateState = {
    chartData: TagAnalyzerChartSeriesItem[] | undefined;
    navigatorChartData: TagAnalyzerChartSeriesItem[] | undefined;
    panelRange: TimeRange;
    navigatorRange: TimeRange;
    rangeOption: TagAnalyzerIntervalOption | undefined;
    preOverflowTimeRange: TimeRange;
};

export type PanelChartState = {
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    useNormalize: boolean;
};

export type PanelChartHandlers = {
    onSetExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSetNavigatorExtremes: (event: PanelRangeChangeEvent) => unknown;
    onSelection: (event: PanelRangeChangeEvent) => unknown;
};
