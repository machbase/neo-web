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

export type TagAnalyzerPanelHeaderState = {
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

export type TagAnalyzerPanelHeaderActions = {
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

export type TagAnalyzerPanelHeaderSavedToLocalInfo = {
    chartData: unknown;
    chartRef: unknown;
};

export type TagAnalyzerPanelHeaderProps = {
    pHeaderState: TagAnalyzerPanelHeaderState;
    pHeaderActions: TagAnalyzerPanelHeaderActions;
    pSavedToLocalInfo: TagAnalyzerPanelHeaderSavedToLocalInfo;
};

export type TagAnalyzerPanelHeaderButtonGroupProps = {
    pHeaderState: TagAnalyzerPanelHeaderState;
    pHeaderActions: TagAnalyzerPanelHeaderActions;
    pCanUseSavedToLocal: boolean;
    pOnOpenSavedToLocal: () => void;
    pOnOpenDeleteConfirm: (e: React.MouseEvent) => void;
};

export type TagAnalyzerPanelFooterDisplay = {
    tagCount: number;
    showLegend: TagAnalyzerYN;
};

export type TagAnalyzerNewEChartRefs = {
    areaChart: unknown;
    chartWrap: unknown;
};

export type TagAnalyzerNewEChartModel = {
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

export type TagAnalyzerNewEChartActions = {
    onSetExtremes: (event: unknown) => unknown;
    onSetNavigatorExtremes: (event: unknown) => unknown;
    onSelection: (event: unknown) => unknown;
};

export type TagAnalyzerNewEChartProps = {
    pChartRefs: TagAnalyzerNewEChartRefs;
    pChartModel: TagAnalyzerNewEChartModel;
    pChartActions: TagAnalyzerNewEChartActions;
};

export type TagAnalyzerPanelBodyPopupState = {
    tagSet: TagAnalyzerTagItem[];
    minMaxList: TagAnalyzerMinMaxItem[];
    isFFTModal: boolean;
    setIsFFTModal: Dispatch<SetStateAction<boolean>>;
    fftMinTime: number;
    fftMaxTime: number;
    isMinMaxMenu: boolean;
    menuPosition: CoordinateType;
};

export type TagAnalyzerPanelBodyActions = {
    onMoveTimeRange: (aItem: string) => void;
    onCloseMinMaxPopup: () => void;
    getDuration: (aStartTime: number, aEndTime: number) => string;
};

export type TagAnalyzerPanelBodyProps = {
    pChartRefs: TagAnalyzerNewEChartRefs;
    pChartModel: TagAnalyzerNewEChartModel;
    pChartActions: TagAnalyzerNewEChartActions;
    pBodyActions: TagAnalyzerPanelBodyActions;
    pPopupState: TagAnalyzerPanelBodyPopupState;
};
