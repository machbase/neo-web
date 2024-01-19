import { generateUUID } from '@/utils';
import { ChartTheme, ChartType } from '@/type/eChart';

// use create common chart option (createCommonOption)
export const DefaultCommonOption = {
    isLegend: true as boolean,
    isTooltip: true as boolean,
    tooltipTrigger: 'item' as 'item' | 'axis' | 'none',
    isDataZoom: false as boolean,
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

export const DefaultLineChartOption = {
    areaStyle: false as boolean,
    smooth: false as boolean,
    isStep: false as boolean,
    isStack: false as boolean,
    connectNulls: true as boolean,
    markLine: {
        symbol: ['none', 'none'],
        label: {
            show: false as boolean,
        },
        data: [] as any[],
    },
    // for marking option
    visualMap: {
        type: 'piecewise' as 'continuous' | 'piecewise',
        show: false as boolean,
        dimension: 0 as string | number,
        seriesIndex: 0 as number | number[],
        pieces: [] as any,
    },
};

export const DefaultBarChartOption = {
    isStack: false as boolean,
    isLarge: false as boolean,
    isPolar: false as boolean,
    polarRadius: 30 as number,
    polarSize: 80 as number,
    startAngle: 90 as number,
    maxValue: 100 as number,
    // coordinateSystem: 'cartesian2d' as 'cartesian2d' | 'polar',
};

export const DefaultScatterChartOption = {
    isLarge: false as boolean,
    symbolSize: 10 as number,
};

export const DefaultPieChartOption = {
    doughnutRatio: 0 as number,
    roseType: false as boolean | string,
};

export const DefaultGaugeChartOption = {
    isAxisTick: true as boolean,
    axisLabelDistance: 25 as number,
    // axisLabelColor: '#999' as string,
    // axisLabelFontSize: 16 as number,
    valueFontSize: 30 as number,
    valueAnimation: false as boolean,
    alignCenter: 30 as number,
    isAnchor: true as boolean,
    anchorSize: 25 as number,
    min: 0 as number,
    max: 100 as number,
};

export const DefaultChartOption = {
    id: undefined as string | undefined,
    title: 'chart Title' as string,
    type: 'line' as ChartType,
    theme: 'dark' as ChartTheme,
    timeRange: {
        start: 'now-1y' as string | undefined,
        end: 'now' as string | undefined,
        refresh: 'Off' as any,
    },
    blockList: undefined as any,
    useCustomTime: true as boolean,

    commonOptions: DefaultCommonOption,

    xAxisOptions: [DefaultXAxisOption],
    yAxisOptions: [DefaultYAxisOption],

    chartOptions: undefined as any,

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
    type: 'tag',
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false }],
    values: [{ id: generateUUID(), alias: '', value: 'VALUE', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: 'TIME',
    useCustom: false,
    aggregator: 'avg',
    tag: '',
    value: 'VALUE',
};

export const DefaultLogTableOption = {
    id: generateUUID(),
    table: undefined as string | undefined,
    userName: undefined as string | undefined,
    color: '#73BF69',
    type: 'log',
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false }],
    values: [{ id: generateUUID(), alias: '', value: '', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: '_ARRIVAL_TIME',
    useCustom: true,
    aggregator: 'avg',
    tag: '',
    value: '',
};

// const DefaultLiquidSeriesOption = {
//     series: [{ type: 'liquidFill', shape: 'circle' }],
// };

export const getDefaultSeriesOption = (aChartType: ChartType) => {
    switch (aChartType.toLocaleLowerCase()) {
        // case 'liquidfill':
        //     return DefaultLiquidSeriesOption;
        case 'line':
            return DefaultLineChartOption;
        case 'bar':
            return DefaultBarChartOption;
        case 'scatter':
            return DefaultScatterChartOption;
        case 'gauge':
            return DefaultGaugeChartOption;
        case 'pie':
            return DefaultPieChartOption;
        default:
            return DefaultLineChartOption;
    }
};

// structure of chart option
export const StructureOfCommonOption = {
    legend: {
        show: true as boolean,
    },
    tooltip: {
        show: true as boolean,
        trigger: 'item' as 'item' | 'axis' | 'none',
        formatter: null as unknown as (params: any, ticket: string, callback: (ticket: string, html: string) => any) => string | HTMLElement | HTMLElement[] | null,
    },
    dataZoom: false as any[] | boolean,
};

export const StructureOfLineSeriesOption = {
    areaStyle: null as any,
    smooth: false as boolean,
    step: false as boolean | string,
    stack: null as null | string,
    connectNulls: true as boolean,
    // use lineStyle for markline option
    lineStyle: null as null | Object,
    // if you markline option required visualMap option
    markLine: {
        symbol: ['none', 'none'],
        label: {
            show: false as boolean,
        },
        data: [] as any[],
    },
};

export const StructureOfLineVisualMapOption = {
    type: 'piecewise' as 'continuous' | 'piecewise',
    show: false as boolean,
    dimension: 0 as string | number,
    seriesIndex: 0 as number | number[],
    pieces: [] as any,
};

export const StructureOfBarSeriesOption = {
    coordinateSystem: 'cartesian2d' as string,
    large: false as boolean,
    stack: false as boolean,
};

export const StructureOfBarPolarOption = {
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

export const StructureOfScatterSeriesOption = {
    large: false as boolean,
    symbolSize: 10 as number,
};

export const StructureOfPieSeriesOption = {
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

export const StructureOfGaugeSeriesOption = {
    min: 0,
    max: 100,
    progress: {
        show: true,
    },
    axisTick: {
        show: false,
    },
    axisLabel: {
        // only number
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
    anchor: {
        show: true,
        showAbove: true,
        size: 25,
        itemStyle: {
            borderWidth: 10,
        },
    },
    detail: {
        fontSize: 22,
        valueAnimation: false,
        formatter: '{value}',
        offsetCenter: [0, '30%'],
    },
    itemStyle: {
        color: '#5470C6',
    },
};
