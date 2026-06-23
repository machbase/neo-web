import { Toast } from '@/design-system/components';
import type { PanelRangeState } from '../domain/PanelDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/model/TimeConstants';
import { isValidTimeRange } from '../domain/time/range/TimeRangeUtils';

export const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

export function showPanelFullRangeUnavailableToast(): void {
    Toast.error(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
}

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

export type PanelRangeApplyResult = {
    resolvedRangeState: PanelRangeState;
    didChange: boolean;
};

export type ApplyPanelRange = (
    request: ApplyPanelRangeRequest,
) => PanelRangeApplyResult;

export type RequestPanelDataRefresh = (panelKey: string) => void;

const INITIAL_PANEL_RANGE_STATE: PanelRangeState = {
    requestPanelRange: EMPTY_TIME_RANGE,
    requestNavigatorRange: EMPTY_TIME_RANGE,
    fullRange: EMPTY_TIME_RANGE,
};

export const createInitialBoardPanelRecord = (): BoardPanelRecord => ({
    rangeState: INITIAL_PANEL_RANGE_STATE,
    chartAreaWidth: undefined,
    dataRefreshVersion: 0,
});

export function hasValidRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.requestPanelRange) &&
        isValidTimeRange(rangeState.requestNavigatorRange) &&
        isValidTimeRange(rangeState.fullRange)
    );
}
