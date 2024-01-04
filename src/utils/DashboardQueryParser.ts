/** Dashboard QUERY PARSER */
export const DashboardQueryParser = async (aTableList: any, aTime: { interval: any; start: any; end: any }) => {
    const sTmpTableList = JSON.parse(JSON.stringify(aTableList)).map((aTable: any) => {
        return { ...aTable, filter: UseFilter(aTable.filter) };
    });
    const sTableGroupList = GetTableGroup(sTmpTableList);
    const sQueryGroup = sTableGroupList.map((aTableGroup: any) => {
        return aTableGroup.map((aTable: any) => {
            return {
                time: aTable.time,
                type: aTable.type,
                userName: aTable.userName,
                tableName: aTable.table,
                filter: aTable.useCustom ? aTable.filter : GetFilter(aTable.filter, aTable.tag),
                values: aTable.useCustom ? aTable.values : GetValues(aTable),
            };
        });
    });
    const sParsedQueryList = GetParsedQuery(sQueryGroup, aTime);
    const sResultQuery = `SELECT * FROM (\n` + `${sParsedQueryList.join(' UNION ALL ')}\n` + `) ORDER BY TIME, NAME`;
    return sResultQuery;
};

/** 동일한 table, value, filter 반환 */
const GetTableGroup = (aTableList: any) => {
    const sResultTable: any = {};
    aTableList.map((aTable: any) => {
        if (sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)]) {
            sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)] = [
                ...sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)],
                aTable,
            ];
        } else sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter) + GetValueId(aTable.values)] = [aTable];
    });
    return Object.keys(sResultTable).map((aKey: string) => {
        return sResultTable[aKey];
    });
};
/** 동일한 value 사용 검사를 위한 method */
const GetValueId = (aValueList: any) => {
    return aValueList
        .map((aValue: any) => {
            return '' + aValue.value + aValue.aggregator + aValue.alias;
        })
        .sort()
        .join();
};
/** 동일한 filter 사용 검사를 위한 method */
const GetFilterId = (aFilterList: any) => {
    // name in 인 경우만 aFilter.value 제외해서 사용.
    return aFilterList
        .map((aFilter: any) => {
            if (aFilter.operator === 'in' && aFilter.column === 'NAME') return '' + aFilter.column + aFilter.operator;
            else return '' + aFilter.column + aFilter.operator + aFilter.value;
        })
        .sort()
        .join();
};
/** 사용하는 filter만 반환 */
const UseFilter = (aFilterList: any) => {
    return aFilterList.filter((aFilter: any) => aFilter.useFilter);
};
/** 동일한 format을 위해, Custom 하지 않은 tag Table의 values 생성 */
const GetValues = (aTable: any) => {
    return [
        {
            id: aTable.id,
            alias: aTable.value,
            value: aTable.value,
            aggregator: aTable.aggregator,
        },
    ];
};
/** 동일한 format을 위해, filter 생성 */
const GetFilter = (aFilter: any, aTag: string) => {
    return [{ ...aFilter[0], column: 'NAME', operator: 'in', value: aTag }];
};
/** tag | log 에 맞는 time column 반환 */
const GetTimeColumn = (aTable: any): string => {
    if (aTable.type === 'tag') return 'TIME';
    else return aTable.time;
};
const GetColumns = (aQueryList: any) => {
    return aQueryList[0].values.map((aValue: any) => {
        if (aValue.alias && aValue.alias !== '') return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS '${aValue.alias}'`;
        else return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS '${aValue.aggregator}(${aValue.value})'`;
    });
};
const GetWhere = (aFilterList: any) => {
    const sFlatFilter = aFilterList
        .map((aFilter: any) => {
            return [...aFilter.filter];
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
const GetParsedQuery = (sQueryGroup: any, aTime: { interval: any; start: any; end: any }) => {
    const sResultQuery = sQueryGroup.map((aQueryList: any) => {
        // sub query (where)
        let sWhere: any = '';
        // column
        let sColumns: string[] = [];
        // time
        let sTime: string = '';
        // user.table
        let sTable: string = '';
        // table type (tag | log)
        let sTableType: string = '';
        if (aQueryList && aQueryList.length > 0) {
            sTableType = aQueryList[0].type;
            sTime = GetTimeColumn(aQueryList[0]);
            sTable = aQueryList[0].userName + '.' + aQueryList[0].tableName;
            sColumns = GetColumns(aQueryList);
            sWhere = GetWhere(aQueryList);
        }
        return `SELECT ${sTime}${sTableType === 'tag' ? ' / 1000000000 * 1000000000' : ''} AS TIME, NAME,${sColumns} FROM ${sTable} WHERE ${sTime} BETWEEN ${
            aTime.start
        }000000 AND ${aTime.end}000000${sWhere ? ' AND' + sWhere : ''} GROUP BY ${sTime}, NAME`;
    });

    return sResultQuery;
};
