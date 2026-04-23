import type { PanelShiftHandlers, PanelZoomHandlers } from '../../panelRuntimeTypes';
import type { TimeRangeMs } from './TimeTypes';

export type RangeDirection = 'left' | 'right';

export type RangeSetter = (
    aPanelRange: TimeRangeMs,
    aNavigatorRange: TimeRangeMs | undefined,
) => void;

export type PanelRangeUpdate = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs | undefined;
};

export type PanelRangeControlHandlers = {
    shiftHandlers: PanelShiftHandlers;
    zoomHandlers: PanelZoomHandlers;
};
