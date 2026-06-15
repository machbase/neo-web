import type { PanelInfo } from './PanelDomain';
import type {
    IntervalOption,
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

export type SetGlobalTimeRangePayload = {
    dataTime: TimeRangeMs;
    navigatorTime: TimeRangeMs;
    interval: IntervalOption;
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
