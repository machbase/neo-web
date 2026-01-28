// import type { EChartOption } from 'echarts'
export enum E_CUSTOM_CHART_TYPE {
    TEXT = 'text',
    TQL = 'tql',
    GEOMAP = 'geomap',
    ADV_SCATTER = 'advScatter',
    VIDEO = 'video',
}
export enum E_CHART_TYPE {
    LINE = 'line',
    BAR = 'bar',
    SCATTER = 'scatter',
    PIE = 'pie',
    RADAR = 'radar',
    CANDLESTICK = 'candlestick',
    HEATMAP = 'heatmap',
    SANKEY = 'sankey',
    GAUGE = 'gauge',
    LIQUID_FILL = 'liquidFill',
    WORD_CLOUD = 'wordCloud',
    TQL = 'tql',
    TEXT = 'text',
    GEOMAP = 'geomap',
    ADV_SCATTER = 'advScatter',
    VIDEO = 'video',
}
export type CustomChartType = (typeof E_CUSTOM_CHART_TYPE)[keyof typeof E_CUSTOM_CHART_TYPE];
export type ChartType =
    | 'line'
    | 'bar'
    | 'scatter'
    | 'pie'
    | 'radar'
    | 'candlestick'
    | 'heatmap'
    | 'sankey'
    | 'gauge'
    | 'liquidFill'
    | 'wordCloud'
    | 'tql'
    | 'text'
    | 'geomap'
    | 'advScatter'
    | 'video';
export type ChartTheme =
    | 'dark'
    | 'white'
    | 'chalk'
    | 'essos'
    | 'infographic'
    | 'macarons'
    | 'purple-passion'
    | 'roma'
    | 'romantic'
    | 'shine'
    | 'vintage'
    | 'walden'
    | 'westeros'
    | 'wonderland';
export type SeriesLineStep = 'start' | 'middle' | 'end' | boolean;
// export type SeriesLineStack = 'total' | string;
// export type SeriesLineStep = 'start' | 'middle' | 'end';
// export type SereisLineCoordinateSystem = 'cartesian2d' | 'polar';
// export type SeriesLineMarkLine = {
//     symbol: string | string[];
//     label: {
//         show: boolean;
//     };
//     data: any; // setting start, end position
// };

// export interface BaseSeries extends EChartOption.SeriesLine {
//     // base
//     type: SeriesType;
//     name: string;
//     data: any;

//     // common options
//     color?: string;
//     smooth?: boolean | number;

//     // chart type options
//     areaStyle?: Object;
//     stack?: SeriesLineStack;
//     markLine?: SeriesLineMarkLine;
//     step?: SeriesLineStep;
//     coordinateSystem?: SereisLineCoordinateSystem;
// }

// export interface PolarOption {
//     id?: string;
//     radius?: number | string | (number | string)[];
// }
// export interface RadiusAxisOption {
//     type: 'value' | 'category' | 'time' | 'log';
//     // Category data, available in type: 'category' axis.
//     data: any[];
// }
// export interface AngleAxisOption {
//     startAngle: number;
//     min?: number | string;
//     max?: number | string;
// }
