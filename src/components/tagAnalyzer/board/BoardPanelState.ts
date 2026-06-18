import type { PanelRangeState } from '../domain/PanelDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/model/TimeConstants';
import { isValidTimeRange } from '../domain/time/range/TimeRangeUtils';

export type ApplyPanelRangeRequest = {
    panelKey: string;
    rangeState: PanelRangeState;
    navigatorSelectionCenterRatio?: number;
};

export type PanelRangeChangeOptions = {
    navigatorSelectionCenterRatio?: number;
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

export type ApplyPanelRange = (
    request: ApplyPanelRangeRequest,
) => PanelRangeState | undefined;

export type RequestPanelDataRefresh = (panelKey: string) => void;

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
