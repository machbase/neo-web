import type { PanelInfo } from './PanelModel';

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

export type OverlapShiftDirection = '+' | '-';

export type ToggleOverlapSelectionPayload = {
    panel: PanelInfo;
    start: number;
    end: number;
    isRaw: boolean;
    changeType: undefined;
};

export type TimedOverlapSelectionPayload = {
    start: number;
    end: number;
    panel: PanelInfo;
    isRaw: boolean;
    changeType: 'delete' | 'changed';
};

export type OverlapSelectionChangePayload =
    | ToggleOverlapSelectionPayload
    | TimedOverlapSelectionPayload;
