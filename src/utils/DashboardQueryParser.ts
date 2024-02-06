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
export const DashboardQueryParser = async (aChartType: string, aBlockList: any, aRollupList: any, aTime: BlockTimeType) => {
    const sResDataType = SqlResDataType(aChartType);
    const sQueryBlock = BlockParser(aBlockList, aRollupList, aTime);
    const [sParsedQueryList, sAliasList] = QueryParser(sQueryBlock, aTime, sResDataType);
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
    return aFilterList.filter((aFilter: any) => aFilter.useFilter);
};
/** @return use valueList */
const UseValue = (aValueList: any) => {
    return aValueList.filter((aValue: any) => aValue.value !== '' || aValue.aggregator === 'count(*)');
};
/** Create value list for collapsed block
 * @return ({ value: value, alias: '', aggregator: "aggregator"})
 */
const GetValues = (aTable: any) => {
    return [
        {
            id: aTable.id,
            alias: `${aTable.alias !== '' ? aTable.alias : aTable.aggregator !== 'none' ? aTable.tag + '(' + aTable.aggregator + ')' : aTable.tag}`,
            value: aTable.value,
            aggregator: aTable.aggregator,
        },
    ];
};
/** Create filter list for collapsed block
 * @return (filter {column: name, operator: in, name: "tag"})
 */
const GetFilter = (aTableInfo: any) => {
    return [{ ...aTableInfo.filter[0], column: 'NAME', operator: 'in', value: aTableInfo.tag }];
};

const GetValueColumn = (aValueList: any) => {
    return aValueList.map((aValue: any) => {
        if (aValue.aggregator === 'none') return `${aValue.value} as VALUE`;
        else return `${aValue.aggregator}(${aValue.value}) as VALUE`;
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

const GetFilterWhere = (aFilterList: any, aUseCustom: boolean) => {
    if (aFilterList.length === 0) return '';
    const sParsedFilter: any = {};
    aFilterList.map((aFilter: any) => {
        if (aFilter.useTyping && aUseCustom) {
            if (!sParsedFilter[aFilter.value]) sParsedFilter[aFilter.value] = { ...aFilter, valueList: [aFilter.value] };
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
    const sResult = sParsedFilterList.map((aFilter: any) => {
        if (aFilter.useTyping && aUseCustom) {
            return aFilter.valueList[0].replaceAll('"', "'");
        } else {
            if (aFilter.operator === 'in') return `${aFilter.column} ${aFilter.operator} ('${aFilter.valueList.join("','")}')`;
            else {
                return aFilter.valueList
                    .map((aValue: any) => {
                        return `${aFilter.column} ${aFilter.operator} ${aValue}`;
                    })
                    .join(' AND ');
            }
        }
    });
    return sResult.join(' AND ');
};
const UseGroupByTime = (aValueList: any) => {
    const sUseGroupBy = aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || aValue.aggregator !== 'none' ? true : false;
    }, false);
    if (sUseGroupBy) return '';
    else return ', VALUE';
};
const GetAlias = (aValue: any) => {
    if (aValue.alias && aValue.alias !== '') return aValue.alias;
    else return `${aValue.value}${aValue.aggregator !== 'none' ? '(' + aValue.aggregator + ')' : ''}`;
};
const UseCountAll = (aValueList: any) => {
    const sUseCountAll = aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || aValue.aggregator === 'count(*)' ? true : false;
    }, false);
    return sUseCountAll;
};

const QueryParser = (aQueryBlock: any, aTime: { interval: any; start: any; end: any }, aResDataType: string) => {
    const sAliasList: any[] = [];
    const sResultQuery = aQueryBlock.map((aQuery: any, aIdx: number) => {
        const sUseAgg = aQuery.valueList[0].aggregator !== 'none';
        const sTimeColumn = GetTimeColumn(sUseAgg, aQuery, aTime.interval);
        const sValueColumn = GetValueColumn(aQuery.valueList)[0];
        const sTimeWhere = GetTimeWhere(aQuery.time, aTime);
        const sFilterWhere = GetFilterWhere(aQuery.filterList, aQuery.useCustom);
        const sGroupBy = `GROUP BY TIME ${UseGroupByTime(aQuery.valueList)}`;
        const sOrderBy = 'ORDER BY TIME';
        const sAlias = GetAlias(aQuery.valueList[0]);
        const sUseCountAll = UseCountAll(aQuery.valueList);
        let sSql: string = '';
        let sTql: string = '';

        sAliasList.push({ name: sAlias, color: aQuery.color });
        // BAR | LINE | SCATTER
        if (aResDataType === 'TIME_VALUE') {
            sSql = `SELECT TO_TIMESTAMP(${sTimeColumn}) / 1000000 as TIME, ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.userName}.${
                aQuery.tableName
            } WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''} ${sUseAgg ? (sUseCountAll ? 'GROUP BY TIME' : sGroupBy) : ''} ${
                sUseCountAll ? '' : sOrderBy
            }`;
        }
        // PIE | GAUGE | LIQUIDFILL
        if (aResDataType === 'NAME_VALUE') {
            sSql = `SELECT ${sUseCountAll ? 'count(*)' : `${sValueColumn}`} FROM ${aQuery.userName}.${aQuery.tableName} WHERE ${sTimeWhere} ${
                sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''
            }`;
            sTql = `MAPVALUE(1, dict("name", "${sAlias}", "value", value(0)))\nPOPVALUE(0)`;
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
};
