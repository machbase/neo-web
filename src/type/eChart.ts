// import type { EChartOption } from 'echarts'
export type ChartType = 'line' | 'bar' | 'scatter' | 'pie' | 'radar' | 'candlestick' | 'heatmap' | 'sankey' | 'gauge' | 'liquidFill' | 'wordCloud' | 'tql';
export type ChartTheme =
    | 'dark'
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
