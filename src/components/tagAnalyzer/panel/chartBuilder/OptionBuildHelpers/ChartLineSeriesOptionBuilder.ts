import type {
    LineSeriesOption,
    SeriesOption,
} from 'echarts';
import type { ChartRow } from '../../../domain/ChartDomain';

type BuildPanelLineSeriesOptionParams = {
    id: string;
    name: string;
    data: ChartRow[];
    xAxisIndex: number;
    yAxisIndex: number;
    itemStyle: NonNullable<LineSeriesOption['itemStyle']>;
    lineStyle: NonNullable<LineSeriesOption['lineStyle']>;
    extra?: Omit<
        LineSeriesOption,
        | 'animation'
        | 'data'
        | 'id'
        | 'itemStyle'
        | 'legendHoverLink'
        | 'lineStyle'
        | 'name'
        | 'sampling'
        | 'type'
        | 'xAxisIndex'
        | 'yAxisIndex'
    >;
};

export function buildPanelLineSeriesOption({
    id,
    name,
    data,
    xAxisIndex,
    yAxisIndex,
    itemStyle,
    lineStyle,
    extra,
}: BuildPanelLineSeriesOptionParams): SeriesOption {
    return {
        id: id,
        name: name,
        type: 'line',
        legendHoverLink: false,
        xAxisIndex: xAxisIndex,
        yAxisIndex: yAxisIndex,
        data: data,
        animation: false,
        sampling: data.length > 1000 ? 'lttb' : undefined,
        lineStyle: lineStyle,
        itemStyle: itemStyle,
        ...extra,
    };
}
