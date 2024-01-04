import { generateUUID } from '@/utils';
import { ChartTheme, ChartType } from '@/type/eChart';

export const DefaultPieChartOption = {
    roseType: false as boolean,
    doughnutRatio: 0 as number,
};

// for marking option
export const DefaultLineVisualMapOption = {
    type: 'piecewise' as 'continuous' | 'piecewise',
    show: false as boolean,
    dimension: 0 as string | number,
    seriesIndex: 0 as number | number[],
    pieces: [] as any,
};

export const DefaultLineChartOption = {
    areaStyle: false as boolean,
    smooth: false as boolean,
    isStep: false as boolean,
    markLine: {
        symbol: ['none', 'none'],
        label: {
            show: false as boolean,
        },
        data: [] as any[],
    },
    visualMap: DefaultLineVisualMapOption,
};

export const DefaultChartOption = {
    id: undefined as string | undefined,
    name: 'chart Title',
    type: 'line' as ChartType,
    theme: 'dark' as ChartTheme,
    isLegend: true as boolean,
    isTooltip: true as boolean,
    isDataZoom: false as boolean,
    timeRange: {
        start: undefined as string | undefined,
        end: undefined as string | undefined,
        refresh: 'Off' as any,
    },
    chartInfo: undefined as any,
    tagTableInfo: undefined as any,
    useCustomTime: true as boolean,

    // line chart option
    lineChartOptions: DefaultLineChartOption,

    // pie chart option
    pieChartOptions: DefaultPieChartOption,

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

const DefaultLineSeriesOption = {
    xAxis: { type: 'category' },
    yAxis: {},
    series: [{ type: 'line' }],
};
const DefaultBarSeriesOption = {
    xAxis: { type: 'category' },
    yAxis: {},
    series: [{ type: 'bar' }],
};
const DefaultScatterSeriesOption = {
    xAxis: { type: 'category' },
    yAxis: {},
    series: [{ type: 'scatter' }],
};
const DefaultLiquidSeriesOption = {
    series: [{ type: 'liquidFill', shape: 'circle' }],
};
const DefaultGaugeSeriesOption = {
    series: [
        {
            type: 'gauge',
            progress: {
                show: true,
            },
            axisTick: { show: true },
        },
    ],
};

export const GetDefaultSeriesOption = (aChartType: string) => {
    switch (aChartType.toLocaleLowerCase()) {
        case 'liquidfill':
            return DefaultLiquidSeriesOption;
        case 'line':
            return DefaultLineSeriesOption;
        case 'scatter':
            return DefaultScatterSeriesOption;
        case 'gauge':
            return DefaultGaugeSeriesOption;
        default:
            return DefaultBarSeriesOption;
    }
};
