import type {
    OverlapPanelInfo,
    OverlapSelectionChangePayload,
} from './OverlapModel';
import type { PanelInfo } from './PanelModel';
import type {
    IntervalOption,
    PanelNavigatorRangePair,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';

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
    data: ResolvedTimeRangeMs;
    navigator: ResolvedTimeRangeMs;
    interval: IntervalOption;
};

export type PersistPanelStatePayload = {
    targetPanelKey: string;
    timeInfo: PanelNavigatorRangePair;
    isRaw: boolean;
};

export type BoardState = {
    refreshCount: number;
    timeRefreshCount: number;
    boardTimeApplyCount: number;
    overlapPanels: OverlapPanelInfo[];
    globalTimeRange: GlobalTimeRangeState | undefined;
};

export type BoardActions = {
    onOverlapSelectionChange: (payload: OverlapSelectionChangePayload) => void;
    onDeletePanel: (payload: { panelKey: string }) => void;
    onPersistPanelState: (payload: PersistPanelStatePayload) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: {
        dataTime: ResolvedTimeRangeMs;
        navigatorTime: ResolvedTimeRangeMs;
        interval: IntervalOption;
    }) => void;
};
