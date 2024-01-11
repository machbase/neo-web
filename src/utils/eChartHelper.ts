import { generateUUID } from '@/utils';
import { ChartTheme, ChartType } from '@/type/eChart';

// use create common chart option (createCommonOption)
export const DefaultCommonOption = {
    legend: {
        show: true as boolean,
    },
    tooltip: {
        show: true as boolean,
        trigger: 'item' as 'item' | 'axis' | 'none',
    },
    dataZoom: false as any[] | boolean,
};

export const DefaultXAxisOption = {
    type: 'category' as string,
    axisTick: {
        alignWithLabel: true as boolean,
    },
    // axisLine: {
    //     lineStyle: {
    //         color: '#fff'
    //     }
    // }
};

export const DefaultYAxisOption = {
    // value | category | time | log
    type: 'value' as string,
    position: 'left' as 'left' | 'right',
    alignTicks: true,
    // axisLine: {
    //     lineStyle: {
    //         color: '#fff'
    //     }
    // }
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
    isStack: false as boolean,
    markLine: {
        symbol: ['none', 'none'],
        label: {
            show: false as boolean,
        },
        data: [] as any[],
    },
    visualMap: DefaultLineVisualMapOption,
};

export const DefaultBarChartOption = {
    isStack: false as boolean,
    isLarge: false as boolean,
    isPolar: false as boolean,
    polarRadius: 30 as number,
    startAngle: 90 as number,
    maxValue: 100 as number,
    // coordinateSystem: 'cartesian2d' as 'cartesian2d' | 'polar',
};

export const DefaultBarPolarOption = {
    polar: {
        radius: [30, '80%'],
    },
    angleAxis: {
        max: 4,
        startAngle: 90,
    },
    radiusAxis: {
        type: 'category',
        // data: [] as any[],
    },
};

export const DefaultPieChartOption = {
    doughnutRatio: 0 as number,
    datasetIndex: 0 as number,
    roseType: false as boolean | string,
    radius: [0, '70%'] as (number | string)[],
    emphasis: {
        itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
    },
};

export const DefaultGaugeChartOption = {
    progress: {
        show: true,
    },
    axisTick: {
        show: false,
    },
    axisLabel: {
        distance: 25,
        color: '#999',
        fontSize: 16,
    },
    splitLine: {
        length: 10,
        distance: -10,
        lineStyle: {
            width: 2,
            color: '#fff',
        },
    },
    detail: {
        fontSize: 22,
        valueAnimation: false,
        formatter: '{value}',
        offsetCenter: [0, '30%'],
    },
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

    xAxisOptions: [DefaultXAxisOption],
    yAxisOptions: [DefaultYAxisOption],

    chartOptions: undefined as any,

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

// const DefaultLineSeriesOption = {
//     xAxis: { type: 'category' },
//     yAxis: {},
//     series: [{ type: 'line' }],
// };
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
// const DefaultGaugeSeriesOption = {
//     series: [
//         {
//             type: 'gauge',
//             progress: {
//                 show: true,
//             },
//             axisTick: { show: true },
//         },
//     ],
// };

export const getDefaultSeriesOption = (aChartType: string) => {
    switch (aChartType.toLocaleLowerCase()) {
        case 'liquidfill':
            return DefaultLiquidSeriesOption;
        case 'line':
            return DefaultLineChartOption;
        case 'bar':
            return DefaultBarChartOption;
        case 'scatter':
            return DefaultScatterSeriesOption;
        case 'gauge':
            return DefaultGaugeChartOption;
        case 'pie':
            return DefaultPieChartOption;
        default:
            return DefaultBarSeriesOption;
    }
};
