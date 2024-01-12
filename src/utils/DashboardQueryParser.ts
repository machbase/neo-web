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
    console.log('aBlockList', aBlockList);
    const sQueryBlock = BlockParser(aBlockList, aRollupList, aTime);
    const sTagList = GetColumnList(sQueryBlock);
    const sParsedQueryList = QueryParser(sQueryBlock, aTime);
    // TO_TIMESTAMP() / 1000000.0
    const sResultQuery = `SELECT * FROM (\n` + `${sParsedQueryList.join('UNION ALL ')}\n` + `) ORDER BY TIME`;
    return [sResultQuery, sTagList];
};
/** Block Parser */
const BlockParser = (aBlockList: any, aRollupList: any, aTime: BlockTimeType) => {
    const sParsedBlockList = JSON.parse(JSON.stringify(aBlockList)).map((aBlock: any) => {
        return {
            ...aBlock,
            filter: aBlock.useCustom ? UseFilter(aBlock.filter) : GetFilter(aBlock),
            values: aBlock.useCustom ? UseValue(aBlock.values) : GetValues(aBlock),
        };
    });
    const sBlockGroupList = GetTableGroup(sParsedBlockList);
    const sQueryBlock = sBlockGroupList.map((aBlockGroup: any) => {
        return aBlockGroup.map((bBlock: any) => {
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
                blockIdx: bBlock.blockIdx,
            };
        });
    });
    return sQueryBlock;
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
/** Return Column list */
const GetColumnList = (aTableGroup: any) => {
    const sTagList = [] as string[];
    aTableGroup.map((aGroup: any) => {
        aGroup.map((aQuery: any) => {
            if (!aQuery.useCustom) sTagList.push('' + aQuery.tableName + '-' + aQuery.filterList[0].value + '(' + aQuery.valueList[0].aggregator + ')');
            if (aQuery.useCustom)
                aQuery.valueList.forEach((aValue: any) => {
                    if (aValue.alias !== '') sTagList.push(aValue.alias);
                    else sTagList.push('' + aQuery.tableName + '-' + aValue.value + '(' + aValue.aggregator + ')' + '-B' + aQuery.blockIdx);
                });
        });
    });
    return sTagList;
};
/** Table group
 * tag === filter {column: name, operator: in, name: "tag"}
 * aggregator === value { value: value, alias: '', aggregator: "aggregator"}
 * @return same group (table && value && filter)
 */
const GetTableGroup = (aTableList: any) => {
    const sResultTable: any = {};
    aTableList.map((aTable: any, aIdx: number) => {
        if (sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)]) {
            sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)] = [
                ...sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)],
                { ...aTable, blockIdx: aIdx + 1 },
            ];
        } else sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)] = [{ ...aTable, blockIdx: aIdx + 1 }];
    });
    return Object.keys(sResultTable).map((aKey: string) => {
        return sResultTable[aKey];
    });
};
/** @return valueId */
const GetValueId = (aValueList: any) => {
    return aValueList
        .map((aValue: any) => {
            return '' + aValue.value + aValue.aggregator + aValue.alias;
        })
        .sort()
        .join();
};
/** @return filterId */
const GetFilterId = (aFilterList: any) => {
    return aFilterList
        .map((aFilter: any) => {
            if (aFilter.operator === 'in' && aFilter.column === 'NAME') return '' + aFilter.column + aFilter.operator;
            else return '' + aFilter.column + aFilter.operator + aFilter.value;
        })
        .sort()
        .join();
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
/** @return Time */
const GetTime = (aTable: any, aInterval: { IntervalType: string; IntervalValue: number }, sUseAggregator: boolean): string => {
    if (aTable.useRollup && sUseAggregator) return `TIME ROLLUP ${aInterval.IntervalValue} ${aInterval.IntervalType}`;
    else {
        let sTime: any = 1;
        if (aInterval.IntervalType === 'day') sTime = 60 * 60 * 24;
        else if (aInterval.IntervalType === 'hour') sTime = 60 * 60;
        else if (aInterval.IntervalType === 'min') sTime = 60;
        else sTime = 1;
        return `${aTable.time} / (${aInterval.IntervalValue} * ${sTime} * 1000000000) * (${aInterval.IntervalValue} * ${sTime} * 1000000000)`;
    }
};

const GetGroupBy = (aUseAggregator: boolean): string => {
    if (aUseAggregator) return 'GROUP BY TIME, NAME';
    else return 'GROUP BY TIME, NAME' + ', VALUE ';
};

const GetColumns = (aQuery: any) => {
    // block 관계없이 파싱된 query 개수 기반
    // | mode | query | name in |
    // __________________________
    // | tag  |   1   |    o    | => pivot o => name time value1 value2...
    // | tag  |   1   |    x    | => name time value
    // | tag  |   2   |    o    | => mapvalue o => name time value1 value2 value3...
    // | tag  |   2   |    x    | => mapvalue o => name time value1 value2...
    // | log  |   2   |    x    | => name time value1 value2...

    // name time value....... =>

    const sColumnNameList: string[] = [];
    // console.log('aQuery filterList', aQuery.filterList);
    const sParsedColumnList = aQuery.valueList.map((aValue: any) => {
        if (aValue.alias && aValue.alias !== '') {
            sColumnNameList.push(aValue.alias);
            if (aValue.aggregator === 'none') return ` ${aValue.value} AS '${aValue.alias}'`;
            else return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS '${aValue.alias}'`;
        } else {
            sColumnNameList.push(aValue.value);
            if (aValue.aggregator === 'none') return ` ${aValue.value} AS ${aValue.value}`;
            else return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS ${aValue.value}`;
        }
    });
    return [sParsedColumnList, sColumnNameList];
};
const GetWhere = (aFilterList: any) => {
    const sFlatFilter = aFilterList
        .map((aFilter: any) => {
            return [...aFilter.filterList];
        })
        .flat(2);
    const sParsedFilter: any = {};
    sFlatFilter.map((aFilter: any) => {
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
    const sResult = sParsedFilterList.map((aQuery: any) => {
        return ` ${aQuery.column} ${aQuery.operator} ${
            aQuery.column === 'NAME' && aQuery.operator === 'in' ? `('${aQuery.valueList.join("','")}')` : aQuery.column === 'NAME' ? `'${aQuery.value}'` : aQuery.value
        }`;
    });
    return sResult.join(' AND');
};
const UseAggregator = (aValueList: any) => {
    return aValueList.reduce((preV: boolean, aValue: any) => {
        return preV || aValue.aggregator !== 'none' ? true : false;
    }, false);
};
const QueryParser = (sQueryBlock: any, aTime: { interval: any; start: any; end: any }) => {
    const sResultQuery = sQueryBlock.map((aQueryList: any) => {
        const sUseAggregator: boolean = UseAggregator(aQueryList[0].valueList);
        const [sParsedColumnList, sColumnNameList] = GetColumns(aQueryList[0]);
        const sTime: string = GetTime(aQueryList[0], aTime.interval, sUseAggregator);
        const sTable: string = aQueryList[0].userName + '.' + aQueryList[0].tableName;
        const sGroupBy: string = GetGroupBy(sUseAggregator);
        const sTimeType: string = aQueryList[0].time;
        const sWhere: any = GetWhere(aQueryList);

        // console.log('sColumnNameList', sColumnNameList);

        return `SELECT ${sTime} AS TIME, NAME,${sParsedColumnList} FROM ${sTable} WHERE ${sTimeType} BETWEEN ${aTime.start}000000 AND ${aTime.end}000000 ${
            sWhere ? 'AND' + sWhere : ''
        } ${sGroupBy} `;
    });

    // console.log(sResultQuery);

    return sResultQuery;
};
