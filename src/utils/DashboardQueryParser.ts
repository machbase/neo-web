import { isRollup } from '.';

interface BlockTimeType {
    interval: {
        IntervalType: string;
        IntervalValue: number;
    };
    start: any;
    end: any;
}

/** Dashboard QUERY PARSER */
export const DashboardQueryParser = async (aBlockList: any, aRollupList: any, aTime: BlockTimeType) => {
    const sQueryBlock = BlockParser(aBlockList, aRollupList, aTime);
    const sParsedQueryList = QueryParser(sQueryBlock, aTime);
    return sParsedQueryList;
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
    return aValueList.filter((aValue: any) => aValue.value !== '');
};
/** Create value list for collapsed block
 * @return ({ value: value, alias: '', aggregator: "aggregator"})
 */
const GetValues = (aTable: any) => {
    return [
        {
            id: aTable.id,
            alias: '',
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

const GetTimeColumn = (aTable: any, aInterval: { IntervalType: string; IntervalValue: number }) => {
    if (aTable.useRollup) return `TIME ROLLUP ${aInterval.IntervalValue} ${aInterval.IntervalType}`;
    else {
        let sTime: any = 1;
        if (aInterval.IntervalType === 'day') sTime = 60 * 60 * 24;
        else if (aInterval.IntervalType === 'hour') sTime = 60 * 60;
        else if (aInterval.IntervalType === 'min') sTime = 60;
        else sTime = 1;
        return `${aTable.time} / (${aInterval.IntervalValue} * ${sTime} * 1000000) * (${aInterval.IntervalValue} * ${sTime} * 1000000)`;
    }
};

const GetTimeWhere = (aTimeType: string, aTime: any): string => {
    return `${aTimeType} BETWEEN ${aTime.start}000000 AND ${aTime.end}000000`;
};

const GetFilterWhere = (aFilterList: any) => {
    if (aFilterList.length === 0) return '';
    const sParsedFilter: any = {};
    aFilterList.map((aFilter: any) => {
        if (sParsedFilter[aFilter.column + aFilter.operator]) {
            sParsedFilter[aFilter.column + aFilter.operator] = {
                ...sParsedFilter[aFilter.column + aFilter.operator],
                valueList: [...sParsedFilter[aFilter.column + aFilter.operator].valueList, aFilter.value],
            };
        } else sParsedFilter[aFilter.column + aFilter.operator] = { ...aFilter, valueList: [aFilter.value] };
    });
    const sParsedFilterList = Object.keys(sParsedFilter).map((aKey: string) => {
        return sParsedFilter[aKey];
    });
    const sResult = sParsedFilterList.map((aFilter: any) => {
        if (aFilter.operator === 'in') return `${aFilter.column} ${aFilter.operator} ('${aFilter.valueList.join("','")}')`;
        else {
            return aFilter.valueList
                .map((aValue: any) => {
                    return `${aFilter.column} ${aFilter.operator} ${aValue}`;
                })
                .join(' AND ');
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
    else return `${aValue.value}-${aValue.aggregator}`;
};

const QueryParser = (sQueryBlock: any, aTime: { interval: any; start: any; end: any }) => {
    const sResultQuery = sQueryBlock.map((aQuery: any, aIdx: number) => {
        const sTimeColumn = GetTimeColumn(aQuery, aTime.interval);
        const sValueColumn = GetValueColumn(aQuery.valueList)[0];
        const sTimeWhere = GetTimeWhere(aQuery.time, aTime);
        const sFilterWhere = GetFilterWhere(aQuery.filterList);
        const sGroupBy = `GROUP BY TIME ${UseGroupByTime(aQuery.valueList)}`;
        const sOrderBy = 'ORDER BY TIME';
        const sAlias = GetAlias(aQuery.valueList[0]);
        return {
            sql: `SELECT TO_TIMESTAMP(TIME) / 1000000 as TIME, VALUE * 1.0 as VALUE FROM (SELECT ${sTimeColumn} as TIME, ${sValueColumn} FROM ${aQuery.userName}.${
                aQuery.tableName
            } WHERE ${sTimeWhere} ${sFilterWhere !== '' ? 'AND ' + sFilterWhere : ''} ${sGroupBy}) ${sOrderBy}`,
            color: aQuery.color,
            alias: sAlias,
            idx: aIdx,
        };
    });

    return sResultQuery;
};
