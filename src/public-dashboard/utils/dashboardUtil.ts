import { getId } from '.';
import { tqlString } from '@/utils/queryText';
import {
    DefaultBarChartOption,
    DefaultLineChartOption,
    DefaultPieChartOption,
    DefaultScatterChartOption,
    DefaultTagTableOption,
    DefaultGaugeChartOption,
    StructureOfBarSeriesOption,
    StructureOfBarPolarOption,
    StructureOfCommonOption,
    StructureOfGaugeSeriesOption,
    StructureOfLineSeriesOption,
    StructureOfPieSeriesOption,
    StructureOfScatterSeriesOption,
    StructureOfLineVisualMapOption,
    DefaultLogTableOption,
    chartTypeConverter,
    DefaultVariableTableOption,
    DefaultViewTableOption,
    DefaultTransactionTableOption,
} from './eChartHelper';
import { TABLE_COLUMN_TYPE, DB_NUMBER_TYPE, ChartSeriesColorList, ChartAxisTooltipFormatter } from './constants';
import { ChartType } from '../type/eChart';
import { SqlResDataType } from './DashboardQueryParser';
import { TAG_AGGREGATOR_LIST, LOG_AGGREGATOR_LIST, GEOMAP_AGGREGATOR_LIST, NAME_VALUE_AGGREGATOR_LIST, NAME_VALUE_VIRTUAL_AGG_LIST } from './aggregatorConstants';

// With no position given, v6 lays the slider out 8px higher than v5 did, onto the x-axis labels of a
// grid whose bottom is fixed at 50. `bottom: 14` is where v5 put it; both versions render it there.
const DATA_ZOOM_SLIDER = { type: 'slider', bottom: 14 };

export enum E_VISUAL_LOAD_ID {
    CHART = 'chartID',
    MAP = 'geomapID',
}
export const CheckObjectKey = (data: object, key: string): boolean => {
    if (!data) return false;
    return Object.prototype.hasOwnProperty?.call(data, key);
};
export const PanelIdParser = (id: string | undefined) => {
    return `$${id?.replaceAll('-', '_')}`;
};

export const convertToMachbaseIntervalMs = (intervalMs: number) => {
    let ms = '';
    let unit = '';
    if (intervalMs < 1000) {
        ms = intervalMs.toString();
        unit = 'msec';
    } else if (intervalMs < 60 * 1000) {
        ms = Math.ceil(intervalMs / 1000).toString();
        unit = 'sec';
    } else if (intervalMs < 60 * 60 * 1000) {
        ms = Math.ceil(intervalMs / 1000 / 60).toString();
        unit = 'min';
    } else if (intervalMs < 60 * 60 * 24 * 1000) {
        ms = Math.ceil(intervalMs / 1000 / 60 / 60).toString();
        unit = 'hour';
    } else {
        ms = Math.ceil(intervalMs / 1000 / 60 / 60 / 24).toString();
        unit = 'day';
    }
    return ms + ' ' + unit;
};

export const checkValueBracket = (value: string) => {
    if (value.includes('(') && value.includes(')')) {
        return true;
    } else {
        return false;
    }
};

// The editor's setUnitTime: an unset (null/'') or malformed time resolves to now instead of 0/NaN (#1558).
export { setUnitTime } from '@/utils/dashboardUtil';

export const tagTableValue = () => {
    return {
        id: getId(),
        table: '',
        color: '#73BF69',
        userName: '',
        tableInfo: [],
        type: 'tag',
        filter: [{ id: getId(), column: '', operator: '=', value: '', useFilter: true }],
        values: [{ id: getId(), alias: '', value: '', jsonKey: '', aggregator: 'avg' }],
        useRollup: false,
        name: '',
        time: '',
        useCustom: true,
        aggregator: 'avg',
        tag: '',
        value: '',
        jsonKey: '',
    };
};

// Time value agg list
export const tagAggregatorList = TAG_AGGREGATOR_LIST;
export const logAggregatorList = LOG_AGGREGATOR_LIST;
export const geomapAggregatorList = GEOMAP_AGGREGATOR_LIST;
export const SEPARATE_DIFF: boolean = false;
// Name value agg list
export const nameValueAggregatorList = NAME_VALUE_AGGREGATOR_LIST;
// Name value agg + Virtual table
export const nameValueVirtualAggList = NAME_VALUE_VIRTUAL_AGG_LIST;

export const refreshTimeList = ['Off', '3 seconds', '5 seconds', '10 seconds', '30 seconds', '1 minute', '5 minutes', '10 minutes', '1 hour'];

export const createDefaultTagTableOption = (aUser: string, aTable: any, aTableType: string, aTag: string, aChartType?: string) => {
    let sDefaultTableOpt = undefined;
    if (aTableType === 'tag') sDefaultTableOpt = DefaultTagTableOption;
    else if (aTableType === 'view') sDefaultTableOpt = DefaultViewTableOption;
    else if (aTableType === 'transaction') sDefaultTableOpt = DefaultTransactionTableOption;
    else if (aTableType === 'log') sDefaultTableOpt = DefaultLogTableOption;
    else sDefaultTableOpt = DefaultVariableTableOption;

    // Copy before mutating. Without this the Geomap line below writes `useCustom` straight onto the
    // module-level default object, so every later block on the page inherits it.
    sDefaultTableOpt = JSON.parse(JSON.stringify(sDefaultTableOpt));
    if (aChartType === 'Geomap') sDefaultTableOpt.useCustom = true;

    const sOption = [{ ...sDefaultTableOpt, userName: aUser, table: aTable ? aTable[3] : '', type: aTableType, tag: aTag }];
    return sOption;
};

export const createOption = (aOptionInfo: any, aTagList: any) => {
    // set common chart option
    let sOption = createCommonOption(aOptionInfo.commonOptions);

    // set series option
    if (aOptionInfo.type === 'line') {
        const sIsVisualMap = aOptionInfo.chartOptions?.markLine.data.length > 0;
        sOption = {
            ...sOption,
            series: setLineSeries(aOptionInfo, aTagList),
            visualMap: sIsVisualMap ? createLineVisualMapOption(aOptionInfo.chartOptions, aTagList) : null,
        };
    }
    if (aOptionInfo.type === 'bar') {
        const sIsPolar = aOptionInfo.chartOptions.isPolar;
        sOption = {
            ...sOption,
            ...(sIsPolar ? createBarPolarOption(aOptionInfo.chartOptions) : null),
            series: setBarSeries(aOptionInfo, aTagList),
        };
    }
    if (aOptionInfo.type === 'scatter') {
        sOption = {
            ...sOption,
            series: setScatterSeries(aOptionInfo, aTagList),
        };
    }
    if (aOptionInfo.type === 'gauge') {
        sOption = {
            ...sOption,
            series: setGaugeSeries(aOptionInfo, aTagList),
        };
    }
    if (aOptionInfo.type === 'pie') {
        sOption = {
            ...sOption,
            series: setPieSeries(aOptionInfo),
            dataset: {
                source: 'column(0)',
            },
        };
    }

    // set xAxis, yAxis option
    if (aOptionInfo.type === 'gauge' || aOptionInfo.type === 'pie' || (aOptionInfo.type === 'bar' && aOptionInfo.chartOptions.isPolar)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { xAxis, yAxis, ...restOption } = sOption;
        sOption = restOption;
    } else {
        sOption.xAxis = createXAxisOption(aOptionInfo);
        sOption.yAxis = createYAxisOption(aOptionInfo);
    }

    return sOption;
};

export const createCommonOption = (aCommonOptions: any) => {
    const sCommon = JSON.parse(JSON.stringify(StructureOfCommonOption));
    sCommon.legend.show = aCommonOptions.isLegend;
    sCommon.tooltip.show = aCommonOptions.isTooltip;
    sCommon.tooltip.trigger = aCommonOptions.tooltipTrigger;
    sCommon.dataZoom = aCommonOptions.isDataZoom ? [DATA_ZOOM_SLIDER] : false;
    if (aCommonOptions.isTooltip && aCommonOptions.tooltipTrigger === 'axis') {
        sCommon.tooltip.formatter = ChartAxisTooltipFormatter;
    }
    return sCommon;
};

export const createXAxisOption = (aOptionInfo: any) => {
    const sXAxisOption = [] as any;
    aOptionInfo.xAxisOptions &&
        aOptionInfo.xAxisOptions.map((aItem: any) => {
            sXAxisOption.push(aItem);
        });
    if (aOptionInfo.chartOptions?.isStack) {
        sXAxisOption[0] = {
            ...sXAxisOption[0],
            data: 'column(0)',
        };
    }

    return sXAxisOption;
};

export const createYAxisOption = (aOptionInfo: any) => {
    const sYAxisOption = [] as any;
    aOptionInfo.yAxisOptions &&
        aOptionInfo.yAxisOptions.map((aItem: any) => {
            sYAxisOption.push(aItem);
        });

    return sYAxisOption;
};

export const createLineVisualMapOption = (aOptionInfo: any, aTagList: any) => {
    const sSeriesIndexArray = Array.from(aTagList, (_, aIndex) => aIndex);
    const sPieces = aOptionInfo.markLine.data.reduce((aAcc: any, aCurrent: any, aIndex: number, aArr: any) => {
        if (aIndex % 2 === 0 && aIndex < aArr.length - 1) {
            aAcc.push({ min: aCurrent.xAxis, max: aArr[aIndex + 1].xAxis, color: ChartSeriesColorList[0] });
        }
        return aAcc;
    }, []);

    const sVisualMapOption = JSON.parse(JSON.stringify(StructureOfLineVisualMapOption));
    sVisualMapOption.seriesIndex = sSeriesIndexArray;
    sVisualMapOption.pieces = sPieces;

    return sVisualMapOption;
};

export const createLineSeriesOption = (aLineOption: any, aXAxis: any[], aYAxis: any[], aIndex: number) => {
    let sLineOption = JSON.parse(JSON.stringify(StructureOfLineSeriesOption));
    sLineOption.areaStyle = aLineOption.areaStyle ? { opacity: 0.2 } : null;
    sLineOption.smooth = aLineOption.smooth;
    sLineOption.step = aLineOption.isStep ? 'start' : false;
    sLineOption.stack = aLineOption.isStack ? 'total' : null;
    sLineOption.lineStyle = aLineOption.markLine ? { color: ChartSeriesColorList[aIndex], width: 2 } : null;
    sLineOption.markLine = aIndex === 0 ? aLineOption.markLine : {};
    sLineOption.connectNulls = aLineOption.connectNulls;

    // multi xaxis option add xAxisIndex
    if (aXAxis.length > 1 && aIndex !== 0) {
        sLineOption = {
            ...sLineOption,
            xAxisIndex: aIndex,
        };
    }
    // multi yaxis option add yAxisIndex
    if (aYAxis.length > 1 && aIndex !== 0) {
        sLineOption = {
            ...sLineOption,
            yAxisIndex: aIndex,
        };
    }

    return sLineOption;
};

export const createBarSeriesOption = (aBarOption: any) => {
    const sBarOption = JSON.parse(JSON.stringify(StructureOfBarSeriesOption));
    sBarOption.coordinateSystem = aBarOption.isPolar ? 'polar' : 'cartesian2d';
    sBarOption.large = aBarOption.isLarge;
    sBarOption.stack = aBarOption.isStack ? 'total' : null;

    return sBarOption;
};

export const createBarPolarOption = (aBarOption: any) => {
    const sBarPolarOption = JSON.parse(JSON.stringify(StructureOfBarPolarOption));
    sBarPolarOption.angleAxis.max = aBarOption.maxValue;
    sBarPolarOption.angleAxis.startAngle = aBarOption.startAngle;
    return sBarPolarOption;
};

export const createScatterSeriesOption = (aScatterOption: any) => {
    const sScatterOption = JSON.parse(JSON.stringify(StructureOfScatterSeriesOption));
    sScatterOption.large = aScatterOption.isLarge;
    sScatterOption.symbolSize = aScatterOption.symbolSize;

    return sScatterOption;
};

export const createGaugeSeriesOption = (aGaugeOption: any) => {
    const sGaugeOption = JSON.parse(JSON.stringify(StructureOfGaugeSeriesOption));
    sGaugeOption.min = aGaugeOption.min;
    sGaugeOption.max = aGaugeOption.max;
    sGaugeOption.axisTick.show = aGaugeOption.isAxisTick;
    sGaugeOption.axisLabel.distance = Number(aGaugeOption.axisLabelDistance);
    sGaugeOption.anchor.show = aGaugeOption.isAnchor;
    sGaugeOption.anchor.size = aGaugeOption.anchorSize;
    sGaugeOption.detail.fontSize = aGaugeOption.valueFontSize;
    sGaugeOption.detail.valueAnimation = aGaugeOption.valueAnimation;
    sGaugeOption.detail.offsetCenter[1] = aGaugeOption.alignCenter + '%';
    // TODO change you need gauge option
    return sGaugeOption;
};

export const createPieSeriesOption = (aPieOption: any) => {
    const sPieOption = JSON.parse(JSON.stringify(StructureOfPieSeriesOption));
    sPieOption.radius[0] = aPieOption.doughnutRatio;
    sPieOption.roseType = aPieOption.roseType ? 'area' : false;

    return sPieOption;
};

export const setLineSeries = (aOptionInfo: any, aTagList: any) => {
    const sSeries = [] as any[];
    // const sIsStack = aOptionInfo.chartOptions?.isStack;
    for (let i = 0; i < aTagList.length; i++) {
        // const sColumnIndex = sIsStack ? i + 1 : i;
        const sTempObject = {
            ...createLineSeriesOption(aOptionInfo.chartOptions ?? DefaultLineChartOption, aOptionInfo.xAxisOptions, aOptionInfo.yAxisOptions, i),
            type: aOptionInfo.type,
            data: [],
            name: aTagList[i],
        };
        sSeries.push(sTempObject);
    }
    return sSeries;
};

export const setBarSeries = (aOptionInfo: any, aTagList: any) => {
    const sSeries = [];
    // const sIsStack = aOptionInfo.chartOptions?.isStack;
    for (let i = 0; i < aTagList.length; i++) {
        // const sColumnIndex = sIsStack ? i + 1 : i;
        const sTempObject = {
            ...createBarSeriesOption(aOptionInfo.chartOptions ?? DefaultBarChartOption),
            type: aOptionInfo.type,
            data: [],
            name: aTagList[i],
        };
        sSeries.push(sTempObject);
    }
    return sSeries;
};

export const setScatterSeries = (aOptionInfo: any, aTagList: any) => {
    const sSeries = [];
    for (let i = 0; i < aTagList.length; i++) {
        const sTempObject = {
            ...createScatterSeriesOption(aOptionInfo.chartOptions ?? DefaultScatterChartOption),
            type: aOptionInfo.type,
            data: [],
            name: aTagList[i],
        };
        sSeries.push(sTempObject);
    }
    return sSeries;
};

export const setPieSeries = (aOptionInfo: any) => {
    const sSeries = [] as any[];
    // TODO multi pie series
    const sTempObject = {
        ...createPieSeriesOption(aOptionInfo.chartOptions ?? DefaultPieChartOption),
        type: aOptionInfo.type,
    };
    sSeries.push(sTempObject);

    return sSeries;
};

export const setGaugeSeries = (aOptionInfo: any, aTagList: any) => {
    const sSeries = [] as any[];
    for (let i = 0; i < aTagList.length; i++) {
        const sTempObject = {
            ...createGaugeSeriesOption(aOptionInfo.chartOptions ?? DefaultGaugeChartOption),
            type: aOptionInfo.type,
            data: 'column(' + i + ')',
            name: aTagList[i],
        };
        sSeries.push(sTempObject);
    }

    return sSeries;
};

export const changeXAxisType = (aSeries: any, aType: 'category' | 'time') => {
    return {
        ...aSeries,
        xAxis: {
            ...aSeries.xAxis,
            type: aType,
        },
    };
};

export const removeColumnQuotes = (aStr: string) => {
    return aStr.replace(/"column\((\d+)\)"/g, 'column($1)');
};

export const decodeFormatterFunction = (aStr: string) => {
    return aStr.replace(/"(function \((params)(, api)?\) \{.*?\})"/g, (aMatch) => {
        if (aMatch.startsWith('"') && aMatch.endsWith('"')) {
            return aMatch.slice(1, -1);
        }
        return aMatch;
    });
};

export const createMapValueForTag = (aTags: any, aIsStack: boolean) => {
    let sResultString = '';
    let sMapValueString = '';
    let sPopValueString = '0';
    const sTagNum = aTags.length;
    for (let i = 0; i < sTagNum; i++) {
        // when select name, time, value
        // time, name , value
        sMapValueString += `MAPVALUE(${i + 3}, value(1) == ${tqlString(aTags[i])} ? value(2) : NULL)\n`;
    }
    sResultString = sMapValueString + `POPVALUE(1, 2)\n`;
    if (aIsStack) {
        const sGroupValueString = 'GROUP(by(value(0)), {replace})\n';
        let sReplaceValueString = '';
        for (let i = 0; i < sTagNum; i++) {
            sReplaceValueString += `max(value(${i + 1}) == NULL ? -999999 : value(${i + 1}))`;
            if (i !== sTagNum - 1) sReplaceValueString += ', ';
        }
        sResultString += sGroupValueString.replace('{replace}', sReplaceValueString);
    } else {
        sMapValueString = '';
        for (let i = 0; i < sTagNum; i++) {
            sMapValueString += `MAPVALUE(${sTagNum + (i + 1)}, list(value(0), value(${i + 1}) == NULL ? NULL : value(${i + 1})))\n`;
            sPopValueString += ', ' + (i + 1);
        }
        sResultString += sMapValueString + `POPVALUE(${sPopValueString})\n`;
    }
    return sResultString;
};

export const createMapValueForPie = () => {
    return 'MAPVALUE(0, list(value(1), value(2)))\n';
};

export { calcRefreshTime } from '@/utils/dashboardUtil';
export { calcInterval, calcNumericInterval } from '@/utils/dashboardUtil';


export const getTableType = (aTypeNumber: number) => {
    switch (aTypeNumber) {
        case 0:
            return 'log';
        case 1:
            return 'fixed';
        case 3:
            return 'volatile';
        case 4:
            return 'lookup';
        case 5:
            return 'kv';
        case 6:
            return 'tag';
        case 7:
            return 'view';
        case 8:
            return 'transaction';
        default:
            return '';
    }
};

export const getColumnType = (columnId: number) => {
    const targetColumn = TABLE_COLUMN_TYPE.find((column) => column.key === columnId);

    if (targetColumn) return targetColumn.value.toLowerCase();
    else return 'unknown ' + `(${columnId})`;
};

export const isNumberTypeColumn = (aType: number) => {
    const colType = TABLE_COLUMN_TYPE.find((item) => item.key === aType);
    if (colType && DB_NUMBER_TYPE.some((item) => item === colType.value)) {
        return true;
    } else {
        return false;
    }
};

export const useXAxis = (aType: ChartType) => {
    switch (aType) {
        case 'line':
        case 'bar':
        case 'scatter':
        case 'advScatter':
            return true;
        default:
            return false;
    }
};
export const useYAxis = (aType: ChartType) => {
    switch (aType) {
        case 'line':
        case 'bar':
        case 'scatter':
        case 'advScatter':
            return true;
        default:
            return false;
    }
};

export const getChartDefaultWidthSize = (aType: string, isPolar: any): number => {
    const sChartDataType = SqlResDataType(chartTypeConverter(aType));
    if (sChartDataType === 'TIME_VALUE' && !isPolar) return 17;
    return 7;
};

export const getChartSeriesName = ({ alias, table, column, aggregator }: { alias: string; table: string; column: string; aggregator: string }) => {
    if (alias) return alias;
    else return `${table}_${column}(${aggregator})`;
};
