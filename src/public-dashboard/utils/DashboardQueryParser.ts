import moment from 'moment';
import { isRollup, isRollupExt } from '.';
import { ADMIN_ID } from './constants';
import { VARIABLE_REGEX } from './CheckDataCompatibility';
import { DEFAULT_VARIABLE_LIST, VARIABLE_TYPE } from '../components/variable';
import { ChartType, E_CHART_TYPE } from '../type/eChart';
import TQL from './TqlGenerator';
import { DSH_CACHE_TIME, DSH_CHART_VALUE_VALUE_SCRIPT_MODULE } from './TqlGenerator/constants';
import { TransformBlockType } from '../type/transform';
import { getChartSeriesName } from './dashboardUtil';
import { ChartDataType, CheckAllowedTransformChartType, E_BLOCK_TYPE, TRX_PARSER } from './Chart/TransformDataParser';
import { isFirstOrLastAggregator, isValueOrNoneAggregator, isCountAllAggregator, getAggregatorSqlFunction, getDiffSqlFunction } from './aggregatorConstants';
import { FakeSrc } from './TQL/TqlQueryHelper';

interface BlockTimeType {
    interval: {
        IntervalType: string;
        IntervalValue: number;
    };
    start: any;
    end: any;
}

/** Return sql response data type */
export const SqlResDataType = (aChartType: string): ChartDataType => {
    let sResDataType: ChartDataType = 'TIME_VALUE';
    switch (aChartType) {
        case 'bar':
        case 'line':
        case 'scatter':
            return (sResDataType = 'TIME_VALUE');
        case 'pie':
        case 'gauge':
        case 'liquidFill':
            return (sResDataType = 'NAME_VALUE');
    }
    return sResDataType;
};
const timeConverter = (aTime: string | number, aReturnTypeString: boolean) => {
    if (aReturnTypeString) {
        const sTmpTime = new Date(aTime);
        return moment(sTmpTime).format('YYYY-MM-DD HH:mm:ss');
    } else return Math.floor((aTime as number) / 1000);
};
const variableValueConverter = (aValue: string, aTime: BlockTimeType) => {
    switch (aValue) {
        case '{{from_str}}':
            return timeConverter(aTime.start, true);
        case '{{from_s}}':
            return timeConverter(aTime.start, false);
        case '{{from_ms}}':
            return (timeConverter(aTime.start, false) as number) * 1000;
        case '{{from_us}}':
            return (timeConverter(aTime.start, false) as number) * 1000000;
        case '{{from_ns}}':
            return (timeConverter(aTime.start, false) as number) * 1000000000;
        case '{{to_str}}':
            return timeConverter(aTime.end, true);
        case '{{to_s}}':
            return timeConverter(aTime.end, false);
        case '{{to_ms}}':
            return (timeConverter(aTime.end, false) as number) * 1000;
        case '{{to_us}}':
            return (timeConverter(aTime.end, false) as number) * 1000000;
        case '{{to_ns}}':
            return (timeConverter(aTime.end, false) as number) * 1000000000;
        case '{{period}}':
            return aTime.interval.IntervalValue + aTime.interval.IntervalType[0];
        case '{{period_unit}}':
            return aTime.interval.IntervalType;
        case '{{period_value}}':
            return aTime.interval.IntervalValue;
        default:
            return aValue;
    }
};
export const VariableParser = (aVariables: VARIABLE_TYPE[], aTime: BlockTimeType) => {
    const defineVar = aVariables?.map((variable: any) => {
        return { key: variable.key, value: variable.use.value, regEx: new RegExp(variable.key, 'g') };
    });
    const defaultVar = DEFAULT_VARIABLE_LIST.map((defVar) => {
        return { key: defVar.key, value: variableValueConverter(defVar.key, aTime), regEx: new RegExp(defVar.key, 'g') };
    });
    return defineVar.concat(defaultVar);
};
export const VariableParserForTql = (aVariables: VARIABLE_TYPE[]) => {
    const defineVar = aVariables?.map((variable: any) => {
        return { key: variable.key, value: variable.use.value, regEx: new RegExp(variable.key, 'g') };
    });
    return defineVar;
};


/** Dashboard QUERY PARSER */
export const DashboardQueryParser = (
    aChartType: string,
    aDataType: ChartDataType,
    aBlockList: any,
    aTransformBlockList: TransformBlockType[],
    aRollupList: any,
    aXaxis: any,
    aTime: BlockTimeType,
    aUniqueId?: string,
    aIsSave: boolean = false
) => {
    const sQueryBlock = BlockParser(aBlockList, aRollupList, aTime);

    const [sParsedQueryList, sAliasList, sInjectionSrc] = QueryParser(
        sQueryBlock,
        aTransformBlockList,
        aTime,
        aDataType,
        aChartType as ChartType,
        aXaxis,
        aIsSave,
        aUniqueId,
        aRollupList
    );
    
    return [sParsedQueryList, sAliasList, sInjectionSrc];
};
/** Combine table and user */
const CombineTableUser = (table: string, customTable: boolean = false) => {
    // Typing table
    if (customTable) return table;
    // Variable
    if (table.match(VARIABLE_REGEX)) return table;
    // Admin
    if (table.split('.').length === 1) return `${ADMIN_ID.toUpperCase()}.${table}`;
    else return table;
};
/** Block Parser */
const BlockParser = (aBlockList: any, aRollupList: any, aTime: BlockTimeType) => {
    // opt funnel
    const sBlockFunnelList = JSON.parse(JSON.stringify(aBlockList)).map((aBlock: any) => {
        return {
            ...aBlock,
            filter: aBlock.useCustom ? UseFilter(aBlock.filter) : GetFilter(aBlock),
            values: aBlock.useCustom ? UseValue(aBlock.values) : GetValues(aBlock),
        };
    });
    // parse block
    const sParsedBlock = sBlockFunnelList.map((bBlock: any) => {
        if (bBlock.customFullTyping.use) {
            return {
                text: bBlock.customFullTyping.text,
                useFullTyping: bBlock.customFullTyping.use,
                color: bBlock.color,
                isVisible: bBlock.isVisible,
            };
        }
        return {
            time: bBlock.time,
            type: bBlock.type,
            userName: bBlock.userName,
            tableName: CombineTableUser(bBlock.table, bBlock?.customTable),
            filterList: bBlock.filter,
            valueList: bBlock.values,
            useRollup: isRollup(aRollupList, bBlock.table, getInterval(aTime.interval.IntervalType, aTime.interval.IntervalValue), bBlock.values[0]?.value),
            useCustom: bBlock.useCustom,
            color: bBlock.color,
            tableInfo: bBlock.tableInfo,
            math: bBlock?.math ?? '',
            duration: bBlock?.duration ?? { from: '', to: '' },
            useFullTyping: bBlock.customFullTyping.use,
            isVisible: bBlock.isVisible,
            name: bBlock.customFullTyping.use
                ? 'custom'
                : getChartSeriesName({
                      alias: bBlock?.useCustom ? bBlock?.values[0]?.alias : bBlock?.alias,
                      table: bBlock?.table,
                      column: bBlock?.useCustom ? bBlock?.values[0]?.value : bBlock?.value,
                      aggregator: bBlock?.useCustom ? bBlock?.values[0]?.aggregator : bBlock?.aggregator,
                  }),
        };
    });
    return sParsedBlock;
};
export const getInterval = (aType: string, aValue: number) => {
    switch (aType) {
        case 'sec':
            return aValue * 1000;
        case 'min':
            return aValue * 60 * 1000;
        case 'hour':
            return aValue * 60 * 60 * 1000;
        case 'day':
            return aValue * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
};
/** @return use filterList */
const UseFilter = (aFilterList: any) => {
    return aFilterList.filter((aFilter: any) => aFilter.useFilter || aFilter.useTyping);
};
/** @return use valueList */
const UseValue = (aValueList: any) => {
    return aValueList.filter((aValue: any) => {
        if (!aValue?.diff || aValue?.diff === '') aValue.diff = 'none';
        if (aValue.value !== '' || aValue.aggregator === 'count(*)') return aValue;
    });
};
/** Create value list for collapsed block
 * @return ({ value: value, alias: '', aggregator: "aggregator"})
 */
const GetValues = (aTable: any) => {
    return [
        {
            id: aTable.id,
            alias: `${
                aTable.alias !== '' ? aTable.alias : aTable.aggregator !== 'value' && aTable.aggregator !== 'none' ? aTable.tag + '(' + aTable.aggregator + ')' : aTable.tag
            }`,
            value: aTable.value,
            diff: aTable.diff,
            aggregator: aTable.aggregator,
        },
    ];
};
/** Create filter list for collapsed block
 * @return (filter {column: name, operator: in, name: "tag"})
 */
const GetFilter = (aTableInfo: any) => {
    if (aTableInfo.tag !== '') return [{ ...aTableInfo.filter[0], column: aTableInfo.name, operator: 'in', value: aTableInfo.tag }];
    else return [];
};

const GetValueColumn = (aDiff: boolean, aValueList: any, aTableType: 'tag' | 'log', aTableInfo: any) => {
    return aValueList.map((aValue: any, aIdx: number) => {
        const sValue = `VALUE${aIdx > 0 ? aIdx + 1 : ''}`;
        if (isValueOrNoneAggregator(aValue.aggregator) || aDiff) return `${aValue.value} as ${sValue}`;
        else {
            if (isFirstOrLastAggregator(aValue.aggregator))
                return `${changeAggText(aValue.aggregator)}(${aTableType === 'tag' ? aTableInfo[1][0] : '_ARRIVAL_TIME'} ,${aValue.value}) as ${sValue}`;
            else return `${changeAggText(aValue.aggregator)}(${aValue.value}) as ${sValue}`;
        }
    });
};

const GetTimeColumn = (aUseAgg: boolean, aTable: any, aInterval: { IntervalType: string; IntervalValue: number }, aAggregator: string, aRollupList: any) => {
    if (!aUseAgg) return aTable.time;
    if (aTable.useRollup) {
        if (isFirstOrLastAggregator(changeAggText(aAggregator))) {
            const sIsExtRollup = isRollupExt(aRollupList, aTable.tableName, getInterval(aInterval.IntervalType, aInterval.IntervalValue));
            if (sIsExtRollup) {
                if (aInterval.IntervalType === 'day' && aInterval.IntervalValue > 1) return `${aTable.time} ROLLUP 1 day`;
                else return `${aTable.time} ROLLUP ${aInterval.IntervalValue} ${aInterval.IntervalType}`;
            } else {
                if (aInterval.IntervalType === 'day' && aInterval.IntervalValue > 1) return `DATE_TRUNC('day', ${aTable.time}, 1)`;
                else return `DATE_TRUNC('${aInterval.IntervalType}', ${aTable.time}, ${aInterval.IntervalValue})`;
            }
        } else {
            if (aInterval.IntervalType === 'day' && aInterval.IntervalValue > 1) return `${aTable.time} ROLLUP 1 day`;
            else return `${aTable.time} ROLLUP ${aInterval.IntervalValue} ${aInterval.IntervalType}`;
        }
    } else {
        if (aInterval.IntervalType === 'day' && aInterval.IntervalValue > 1) return `DATE_TRUNC('day', ${aTable.time}, 1)`;
        else return `DATE_TRUNC('${aInterval.IntervalType}', ${aTable.time}, ${aInterval.IntervalValue})`;
    }
};

const GetTimeWhere = (aTimeType: string, aTime: any): string => {
    return `${aTimeType} BETWEEN ${aTime.start}000000 AND ${aTime.end}000000`;
};

const GetFilterWhere = (aFilterList: any, aUseCustom: boolean, aQuery: any) => {
    if (aFilterList.length === 0) return '';
    const sParsedFilter: any = {};
    aFilterList.map((aFilter: any) => {
        if (aFilter.useTyping && aUseCustom) {
            if (!sParsedFilter[aFilter.typingValue]) sParsedFilter[aFilter.typingValue] = { ...aFilter, valueList: [aFilter.typingValue] };
        } else {
            if (sParsedFilter[aFilter.column + aFilter.operator]) {
                sParsedFilter[aFilter.column + aFilter.operator] = {
                    ...sParsedFilter[aFilter.column + aFilter.operator],
                    valueList: [...sParsedFilter[aFilter.column + aFilter.operator].valueList, aFilter.value],
                };
            } else sParsedFilter[aFilter.column + aFilter.operator] = { ...aFilter, valueList: [aFilter.value] };
        }
    });
    const sParsedFilterList = Object.keys(sParsedFilter).map((aKey: string) => {
        return sParsedFilter[aKey];
    });
    const sResult = sParsedFilterList
        .map((aFilter: any) => {
            const sUseInOperator = aFilter.operator === 'in';
            // Check varchar type
            const sTargetColumnInfo = aQuery.tableInfo && aQuery.tableInfo.find((aTable: any) => aTable[0] === aFilter.column);
            const sUseQuote = sTargetColumnInfo ? (sTargetColumnInfo[1] === 5 ? "'" : '') : '';
            // Expand mode
            if (aUseCustom) {
                if (aFilter.useTyping) return aFilter.typingValue.replaceAll('"', "'");
                else {
                    if (sUseInOperator) {
                        const sParseValueList = aFilter.valueList.map((pValue: any) => {
                            if (pValue.includes(',')) return pValue.split(',');
                            else return pValue;
                        });
                        return `${aFilter.column} ${aFilter.operator} ('${sParseValueList.flat().join("','")}')`;
                    } else
                        return aFilter.valueList
                            .map((aValue: any) => {
                                return `${aFilter.column} ${aFilter.operator} ${sUseQuote ? `'${aValue}'` : aValue}`;
                            })
                            .join(' AND ');
                }
            }
            // Collapse mode
            else return `${aFilter.column} ${aFilter.operator} ('${aFilter.valueList.join("','")}')`;
        })
        .filter((bFilter: any) => bFilter.trim() !== '');
    return sResult.join(' AND ');
};
const UseGroupByTime = (aValueList: any) => {
    const sUseGroupBy = aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || !isValueOrNoneAggregator(aValue.aggregator) ? true : false;
    }, false);
    if (sUseGroupBy) return '';
    else return ', VALUE';
};
const GetAlias = (aValue: any) => {
    if (!aValue) return;
    if (aValue?.alias && aValue?.alias !== '') return aValue.alias;
    else return `${aValue.value}${aValue.aggregator !== 'value' && aValue.aggregator !== 'none' ? '(' + aValue.aggregator + ')' : ''}`;
};
const UseCountAll = (aValueList: any) => {
    const sUseCountAll = aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || isCountAllAggregator(aValue.aggregator) ? true : false;
    }, false);
    return sUseCountAll;
};
const changeDiffText = (aDiff: string) => {
    return getDiffSqlFunction(aDiff);
};
const changeAggText = (agg: string) => {
    return getAggregatorSqlFunction(agg);
};

export const mathValueConverter = (aTargetValueIndex: string, aMath: string): string => {
    // check pattern => value(1), value (1), value(0), value (0)
    const pattern3 = /(value)(?:\s)*\((\s)*[0-9](\s)*\)?/gi;
    if (pattern3.test(aMath)) return aMath.replace(pattern3, `value(${aTargetValueIndex}) `);
    // check pattern => value1 value 1
    const pattern4 = /(value)(?:\s)*[0-9]*[0-9]/gi;
    if (pattern4.test(aMath)) return aMath.replace(pattern4, `value(${aTargetValueIndex}) `);
    // check pattern => value\s, value, valuetest...
    const pattern5 = /(value)(?:\s)*(?![a-zAZ])/gi;
    if (pattern5.test(aMath)) return aMath.replace(pattern5, `value(${aTargetValueIndex}) `);
    return aMath;
};
const convertUnit = (unit: any) => {
    return -moment(0).subtract(1, unit).unix() * 1000;
};

const GetDuration = (baseTime: any, aTime: string) => {
    // Default unit sec
    const sUnit = aTime.match(/[a-zA-Z]/g)?.join('') ?? 's';
    // Get number
    const sNumber = Number(aTime.replace(sUnit, ''));
    // Abs number
    const sAbsNumber = Math.abs(sNumber);
    // Check sign (positive negative)
    const sSign = Math.sign(sNumber) >= 0 ? '' : '-';
    const sConvertedUnit = convertUnit(sUnit);
    return baseTime + Number(sSign + sAbsNumber * sConvertedUnit);
};
const GetConbineWhere = (
    aResDataType: ChartDataType,
    aQuery: any,
    aTime: { interval: any; start: any; end: any },
    sTimeWhere: string,
    sFilterWhere: string,
    sGroupBy: string,
    sOrderBy: string,
    sUseAgg: boolean,
    sUseCountAll: boolean,
    sIsVirtualTable: boolean
) => {
    let sReturnWhere: string = '';
    // Use Duration
    if (
        (aQuery.type.toLowerCase() === 'log' && aQuery.time.toUpperCase() === '_ARRIVAL_TIME') ||
        (aQuery.type.toLowerCase() === 'log' && aQuery.time.toUpperCase() !== '_ARRIVAL_TIME' && (aQuery?.duration?.from !== '' || aQuery?.duration?.to !== ''))
    ) {
        // Check _arrival_time
        if (aQuery.time.toUpperCase() === '_ARRIVAL_TIME') {
            const sDuration = `DURATION FROM FROM_TIMESTAMP(${aTime.start}000000) TO FROM_TIMESTAMP(${aTime.end}000000)`;
            // BAR | LINE | SCATTER
            if (aResDataType === 'TIME_VALUE')
                sReturnWhere = `${sFilterWhere !== '' ? 'WHERE ' + sFilterWhere : ''} ${sDuration} ${sUseAgg ? (sUseCountAll ? 'GROUP BY TIME' : sGroupBy) : ''} ${sOrderBy}`;
            // PIE | GAUGE | LIQUIDFILL
            if (aResDataType === 'NAME_VALUE') sReturnWhere = `${sFilterWhere !== '' ? 'WHERE ' + sFilterWhere : ''} ${sDuration}`;
        }
        // Custom time column
        else {
            const sFromTime = aQuery?.duration?.from ? GetDuration(aTime.start, aQuery?.duration?.from) : aTime.start;
            const sToTime = aQuery?.duration?.to ? GetDuration(aTime.end, aQuery?.duration?.to) : aTime.end;
            const sDuration = `DURATION FROM FROM_TIMESTAMP(${sFromTime}000000) TO FROM_TIMESTAMP(${sToTime}000000)`;
            // BAR | LINE | SCATTER
            if (aResDataType === 'TIME_VALUE')
                sReturnWhere = `WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''} ${sDuration} ${
                    sUseAgg ? (sUseCountAll ? 'GROUP BY TIME' : sGroupBy) : ''
                } ${sOrderBy}`;
            // PIE | GAUGE | LIQUIDFILL
            if (aResDataType === 'NAME_VALUE') sReturnWhere = `WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''} ${sDuration}`;
        }
    } else {
        // BAR | LINE | SCATTER
        if (aResDataType === 'TIME_VALUE')
            sReturnWhere = `WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''} ${sUseAgg ? (sUseCountAll ? 'GROUP BY TIME' : sGroupBy) : ''} ${sOrderBy}`;
        // PIE | GAUGE | LIQUIDFILL
        if (aResDataType === 'NAME_VALUE') {
            if (sIsVirtualTable) sReturnWhere = `${sFilterWhere !== '' ? 'WHERE ' + sFilterWhere : ''}`;
            else sReturnWhere = `WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''}`;
        }
    }
    return sReturnWhere;
};

const QueryParser = (
    aQueryBlock: any,
    aTransformBlockList: TransformBlockType[],
    aTime: { interval: any; start: any; end: any },
    aResDataType: ChartDataType,
    aChartType: ChartType,
    aXaxis: any,
    aIsSave: boolean,
    aUniqueId?: string,
    aRollupList?: any
) => {
    let sInjectionSrc = FakeSrc;
    let sAliasList: any[] = [];
    let sResultQuery = aQueryBlock.map((aQuery: any, aIdx: number) => {
        if (aQuery.useFullTyping) {
            sAliasList.push({ name: 'series(' + aIdx.toString() + ')', color: aQuery.color, useQuery: aQuery.isVisible, type: E_BLOCK_TYPE.STD });
            return { query: `SQL("${aQuery.text}")\nJSON()`, alias: '', idx: aIdx, dataType: aResDataType, sql: aQuery.text, useQuery: aQuery.isVisible };
        }
        const sUseDiff: boolean = aQuery.valueList[0]?.diff !== 'none';
        const sUseAgg: boolean = aQuery.valueList[0]?.aggregator !== 'value' && aQuery.valueList[0]?.aggregator !== 'none' && !sUseDiff;
        const sTimeColumn = GetTimeColumn(sUseAgg, aQuery, aTime.interval, aQuery.valueList[0]?.aggregator, aRollupList);
        const sValueColumn = GetValueColumn(sUseDiff, aQuery.valueList, aQuery.type, aQuery.tableInfo);
        const sTimeWhere = GetTimeWhere(aQuery.time, aTime);
        const sFilterWhere = GetFilterWhere(aQuery.filterList, aQuery.useCustom, aQuery);
        const sGroupBy = `GROUP BY TIME ${UseGroupByTime(aQuery.valueList)}`;
        const sOrderBy = 'ORDER BY TIME';
        const sAlias = GetAlias(aQuery.valueList[0]);
        const sUseCountAll = UseCountAll(aQuery.valueList);
        const sIsVirtualTable = aQuery.tableName.includes('V$');
        const sConbineWhere = GetConbineWhere(aResDataType, aQuery, aTime, sTimeWhere, sFilterWhere, sGroupBy, sOrderBy, sUseAgg, sUseCountAll, sIsVirtualTable);
        let sSql: string = '';
        let sTql: string = '';

        // Set alias & color (tag)
        sAliasList.push({
            name: sAlias,
            color: aQuery.color,
            useQuery: aQuery.isVisible,
            type: E_BLOCK_TYPE.STD,
        });
        // BAR | LINE | SCATTER
        if (aResDataType === 'TIME_VALUE') {
            sSql = `SELECT TO_TIMESTAMP(${sTimeColumn}) / 1000000 as TIME, ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.tableName} ${sConbineWhere}`;
            if (sUseDiff) sTql += `MAP_${changeDiffText(aQuery.valueList[0]?.diff)}(1, value(1))`;
            if (aQuery?.math && aQuery?.math !== '') sTql += `${sUseDiff ? `\n` : ''}MAPVALUE(2, ${mathValueConverter('1', aQuery?.math)}, "VALUE")\nPOPVALUE(1)\n`;
        }
        // PIE | GAUGE | LIQUIDFILL
        if (aResDataType === 'NAME_VALUE') {
            if (sIsVirtualTable) {
                const sTable = aQuery.tableName.split('.').length > 1 ? aQuery.tableName : ADMIN_ID + '.' + aQuery.tableName;
                sSql = `SELECT ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${sTable} ${sConbineWhere}`;
            } else {
                sSql = `SELECT ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.tableName} ${sConbineWhere}`;
            }

            if (aQuery?.math && aQuery?.math !== '') sTql += `MAPVALUE(1, ${mathValueConverter('0', aQuery?.math)}, "VALUE")\nPOPVALUE(0)\n`;
            sTql += `MAPVALUE(1, dict("name", "${sAlias}", "value", value(0)))\nPOPVALUE(0)\n`;
        }
        return {
            query: `SQL("${sSql}")${sTql !== '' ? '\n' + sTql : ''}\n${TQL.SINK._JSON()}`,
            alias: sAlias,
            idx: aIdx,
            dataType: aResDataType,
            sql: sSql,
            tql: sTql,
            name: aQuery.name,
            useQuery: aQuery.isVisible,
        };
    });
    let sV_V_X_AXIS: undefined | string = undefined;
    if (aChartType === E_CHART_TYPE.ADV_SCATTER) {
        const sBaseXAxis = sResultQuery[aXaxis[0]?.useBlockList[0]];
        sV_V_X_AXIS = TQL.MAP.SCRIPT.RequestDoQuick(
            JSON.stringify('SQL("' + sBaseXAxis.sql + '")\n' + TQL.SINK._JSON(!aIsSave ? TQL.SINK._JSON.Cache(aUniqueId ?? 'UNIQUE_ID', DSH_CACHE_TIME) : '')),
            { isSave: aIsSave }
        );
        const sInjectionScript = TQL.MAP.SCRIPT('JS', {
            main: DSH_CHART_VALUE_VALUE_SCRIPT_MODULE.MAIN,
            init: `${DSH_CHART_VALUE_VALUE_SCRIPT_MODULE.INIT}${sV_V_X_AXIS}`,
        });
        if (aQueryBlock.length > 1) sInjectionSrc += '\n' + TQL.MAP.SCRIPT('JS', { main: sV_V_X_AXIS });
        sResultQuery = sResultQuery.map((item: any) => {
            return { ...item, query: `SQL("${item.sql}")${item.tql !== '' ? '\n' + item.tql : ''}\n${sInjectionScript}\n${TQL.SINK._JSON()}` };
        });
    }
    if (aTransformBlockList && aTransformBlockList.length > 0 && CheckAllowedTransformChartType(aChartType)) {
        const [sParsedAliasList, sParsedTrxList] = TRX_PARSER(aChartType, aResDataType, aTransformBlockList, sResultQuery, sV_V_X_AXIS, aIsSave);
        sAliasList = sAliasList.concat(sParsedAliasList);
        sResultQuery = sResultQuery.concat(sParsedTrxList);
    }

    return [sResultQuery, sAliasList, sInjectionSrc];
};
