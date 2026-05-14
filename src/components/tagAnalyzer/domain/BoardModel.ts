import type {
    OverlapPanelInfo,
    OverlapSelectionChangePayload,
} from './OverlapModel';
import type { PanelInfo } from './PanelModel';
import type {
    IntervalOption,
    PanelNavigatorRangePair,
    TimeRangeMs,
    TimeRangeConfig,
} from './time/TimeTypes';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelInfo[];
    boardTimeRange: TimeRangeConfig;
    savedCode: string | false;
    version?: string;
};

export type GlobalTimeRangeState = {
    data: TimeRangeMs;
    navigator: TimeRangeMs;
    interval: IntervalOption;
};

export type PersistPanelStatePayload = {
    targetPanelKey: string;
    timeInfo: PanelNavigatorRangePair;
    isRaw: boolean;
};

export type PanelBoardCommands = {
    refreshData: () => void;
    refreshTime: () => void;
    applyBoardTimeRange: (timeRange: TimeRangeConfig) => void;
    applyGlobalTimeRange: (globalTimeRange: GlobalTimeRangeState) => void;
};

export type PanelCommandRegistry = {
    registerPanelCommands: (
        panelKey: string,
        commands: PanelBoardCommands,
    ) => () => void;
    runPanelCommand: (runCommand: (commands: PanelBoardCommands) => void) => void;
};

export type BoardState = {
    overlapPanels: OverlapPanelInfo[];
    globalTimeRange: GlobalTimeRangeState | undefined;
};

export type BoardActions = {
    onOverlapSelectionChange: (payload: OverlapSelectionChangePayload) => void;
    onDeletePanel: (payload: { panelKey: string }) => void;
    onPersistPanelState: (payload: PersistPanelStatePayload) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: {
        dataTime: TimeRangeMs;
        navigatorTime: TimeRangeMs;
        interval: IntervalOption;
    }) => void;
};
