import type { PanelInfo } from './PanelModel';

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

export type ToggleOverlapSelectionPayload = {
    panelKey: string;
    start: number;
    end: number;
    isRaw: boolean;
    changeType: undefined;
};

export type ChangedOverlapSelectionPayload = {
    start: number;
    end: number;
    panelKey: string;
    isRaw: boolean;
    changeType: 'changed';
};

export type DeleteOverlapSelectionPayload = {
    panelKey: string;
    changeType: 'delete';
};

export type OverlapSelectionChangePayload =
    | ToggleOverlapSelectionPayload
    | ChangedOverlapSelectionPayload
    | DeleteOverlapSelectionPayload;
