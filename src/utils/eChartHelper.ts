import { generateUUID } from '@/utils';
import { ChartTheme, ChartType, SeriesLineStep } from '@/type/eChart';

export const DefaultChartOption = {
    id: undefined as string | undefined,
    name: 'chart Title',
    type: 'line' as ChartType,
    theme: 'dark' as ChartTheme,
    isLegend: true as boolean,
    isStepInLine: false as SeriesLineStep, // step option in line
    timeRange: {
        start: undefined as string | undefined,
        end: undefined as string | undefined,
        refresh: 'Off' as any,
    },
    chartInfo: undefined as any,
    tagTableInfo: undefined as any,
    useCustomTime: true as boolean,

    // gauge chart option
    gaugeMin: 0 as number,
    gaugeMax: 100 as number,

    // react-grid-layout value
    x: 0 as number, // x-position
    y: 0 as number, // y-position
    w: 7 as number, // width
    h: 7 as number, // height
};

export const DefaultTagTableOption = {
    id: generateUUID(),
    table: undefined as string | undefined,
    userName: undefined as string | undefined,
    color: '#73BF69',
    tableInfo: [],
    type: 'tag',
    filter: [{ id: generateUUID(), column: '', operator: '=', value: '', useFilter: true }],
    values: [{ id: generateUUID(), alias: '', value: '', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: 'time',
    useCustom: false,
    aggregator: 'avg',
    tag: '',
    value: 'value',
};

export const ChartSeriesOption = {
    xAxis: {
        type: 'category',
        // data: [] as any,
    } as any,
    yAxis: {} as any,
    series: [
        {
            type: 'line',
            data: [] as any,
        },
    ] as any,
};
export const DefaultLineSeriesObject = {
    type: 'line',
    data: [] as any,
};
// export const BarChartOption = {
//     xAxis: {
//         type: 'category',
//         data: [] as any,
//     } as EChartOption.XAxis,
//     yAxis: {} as EChartOption.YAxis,
//     series: [
//         {
//             type: 'bar',
//             data: [] as any,
//         },
//     ] as EChartOption.SeriesBar[],
// };
// export const DefaultBarSeriesObject = {
//     type: 'bar',
//     data: [] as any,
// };
// export const ScatterChartOption = {
//     xAxis: {
//         type: 'category',
//         data: [] as any,
//     } as EChartOption.XAxis,
//     yAxis: {} as EChartOption.YAxis,
//     series: [
//         {
//             type: 'scatter',
//             data: [] as any,
//         },
//     ] as EChartOption.SeriesScatter[],
// };
// export const DefaultScatterSeriesObject = {
//     type: 'scatter',
//     data: [] as any,
// };
