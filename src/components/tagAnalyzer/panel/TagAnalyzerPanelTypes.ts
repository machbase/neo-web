import type { Dispatch, SetStateAction } from 'react';
import type {
    TagAnalyzerChartData,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerMinMaxItem,
    TagAnalyzerPanelAxes,
    TagAnalyzerPanelDisplay,
    TagAnalyzerTagItem,
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
    isEdit?: boolean;
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
    onRefreshData: () => void | Promise<void>;
    onRefreshTime: () => void | Promise<void>;
    onOpenEdit: () => void;
    onDelete: () => void;
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

export type PanelChartState = {
    axes: TagAnalyzerPanelAxes;
    display: TagAnalyzerPanelDisplay;
    useNormalize?: TagAnalyzerYN;
    isRaw: boolean;
    navigatorData?: TagAnalyzerChartData;
    chartData?: TagAnalyzerChartSeriesItem[];
    panelRange: TagAnalyzerTimeRange;
    navigatorRange: TagAnalyzerTimeRange;
    isUpdate: boolean;
};

export type PanelChartHandlers = {
    onSetExtremes: (event: unknown) => unknown;
    onSetNavigatorExtremes: (event: unknown) => unknown;
    onSelection: (event: unknown) => unknown;
};

export type PanelSelectionState = {
    tagSet: TagAnalyzerTagItem[];
    minMaxList: TagAnalyzerMinMaxItem[];
    isFFTModal: boolean;
    setIsFFTModal: Dispatch<SetStateAction<boolean>>;
    fftMinTime: number;
    fftMaxTime: number;
    isMinMaxMenu: boolean;
    menuPosition: CoordinateType;
};

export type PanelDisplayHandlers = {
    onMoveTimeRange: (aItem: string) => void;
    onCloseMinMaxPopup: () => void;
    getDuration: (aStartTime: number, aEndTime: number) => string;
};
