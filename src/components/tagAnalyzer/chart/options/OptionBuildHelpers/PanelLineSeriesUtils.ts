import type { SeriesOption } from 'echarts';
import type { ChartRow } from '../../../utils/series/PanelSeriesTypes';

type BuildBasePanelLineSeriesOptionParams = {
    id: string;
    name: string;
    data: ChartRow[];
    xAxisIndex: number;
    yAxisIndex: number;
    itemStyle: NonNullable<SeriesOption['itemStyle']>;
    lineStyle: NonNullable<SeriesOption['lineStyle']>;
    extra?: Omit<
        SeriesOption,
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

export function buildBasePanelLineSeriesOption({
    id,
    name,
    data,
    xAxisIndex,
    yAxisIndex,
    itemStyle,
    lineStyle,
    extra,
}: BuildBasePanelLineSeriesOptionParams): SeriesOption {
    return {
        id: id,
        name: name,
        type: 'line',
        legendHoverLink: false,
        xAxisIndex: xAxisIndex,
        yAxisIndex: yAxisIndex,
        data: data,
        animation: false,
        sampling: resolvePanelSeriesSampling(data.length),
        lineStyle: lineStyle,
        itemStyle: itemStyle,
        ...extra,
    };
}

function resolvePanelSeriesSampling(dataPointCount: number) {
    return dataPointCount > 1000 ? 'lttb' : undefined;
}
