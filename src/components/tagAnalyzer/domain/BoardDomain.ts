import type { PanelInfo } from './PanelDomain';
import type {
    IntervalOption,
    TimeRangeConfig,
    TimeRangeMs,
} from './time/model/TimeTypes';

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

export type OverlapPanelInfo = OverlapPanelSelection & {
    board: PanelInfo;
};

export type OverlapPanelRangeSelectionPayload = {
    panelKey: string;
    start: number;
    end: number;
    isRaw: boolean;
};

export type OverlapPanelSelectionChangePayload =
    | (OverlapPanelRangeSelectionPayload & { changeType: undefined })
    | (OverlapPanelRangeSelectionPayload & { changeType: 'changed' })
    | {
          panelKey: string;
          changeType: 'delete';
      };
