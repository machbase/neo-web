import type { PanelRangeState } from '../domain/PanelDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    DEFAULT_PANEL_DATA_REFRESH_POLICY,
    type PanelDataRefreshPolicy,
} from '../panel/PanelDataRuntimeState';

export type BoardPanelRecord = {
    rangeState: PanelRangeState;
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
    dataRefreshPolicy: PanelDataRefreshPolicy;
};

export const INITIAL_PANEL_RANGE_STATE: PanelRangeState = {
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
};

export const createInitialBoardPanelRecord = (): BoardPanelRecord => ({
    rangeState: INITIAL_PANEL_RANGE_STATE,
    chartAreaWidth: undefined,
    dataRefreshVersion: 0,
    dataRefreshPolicy: DEFAULT_PANEL_DATA_REFRESH_POLICY,
});

export function hasConcretePanelRangeState(rangeState: PanelRangeState): boolean {
    return (
        isConcreteTimeRange(rangeState.panelRange) &&
        isConcreteTimeRange(rangeState.navigatorRange)
    );
}
