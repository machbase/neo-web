export type ChartRow = [number, number];

export type ChartSeriesData = {
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
    datasets: ChartSeriesData[];
};
