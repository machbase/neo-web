import { generateUUID } from '@/utils';
import { ChartTheme, ChartType } from '@/type/eChart';

// use create common chart option (createCommonOption)
export const DefaultCommonOption = {
    isLegend: true as boolean,
    legendTop: 'bottom' as 'top' | 'center' | 'top',
    legendLeft: 'center' as 'left' | 'center' | 'right',
    legendOrient: 'horizontal' as 'horizontal' | 'vertical',
    isTooltip: true as boolean,
    tooltipTrigger: 'item' as 'item' | 'axis' | 'none',
    tooltipBgColor: '#FFFFFF' as string,
    tooltipTxtColor: '#333' as string,
    isDataZoom: false as boolean,
    title: 'chart Title' as string,
    isInsideTitle: false as boolean,
    gridLeft: 35 as number,
    gridRight: 35 as number,
    gridTop: 50 as number,
    gridBottom: 50 as number,
};

export const DefaultXAxisOption = {
    type: 'time' as string,
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
    scale: true,
    useMinMax: false,
    min: 0 as number,
    max: 100 as number,
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
    symbol: 'none' as string,
    symbolSize: 4 as number,
    isSampling: false as boolean,
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
    tagLimit: 12 as number,
};

export const DefaultBarChartOption = {
    isStack: false as boolean,
    isLarge: false as boolean,
    isPolar: false as boolean,
    polarRadius: 30 as number,
    polarSize: 80 as number,
    startAngle: 90 as number,
    maxValue: 100 as number,
    tagLimit: 12 as number,
    polarAxis: 'category' as 'category' | 'time',
    // coordinateSystem: 'cartesian2d' as 'cartesian2d' | 'polar',
};

export const DefaultLiquidfillChartOption = {
    shape: 'circle' as 'container' | 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow',
    amplitude: 20 as number,
    waveAnimation: false as boolean,
    isOutline: false as boolean,
    minData: 0 as number,
    maxData: 1 as number,
    fontSize: 30 as number,
    tagLimit: 1 as number,
    unit: '%' as string,
    digit: 0 as number,
    backgroundColor: '#E3F7FF' as string,
};

export const DefaultScatterChartOption = {
    isLarge: false as boolean,
    symbolSize: 4 as number,
    tagLimit: 12 as number,
};

export const DefaultPieChartOption = {
    doughnutRatio: 50 as number,
    roseType: false as boolean | string,
    tagLimit: 12 as number,
};

export const DefaultGaugeChartOption = {
    isAxisTick: true as boolean,
    axisLabelDistance: 25 as number,
    // axisLabelColor: '#999' as string,
    // axisLabelFontSize: 16 as number,
    valueFontSize: 15 as number,
    valueAnimation: false as boolean,
    alignCenter: 30 as number,
    isAnchor: true as boolean,
    anchorSize: 25 as number,
    min: 0 as number,
    max: 100 as number,
    tagLimit: 1 as number,
    gaugeValueLimit: 0 as number | undefined,
    axisLineStyleWidth: 10 as number,
    isAxisLineStyleColor: false as boolean,
    axisLineStyleColor: [
        [0.5, '#c2c2c2'],
        [1, '#F44E3B'],
    ] as any,
};

export const DefaultChartOption = {
    id: undefined as string | undefined,
    title: 'Chart title' as string,
    type: 'line' as ChartType,
    theme: 'dark' as ChartTheme,
    timeRange: {
        start: 'now-1y' as string | undefined,
        end: 'now' as string | undefined,
        refresh: 'Off' as any,
    },
    isAxisInterval: false as boolean,
    axisInterval: {
        IntervalType: 'sec' as string,
        IntervalValue: 1 as number,
    },
    blockList: undefined as any,
    useCustomTime: false as boolean,

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
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false, useTyping: false }],
    values: [{ id: generateUUID(), alias: '', value: 'VALUE', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: 'TIME',
    useCustom: false,
    aggregator: 'avg',
    tag: '',
    value: 'VALUE',
    alias: '',
};

export const DefaultLogTableOption = {
    id: generateUUID(),
    table: undefined as string | undefined,
    userName: undefined as string | undefined,
    color: '#73BF69',
    type: 'log',
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false, useTyping: false }],
    values: [{ id: generateUUID(), alias: '', value: '', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: '_ARRIVAL_TIME',
    useCustom: true,
    aggregator: 'avg',
    tag: '',
    value: '',
    alias: '',
};

export const getDefaultSeriesOption = (aChartType: ChartType) => {
    switch (aChartType) {
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
        case 'liquidFill':
            return DefaultLiquidfillChartOption;
        default:
            return DefaultLineChartOption;
    }
};

export const CheckPlgChart = (aChartType: ChartType) => {
    switch (aChartType) {
        case 'liquidFill':
            return { plg: 'liquidfill' };
        default:
            return null;
    }
};

// structure of chart option
export const StructureOfCommonOption = {
    legend: {
        show: true as boolean,
    },
    tooltip: {
        show: true as boolean,
        confine: true as boolean,
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
    symbolSize: 4 as number,
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
