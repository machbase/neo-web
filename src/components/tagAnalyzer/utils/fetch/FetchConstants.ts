import type { IntervalOption } from '../time/types/TimeTypes';
import type { ChartFetchResponse } from './FetchTypes';

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

export const NANOSECONDS_PER_MILLISECOND = 1000000;
