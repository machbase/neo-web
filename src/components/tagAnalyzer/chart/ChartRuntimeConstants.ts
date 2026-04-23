import type { PanelNavigateState } from '../utils/panelRuntimeTypes';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';

export const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};
