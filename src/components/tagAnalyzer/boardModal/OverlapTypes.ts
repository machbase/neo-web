import type { PanelInfo } from '../utils/panelModelTypes';

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

export type OverlapShiftDirection = '+' | '-';

export type OverlapSelectionChangePayload = {
    start: number;
    end: number;
    panel: PanelInfo;
    isRaw: boolean;
    changeType: 'delete' | 'changed' | undefined;
};
