export type SeriesColumns = {
    name: string | undefined;
    time: string | undefined;
    value: string | undefined;
    [key: string]: unknown;
};

export type SeriesConfig = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color: string;
    use_y2: boolean;
    id: string | undefined;
    onRollup: boolean;
    colName: SeriesColumns | undefined;
    [key: string]: unknown;
};

export type ChartRow = [number, number];

export type ChartSeriesPoint = {
    x: number;
    y: number;
};

export type ChartSeriesItem = {
    name: string;
    data: ChartRow[];
    yAxis: number;
    marker:
        | {
              symbol: string | undefined;
              lineColor: string | undefined;
              lineWidth: number | undefined;
          }
        | undefined;
    color: string | undefined;
    [key: string]: unknown;
};

export type ChartData = {
    datasets: ChartSeriesItem[];
};

export type MinMaxItem = {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
};
