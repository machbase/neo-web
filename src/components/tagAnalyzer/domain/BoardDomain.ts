import type { PanelInfo } from './PanelDomain';
import type {
    IntervalOption,
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
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

export type OverlapPanelSelection = {
    panelKey: string;
    start: number;
    duration: number;
    isRaw: boolean;
};

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

export type OverlapShiftDirection = '+' | '-';

export type OverlapOffsetParts = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
};

export type OverlapSelectionChangePayload =
    | {
          panelKey: string;
          start: number;
          end: number;
          isRaw: boolean;
          changeType: undefined;
      }
    | {
          start: number;
          end: number;
          panelKey: string;
          isRaw: boolean;
          changeType: 'changed';
      }
    | {
          panelKey: string;
          changeType: 'delete';
      };
