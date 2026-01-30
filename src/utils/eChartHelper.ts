import { generateUUID } from '@/utils';
import { ChartTheme, ChartType, E_CUSTOM_CHART_TYPE, CustomChartType } from '@/type/eChart';
import { ChartTypeList } from './constants';
import { getDefaultColor } from './helpers/tags';

// use create common chart option (createCommonOption)
export const DefaultCommonOption = {
    isLegend: true as boolean,
    legendTop: 'bottom' as 'top' | 'center' | 'top',
    legendLeft: 'center' as 'left' | 'center' | 'right',
    legendOrient: 'horizontal' as 'horizontal' | 'vertical',
    isTooltip: true as boolean,
    tooltipTrigger: 'axis' as 'item' | 'axis' | 'none',
    tooltipBgColor: '#FFFFFF' as string,
    tooltipTxtColor: '#333' as string,
    tooltipUnit: '' as string,
    tooltipDecimals: 3 as number | undefined,
    isDataZoom: false as boolean,
    title: 'New chart' as string,
    isInsideTitle: true as boolean,
    gridLeft: 35 as number,
    gridRight: 35 as number,
    gridTop: 50 as number,
    gridBottom: 50 as number,
};

export const chartTypeConverter = (aType: string): string => {
    const sResult = ChartTypeList.filter((aTypeObj: { key: string; value: string }) => aTypeObj.key === aType)[0];
    return sResult.value;
};
const CustomChartTypeList = Object.values(E_CUSTOM_CHART_TYPE);
// Check if it is a chart that uses a custom type.
export const CheckCustomChartType = (aType: ChartType): boolean => {
    if (CustomChartTypeList?.includes(chartTypeConverter(aType) as CustomChartType)) return true;
    else return false;
};

export const DefaultXAxisOption = {
    type: 'time' as string,
    axisTick: {
        alignWithLabel: true as boolean,
    },
    axisLabel: { hideOverlap: true },
    useBlockList: [0] as number[],
    scale: true,
    useMinMax: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    label: {
        name: 'value' as string,
        key: 'value' as string,
        title: '' as string,
        unit: '' as string,
        decimals: undefined as number | undefined,
        squared: 0 as number,
    },
    axisLine: { onZero: false as boolean },
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
    offset: '' as string,
    alignTicks: true,
    scale: true,
    useMinMax: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    label: {
        name: 'value' as string,
        key: 'value' as string,
        title: '' as string,
        unit: '' as string,
        decimals: undefined as number | undefined,
        squared: 0 as number,
    },
    axisLine: { onZero: false as boolean },
    thresholds: [] as { value: number; color: string }[],
    // axisLine: {
    //     lineStyle: {
    //         color: '#fff'
    //     }
    // }
};

export const DeafultVideoOption = {
    source: {
        table: '' as string,
        camera: '' as string,
        liveModeOnStart: false as boolean,
        enableSync: false as boolean,
    },
    event: {},
    dependent: {
        panels: [],
        color: '#FB9E00' as string,
    },
};

export const DefaultGeomapOpntion = {
    tooltipTime: true as boolean,
    tooltipCoor: false as boolean,
    intervalType: 'none' as string,
    intervalValue: '' as string,
    coorLat: [0] as Array<number>,
    coorLon: [1] as Array<number>,
    marker: [{ shape: 'circle', radius: 150 }] as Array<{ shape: string; radius: number }>,
    useZoomControl: false as boolean,
    useAutoRefresh: true as boolean,
};
export const DefaultTextchartOpntion = {
    tagLimit: 2 as number,
    fontSize: 100 as number,
    symbol: 'circle' as string,
    isSymbol: true as boolean,
    symbolSize: 1 as number,
    color: [['default', '#FFFFFF']] as [number | string, string][],
    chartType: 'line' as string,
    chartColor: '#367FEB' as string,
    fillOpacity: 0.1 as number,
    digit: 3 as number,
    unit: '' as string,
    textSeries: [0] as number[],
    chartSeries: [0] as number[],
};
export const DefaultTqlChartOption = {
    theme: 'white' as string,
};

export const DefaultLineChartOption = {
    areaStyle: false as boolean,
    smooth: false as boolean,
    isStep: false as boolean,
    isStack: false as boolean,
    connectNulls: true as boolean,
    isSymbol: false as boolean,
    symbol: 'circle' as string,
    symbolSize: 4 as number,
    isSampling: false as boolean,
    fillOpacity: 0.3 as number,
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
    polarAxis: 'time' as 'category' | 'time',
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
    symbol: 'circle' as string,
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
    digit: 0 as number | undefined,
    axisLineStyleWidth: 10 as number,
    isAxisLineStyleColor: false as boolean,
    axisLineStyleColor: [
        [0.5, '#c2c2c2'],
        [1, '#F44E3B'],
    ] as any,
};

export const DefaultChartOption = {
    id: undefined as string | undefined,
    title: 'New chart' as string,
    titleColor: '' as string,
    type: 'Line' as ChartType,
    theme: 'dark' as ChartTheme,
    timeRange: {
        start: '' as string | undefined,
        end: '' as string | undefined,
        refresh: 'Off' as any,
    },
    isAxisInterval: false as boolean,
    axisInterval: {
        IntervalType: '' as string,
        IntervalValue: '' as string,
    },
    blockList: undefined as any,
    transformBlcokList: undefined as any,
    useCustomTime: false as boolean,
    tqlInfo: undefined as any,

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

// Blackbox panel option - independent from chart system
export const DefaultBlackboxOption = {
    id: undefined as string | undefined,
    title: 'Blackbox Panel' as string,
    type: 'Blackbox' as string,
    theme: 'dark' as ChartTheme,
    x: 0 as number,
    y: 0 as number,
    w: 6 as number,
    h: 6 as number,
};

export const DefaultVariableTableOption = {
    id: generateUUID(),
    table: '' as string | undefined,
    userName: '' as string | undefined,
    color: getDefaultColor(),
    type: '',
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: generateUUID(), alias: '', value: 'VALUE', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: 'TIME',
    useCustom: false,
    aggregator: 'avg',
    diff: 'none',
    tag: '',
    value: 'VALUE',
    alias: '',
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    customFullTyping: {
        use: false,
        text: '',
    },
    isVisible: true,
};

export const DefaultTagTableOption = {
    id: generateUUID(),
    table: undefined as string | undefined,
    userName: undefined as string | undefined,
    color: getDefaultColor(),
    type: 'tag',
    filter: [{ id: generateUUID(), column: 'NAME', operator: '', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: generateUUID(), alias: '', value: 'VALUE', aggregator: 'avg' }],
    useRollup: false,
    name: 'NAME',
    time: 'TIME',
    useCustom: false,
    aggregator: 'avg',
    diff: 'none',
    tag: '',
    value: 'VALUE',
    alias: '',
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    customFullTyping: {
        use: false,
        text: '',
    },
    isVisible: true,
};

export const DefaultLogTableOption = {
    id: generateUUID(),
    table: undefined as string | undefined,
    userName: undefined as string | undefined,
    color: getDefaultColor(),
    type: 'log',
    filter: [{ id: generateUUID(), column: '', operator: '', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: generateUUID(), alias: '', value: '', aggregator: 'avg' }],
    useRollup: false,
    name: '',
    time: '_ARRIVAL_TIME',
    useCustom: true,
    aggregator: 'avg',
    diff: 'none',
    tag: '',
    value: '',
    alias: '',
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    customFullTyping: {
        use: false,
        text: '',
    },
    isVisible: true,
};

export const getDefaultSeriesOption = (aChartType: ChartType) => {
    switch (aChartType) {
        case 'line':
            return DefaultLineChartOption;
        case 'bar':
            return DefaultBarChartOption;
        case 'scatter':
        case 'advScatter':
            return DefaultScatterChartOption;
        case 'gauge':
            return DefaultGaugeChartOption;
        case 'pie':
            return DefaultPieChartOption;
        case 'liquidFill':
            return DefaultLiquidfillChartOption;
        case 'tql':
            return DefaultTqlChartOption;
        case 'text':
            return DefaultTextchartOpntion;
        case 'geomap':
            return DefaultGeomapOpntion;
        case 'video':
            return DeafultVideoOption;
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
    fillOpacity: 0.3 as number,
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
        type: 'time',
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
