import type { IntervalOption } from '../time/types/TimeTypes';
import type {
    ChartFetchResponse,
    FetchPanelDatasetsResult,
} from './FetchTypes';

export const EMPTY_CHART_FETCH_RESPONSE: ChartFetchResponse = {
    data: {
        column: [],
        rows: [],
    },
};

export const EMPTY_INTERVAL_OPTION: IntervalOption = {
    IntervalType: '',
    IntervalValue: 0,
};

export const EMPTY_FETCH_PANEL_DATASETS_RESULT: FetchPanelDatasetsResult = {
    datasets: [],
    interval: EMPTY_INTERVAL_OPTION,
    count: 0,
    hasDataLimit: false,
    limitEnd: 0,
};
