import { getId, convertToNewRollupSyntax } from '.';
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
} from '@/utils/eChartHelper';
import { TABLE_COLUMN_TYPE, DB_NUMBER_TYPE, ChartSeriesColorList, ChartAxisTooltipFormatter, DB_STRING_TYPE } from '@/utils/constants';
import { ChartType } from '@/type/eChart';
import moment from 'moment';
import { SqlResDataType } from './DashboardQueryParser';
import { TAG_AGGREGATOR_LIST, LOG_AGGREGATOR_LIST, GEOMAP_AGGREGATOR_LIST, NAME_VALUE_AGGREGATOR_LIST, NAME_VALUE_VIRTUAL_AGG_LIST } from './aggregatorConstants';

/**
 * Safely check if a time value is a special time string (now or last)
 * @param timeValue - The time value to check (can be string, number, or undefined)
 * @returns true if the value is a string containing 'now' or 'last', false otherwise
 */
export const isSpecialTimeValue = (timeValue: string | number | undefined | null): boolean => {
    return typeof timeValue === 'string' && (timeValue.includes('now') || timeValue.includes('last'));
};

/**
 * Safely format a time value for display
 * @param timeValue - The time value (string timestamp with 'now'/'last', or number timestamp)
 * @param format - Moment format string (default: 'yyyy-MM-DD HH:mm:ss')
 * @returns Formatted time string, or the original special value if it contains 'now'/'last'
 */
export const formatTimeValue = (timeValue: string | number | undefined | null, format: string = 'yyyy-MM-DD HH:mm:ss'): string => {
    if (!timeValue && timeValue !== 0) return '';
    if (isSpecialTimeValue(timeValue)) return timeValue as string;
    if (typeof timeValue === 'number') return moment(timeValue).format(format);
    // Try to parse as date string
    try {
        return moment(timeValue).format(format);
    } catch (e) {
        return String(timeValue);
    }
};

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

export const setUnitTime = (aTime: any) => {
    // Handle undefined, null, or empty values
    if (aTime === undefined || aTime === null || aTime === '') {
        return new Date().getTime(); // Default to current time
    }

    const sMomentValid = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH', 'YYYY-MM-DD', 'YYYY-MM', 'YYYY'];

    // Convert 'last' to 'now' for backward compatibility
    if (typeof aTime === 'string' && aTime.toLowerCase().includes('last')) {
        aTime = aTime.toLowerCase().replace('last', 'now');
    }

    if (aTime === 'now') return new Date().getTime();
    else if (!isNaN(Number(aTime))) return Number(aTime);
    else if (moment(aTime, sMomentValid, true).isValid()) return moment(aTime).unix() * 1000;
    else if (typeof aTime === 'string') {
        let sAggrPlus = true;

        if (aTime.includes('-')) sAggrPlus = false;

        const sCalcTime = aTime.slice(0, -1).split(sAggrPlus ? '+' : '-')[1];

        let sSecTime = -1;
        switch (aTime.slice(-1)) {
            case 's':
                sSecTime = sCalcTime * 1000;
                break;
            case 'm':
                sSecTime = sCalcTime * 1000 * 60;
                break;
            case 'h':
                sSecTime = sCalcTime * 1000 * 3600;
                break;
            case 'd':
                sSecTime = sCalcTime * 1000 * 24 * 3600;
                break;
            case 'M':
                sSecTime = sCalcTime * 1000 * 24 * 3600 * 30;
                break;
            case 'y':
                sSecTime = sCalcTime * 1000 * 24 * 3600 * 365;
                break;
        }

        return new Date().getTime() - sSecTime;
    } else {
        // Fallback: return current time for unexpected types
        return new Date().getTime();
    }
};

export const createQuery = (aInfo: any, aTime: any, aStart: number, aEnd: number) => {
    if (aInfo.useRollup && aTime.IntervalType === 'day' && aInfo.type === 'tag' && aInfo.useCustom && aInfo.aggregator !== 'none') {
        let sTime = '';
        let sValue = '';
        let sSubQuery = '';
        let sFilter = '';
        const sWhereTime = `${aInfo.time} between ${aStart}000000 and ${aEnd}000000`;

        let sRollupValue = 1;
        if (aTime.IntervalType === 'sec') {
            sRollupValue = 1;
        } else if (aTime.IntervalType === 'min') {
            sRollupValue = 60;
        } else if (aTime.IntervalType === 'hour') {
            sRollupValue = 3600;
        }
        const sTimeValue = sRollupValue * 1000000000;
        sTime = `${aInfo.time} / ${sTimeValue} * ${sTimeValue} AS TIME`;

        const sList = aInfo.values.map((aItem: any) => {
            let sAlias;
            let sInfoValue;
            if (aItem.aggregator === 'avg') {
                sInfoValue = `sum(SVAL)/ sum(CVAL)`;
            } else if (aInfo.aggregator === 'sum' || aInfo.aggregator === 'count' || aInfo.aggregator === 'sumsq') {
                sInfoValue = `${aInfo.aggregator}(SVAL)`;
            } else if (aInfo.aggregator === 'min' || aInfo.aggregator === 'max') {
                sInfoValue = `${aInfo.aggregator}(SVAL)`;
            }

            if (!aItem.alias) {
                sAlias = `${aItem.aggregator}(${aItem.value})`;
            } else {
                sAlias = aItem.alias;
            }
            if (aItem.aggregator === 'none') return `${aItem.value} as "${sAlias}"`;
            return `${sInfoValue} as "${sAlias}"`;
        });
        sValue = sList.join(', ');

        let sSubQTime = '';
        let sSubQValue = '';

        // Use new ROLLUP syntax: ROLLUP('HOUR', 1, time_column)
        sSubQTime = `${convertToNewRollupSyntax(aInfo.time, 'hour', 1)} as TIME`;

        if (aInfo.aggregator === 'avg') {
            sSubQValue = `sum(${aInfo.value}) as SVAL, count(${aInfo.value}) as CVAL`;
        } else {
            sSubQValue = `${aInfo.aggregator}(${aInfo.value}) as CVAL`;
        }

        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });

                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        sFilter = sFilterList.join(' AND ');

        sSubQuery = `SELECT ${sSubQTime}, ${sSubQValue} FROM ${aInfo.userName}.${aInfo.table} WHERE ${sWhereTime} AND ${sFilter} GROUP BY TIME`;

        const sQuery = `SELECT ${sTime}, ${sValue} FROM (${sSubQuery}) GROUP BY TIME ORDER BY TIME`;

        return sQuery;
    } else {
        let sTime = '';
        let sValue = '';
        const sTableName = `${aInfo.userName}.${aInfo.table}`;
        let sWhereTime = '';
        let sFilter = '';
        let useGroupBy = true;

        let sRollupValue = 1;
        if (aTime.IntervalType === 'sec') {
            sRollupValue = 1;
        } else if (aTime.IntervalType === 'min') {
            sRollupValue = 60;
        } else if (aTime.IntervalType === 'hour') {
            sRollupValue = 3600;
        }
        const sTimeValue = sRollupValue * 1000000000;
        sTime = `${aInfo.time} / ${sTimeValue} * ${sTimeValue} AS TIME`;

        if (aInfo.type === 'tag') {
            if (aInfo.useCustom) {
                let sAlias;
                if (!aInfo.values[0].alias) {
                    sAlias = `${aInfo.values[0].aggregator}(${aInfo.values[0].value})`;
                } else {
                    sAlias = aInfo.values[0].alias;
                }
                sValue =
                    aInfo.values[0].aggregator === 'none' ? `${aInfo.values[0].value} as "${sAlias}"` : `${aInfo.values[0].aggregator}(${aInfo.values[0].value}) as "${sAlias}"`;
                if (aInfo.values[0].aggregator === 'none') useGroupBy = false;
            } else {
                sValue =
                    aInfo.aggregator === 'none'
                        ? `${aInfo.value} as "${aInfo.aggregator}(${aInfo.value})"`
                        : `${aInfo.aggregator}(${aInfo.value}) as "${aInfo.aggregator}(${aInfo.value})"`;
            }
            if (aInfo.aggregator === 'none') {
                useGroupBy = false;
                sValue = `${aInfo.value} as "${'raw'}(${aInfo.value})"`;
            }
        } else {
            const sList = aInfo.values.map((aItem: any) => {
                let sAlias;
                if (!aItem.alias) {
                    sAlias = `${aItem.aggregator}(${aItem.value})`;
                } else {
                    sAlias = aItem.alias;
                }
                if (aItem.aggregator === 'none') {
                    useGroupBy = false;

                    return `${aItem.value} as "${sAlias}"`;
                }
                return `${aItem.aggregator}(${aItem.value}) as "${sAlias}"`;
            });
            sValue = sList.join(', ');
        }

        sWhereTime = `${aInfo.time} between ${aStart}000000 and ${aEnd}000000`;

        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });
                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        sFilter = sFilterList.join(' AND ');
        const sGroupByQuery = useGroupBy ? 'GROUP BY NAME, TIME' : '';
        const sOrderByQuery = 'ORDER BY NAME, TIME';

        const sQuery = `SELECT NAME, ${sTime}, ${sValue} FROM ${sTableName} WHERE ${sWhereTime} ${aInfo.useCustom ? '' : `AND NAME = ` + `'` + aInfo.tag + `'`} ${
            aInfo.useCustom ? (sFilter ? 'AND ' + sFilter : '') : ``
        } ${sGroupByQuery} ${sOrderByQuery}`;

        return sQuery;
    }
};

export const tagTableValue = () => {
    return {
        id: getId(),
        table: '',
        color: '#73BF69',
        userName: '',
        tableInfo: [],
        type: 'tag',
        filter: [{ id: getId(), column: '', operator: '=', value: '', useFilter: true }],
        values: [{ id: getId(), alias: '', value: '', aggregator: 'avg' }],
        useRollup: false,
        name: '',
        time: '',
        useCustom: true,
        aggregator: 'avg',
        tag: '',
        value: '',
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

export const refreshTimeOptions = refreshTimeList.map((item) => ({
    value: item,
    label: item,
}));

export const createDefaultTagTableOption = (aUser: string, aTable: any, aTableType: string, aTag: string, aChartType?: string) => {
    let sDefaultTableOpt = undefined;
    if (aTableType === 'tag') sDefaultTableOpt = DefaultTagTableOption;
    else if (aTableType === 'log') sDefaultTableOpt = DefaultLogTableOption;
    else sDefaultTableOpt = DefaultVariableTableOption;

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
    sCommon.dataZoom = aCommonOptions.isDataZoom ? [{ type: 'slider' }] : false;
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
        sMapValueString += `MAPVALUE(${i + 3}, value(1) == '${aTags[i]}' ? value(2) : NULL)\n`;
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

export const calcRefreshTime = (aTime: string) => {
    const sTime = aTime.split(' ')[0];
    const sType = aTime.split(' ')[1];
    if (sType === 'seconds') return Number(sTime) * 1000;
    else if (sType === 'minute' || sType === 'minutes') return Number(sTime) * 1000 * 60;
    else return Number(sTime) * 1000 * 60 * 60;
};

export const calcInterval = (aBgn: number, aEnd: number, aWidth: number): { IntervalType: string; IntervalValue: number } => {
    const sDiff = aEnd - aBgn;
    const sSecond = Math.floor(sDiff / 1000);
    const sCalc = sSecond / (aWidth / 3);
    const sRet = { type: 'sec', value: 1 };
    if (sCalc > 60 * 60 * 12) {
        // interval > 12H
        sRet.type = 'day';
        sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
    } else if (sCalc > 60 * 60 * 6) {
        // interval > 6H
        sRet.type = 'hour';
        sRet.value = 12;
    } else if (sCalc > 60 * 60 * 3) {
        // interval > 3H
        sRet.type = 'hour';
        sRet.value = 6;
    } else if (sCalc > 60 * 60) {
        // interval > 1H
        sRet.type = 'hour';
        sRet.value = Math.ceil(sCalc / (60 * 60));
    } else if (sCalc > 60 * 30) {
        // interval > 30M
        sRet.type = 'hour';
        sRet.value = 1;
    } else if (sCalc > 60 * 20) {
        // interval > 20M
        sRet.type = 'min';
        sRet.value = 30;
    } else if (sCalc > 60 * 15) {
        // interval > 15M
        sRet.type = 'min';
        sRet.value = 20;
    } else if (sCalc > 60 * 10) {
        // interval > 10M
        sRet.type = 'min';
        sRet.value = 15;
    } else if (sCalc > 60 * 5) {
        // interval > 5M
        sRet.type = 'min';
        sRet.value = 10;
    } else if (sCalc > 60 * 3) {
        // interval > 3M
        sRet.type = 'min';
        sRet.value = 5;
    } else if (sCalc > 60) {
        // interval > 1M
        sRet.type = 'min';
        sRet.value = Math.ceil(sCalc / 60);
    } else if (sCalc > 30) {
        // interval > 30S
        sRet.type = 'min';
        sRet.value = 1;
    } else if (sCalc > 20) {
        // interval > 20S
        sRet.type = 'sec';
        sRet.value = 30;
    } else if (sCalc > 15) {
        // interval > 15S
        sRet.type = 'sec';
        sRet.value = 20;
    } else if (sCalc > 10) {
        // interval > 10S
        sRet.type = 'sec';
        sRet.value = 15;
    } else if (sCalc > 5) {
        // interval > 5S
        sRet.type = 'sec';
        sRet.value = 10;
    } else if (sCalc > 3) {
        // interval > 3S
        sRet.type = 'sec';
        sRet.value = 5;
    } else {
        sRet.type = 'sec';
        sRet.value = Math.ceil(sCalc);
    }
    if (sRet.value < 1) {
        sRet.value = 1;
    }
    return {
        IntervalType: sRet.type,
        IntervalValue: sRet.value,
    };
};

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

export const isStringTypeColumn = (aType: number) => {
    const colType = TABLE_COLUMN_TYPE.find((item) => item.key === aType);
    if (colType && DB_STRING_TYPE.some((item) => item === colType.value)) return true;
    else return false;
};

export const createGaugeQuery = (aInfo: any, aStart: number, aEnd: number) => {
    const selectQuery = 'SELECT trunc(' + aInfo.aggregator + '(VALUE), 2)';
    const fromQuery = 'FROM ' + aInfo.userName + '.' + aInfo.table;
    const whereTimeQuery = 'WHERE TIME between ' + aStart + '000000' + ' and ' + aEnd + '000000';
    const andNameQuery = `AND NAME = '${aInfo.tag}'`;

    return selectQuery + ' ' + fromQuery + ' ' + whereTimeQuery + ' ' + andNameQuery;
};

export const createPieQuery = (aInfo: any, aStart: number, aEnd: number) => {
    const selectQuery = 'SELECT NAME, ' + aInfo.aggregator + '(VALUE)';
    const fromQuery = 'FROM ' + aInfo.userName + '.' + aInfo.table;
    const whereTimeQuery = 'WHERE TIME between ' + aStart + '000000' + ' and ' + aEnd + '000000';
    let andNameQuery = `AND NAME = '${aInfo.tag}'`;
    const groupByQuery = 'GROUP BY NAME';

    if (aInfo.useCustom) {
        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });
                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        andNameQuery = ' AND ' + sFilterList.join(' AND ');
    }

    return selectQuery + ' ' + fromQuery + ' ' + whereTimeQuery + ' ' + andNameQuery + ' ' + groupByQuery;
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
