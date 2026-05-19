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

export type SetGlobalTimeRangePayload = {
    dataTime: TimeRangeMs;
    navigatorTime: TimeRangeMs;
    interval: IntervalOption;
};

export type BoardActions = {
    onDeletePanel: (payload: { panelKey: string }) => void;
    onPersistPanelState: (payload: PersistPanelStatePayload) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetBoardTimeRange: (timeRange: TimeRangeConfig) => void;
};
