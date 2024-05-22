import { isRollup } from '.';

interface BlockTimeType {
    interval: {
        IntervalType: string;
        IntervalValue: number;
    };
    start: any;
    end: any;
}

/** Return sql response data type */
export const SqlResDataType = (aChartType: string): string => {
    let sResDataType: string = 'TIME_VALUE';
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

/** Dashboard QUERY PARSER */
export const DashboardQueryParser = async (aChartType: string, aBlockList: any, aRollupList: any, aXaxis: any, aTime: BlockTimeType) => {
    const sResDataType = SqlResDataType(aChartType);
    const sTranspose = sResDataType === 'TIME_VALUE' && aXaxis[0].type === 'category';
    const sQueryBlock = BlockParser(aBlockList, aRollupList, aTime);
    const [sParsedQueryList, sAliasList] = QueryParser(sTranspose, sQueryBlock, aTime, sResDataType);
    return [sParsedQueryList, sAliasList];
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
        return {
            time: bBlock.time,
            type: bBlock.type,
            userName: bBlock.userName,
            tableName: bBlock.table,
            filterList: bBlock.filter,
            valueList: bBlock.values,
            useRollup: isRollup(aRollupList, bBlock.table, getInterval(aTime.interval.IntervalType, aTime.interval.IntervalValue)),
            useCustom: bBlock.useCustom,
            color: bBlock.color,
            tableInfo: bBlock.tableInfo,
            math: bBlock?.math ?? '',
        };
    });
    return sParsedBlock;
};
const getInterval = (aType: string, aValue: number) => {
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
    if (aTableInfo.tag !== '') return [{ ...aTableInfo.filter[0], column: 'NAME', operator: 'in', value: aTableInfo.tag }];
    else return [];
};

const GetValueColumn = (aDiff: boolean, aValueList: any, aTableType: 'tag' | 'log') => {
    return aValueList.map((aValue: any) => {
        if (aValue.aggregator === 'none' || aValue.aggregator === 'value' || aDiff) return `${aValue.value} as VALUE`;
        else {
            if (aValue.aggregator.includes('last') || aValue.aggregator.includes('first'))
                return `${changeAggText(aValue.aggregator)}(${aTableType === 'tag' ? 'TIME' : '_ARRIVAL_TIME'} ,${aValue.value}) as VALUE`;
            else return `${changeAggText(aValue.aggregator)}(${aValue.value}) as VALUE`;
        }
    });
};

const GetTimeColumn = (aUseAgg: boolean, aTable: any, aInterval: { IntervalType: string; IntervalValue: number }) => {
    if (!aUseAgg) return aTable.time;
    if (aTable.useRollup) {
        if (aInterval.IntervalType === 'day' && aInterval.IntervalValue > 1) return `TIME ROLLUP 1 day`;
        else return `TIME ROLLUP ${aInterval.IntervalValue} ${aInterval.IntervalType}`;
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
        return preV || (aValue.aggregator !== 'value' && aValue.aggregator !== 'none') ? true : false;
    }, false);
    if (sUseGroupBy) return '';
    else return ', VALUE';
};
const GetAlias = (aValue: any) => {
    if (aValue.alias && aValue.alias !== '') return aValue.alias;
    else return `${aValue.value}${aValue.aggregator !== 'value' && aValue.aggregator !== 'none' ? '(' + aValue.aggregator + ')' : ''}`;
};
const UseCountAll = (aValueList: any) => {
    const sUseCountAll = aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || aValue.aggregator === 'count(*)' ? true : false;
    }, false);
    return sUseCountAll;
};
const changeDiffText = (aDiff: string) => {
    switch (aDiff) {
        case 'diff':
            return 'DIFF';
        case 'diff (abs)':
            return 'ABSDIFF';
        case 'diff (no-negative)':
            return 'NONEGDIFF';
        default:
            return 'DIFF';
    }
};
const changeAggText = (agg: string) => {
    switch (agg) {
        case 'first value':
            return 'first';
        case 'last value':
            return 'last';
        case 'stddev (pop)':
            return 'stddev_pop';
        case 'variance (pop)':
            return 'var_pop';
        default:
            return agg;
    }
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

const QueryParser = (aTranspose: boolean, aQueryBlock: any, aTime: { interval: any; start: any; end: any }, aResDataType: string) => {
    const sAliasList: any[] = [];
    const sResultQuery = aQueryBlock.map((aQuery: any, aIdx: number) => {
        const sUseDiff: boolean = aQuery.valueList[0]?.diff !== 'none';
        const sUseAgg: boolean = aQuery.valueList[0]?.aggregator !== 'value' && aQuery.valueList[0]?.aggregator !== 'none' && !sUseDiff;
        const sTimeColumn = GetTimeColumn(sUseAgg, aQuery, aTime.interval);
        const sValueColumn = GetValueColumn(sUseDiff, aQuery.valueList, aQuery.type)[0];
        const sTimeWhere = GetTimeWhere(aQuery.time, aTime);
        const sFilterWhere = GetFilterWhere(aQuery.filterList, aQuery.useCustom, aQuery);
        const sGroupBy = `GROUP BY TIME ${UseGroupByTime(aQuery.valueList)}`;
        const sOrderBy = 'ORDER BY TIME';
        const sAlias = GetAlias(aQuery.valueList[0]);
        const sUseCountAll = UseCountAll(aQuery.valueList);
        const sIsVirtualTable = aQuery.tableName.includes('V$');
        let sSql: string = '';
        let sTql: string = '';

        sAliasList.push({ name: sAlias, color: aQuery.color });
        // BAR | LINE | SCATTER
        if (aResDataType === 'TIME_VALUE') {
            sSql = `SELECT TO_TIMESTAMP(${sTimeColumn}) / 1000000 as TIME, ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.tableName} WHERE ${sTimeWhere} ${
                sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''
            } ${sUseAgg ? (sUseCountAll ? 'GROUP BY TIME' : sGroupBy) : ''} ${sOrderBy}`;
            if (sUseDiff) sTql += `MAP_${changeDiffText(aQuery.valueList[0]?.diff)}(1, value(1))`;
            if (aQuery?.math && aQuery?.math !== '') sTql += `${sUseDiff ? `\n` : ''}MAPVALUE(2, ${mathValueConverter('1', aQuery?.math)}, "VALUE")\nPOPVALUE(1)`;
        }
        // PIE | GAUGE | LIQUIDFILL
        if (aResDataType === 'NAME_VALUE') {
            if (sIsVirtualTable) {
                sSql = `SELECT ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.tableName} ${sFilterWhere !== '' ? 'WHERE ' + sFilterWhere : ''}`;
            } else {
                sSql = `SELECT ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.tableName} WHERE ${sTimeWhere} ${
                    sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''
                }`;
            }
            if (aQuery?.math && aQuery?.math !== '') sTql += `MAPVALUE(1, ${mathValueConverter('0', aQuery?.math)}, "VALUE")\nPOPVALUE(0)\n`;
            sTql += `MAPVALUE(1, dict("name", "${sAlias}", "value", value(0)))\nPOPVALUE(0)`;
        }

        return {
            query: `SQL("${sSql}")${sTql !== '' ? '\n' + sTql : ''}\nJSON()`,
            alias: sAlias,
            idx: aIdx,
            dataType: aResDataType,
            sql: sSql,
        };
    });
    return [sResultQuery, sAliasList];
    aTranspose;
};
