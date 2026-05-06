import type {
    ChartSeriesData,
    SelectedRangeSeriesSummary,
} from '../chart/ChartTypes';

export type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

export type FFTSelectionPayload = {
    seriesSummaries: SelectedRangeSeriesSummary[];
    startTime: number;
    endTime: number;
};

export type OverlapLoadResult = {
    startTime: number | undefined;
    chartSeries: ChartSeriesData | undefined;
};

