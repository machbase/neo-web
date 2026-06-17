import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/model/TimeConstants';
import { isValidTimeRange } from '../domain/time/range/TimeRangeUtils';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';

export type PanelRangeApplyOptions = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    fullRange?: TimeRangeMs;
    navigatorSelectionCenterRatio?: number;
    reloadData?: boolean;
};

export type PanelRangeStateApplyOptions = {
    fullRange?: TimeRangeMs;
    navigatorSelectionCenterRatio?: number;
    reloadData?: boolean;
};

export type BoardPanelRecord = {
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
};

export type BoardPanelStore = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateBoardPanelRecord: (
        panelKey: string,
        updater: (record: BoardPanelRecord) => BoardPanelRecord,
    ) => void;
};

export type ApplyPanelRangeState = (
    panelInfo: PanelInfo,
    options: PanelRangeApplyOptions,
) => void;

const INITIAL_PANEL_RANGE_STATE: PanelRangeState = {
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    fullRange: EMPTY_TIME_RANGE,
};

export const createInitialBoardPanelRecord = (): BoardPanelRecord => ({
    rangeState: INITIAL_PANEL_RANGE_STATE,
    chartAreaWidth: undefined,
    dataRefreshVersion: 0,
});

export function hasValidRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.panelRange) &&
        isValidTimeRange(rangeState.navigatorRange) &&
        isValidTimeRange(rangeState.fullRange)
    );
}
