/** Dashboard QUERY PARSER */
export const DashboardQueryParser = (aTableList: any, aTime: { interval: any; start: any; end: any }) => {
    console.log('--------------------------------DashboardQueryParser------------------------------------');

    // *   TABLE   | TAG   | VALUE | FILTER
    // *   --------------------------------
    // *    O      |   N   |   N   |   O
    // * 의 경우만 같은 쿼리, 나머지는 다른 쿼리

    const sTmpTableList = JSON.parse(JSON.stringify(aTableList)).map((aTable: any) => {
        return { ...aTable, filter: UseFilter(aTable.filter) };
    });

    const sTableGroupList = GetTableGroup(sTmpTableList);
    const sQueryGroup = sTableGroupList.map((aTableGroup: any) => {
        return aTableGroup.map((aTable: any) => {
            return {
                type: aTable.type,
                userName: aTable.userName,
                tableName: aTable.table,
                filter: aTable.useCustom ? aTable.filter : GetFilter(aTable.filter, aTable.tag),
                values: aTable.useCustom ? aTable.values : GetValues(aTable),
            };
        });
    });

    const sResultSql = `SELECT * FROM(
        ${GetParsedQuery(sQueryGroup, aTime)}
    ) ORDER BY TIME`;
};

/** 동일한 Table명 + 동일한 userName + 동일한 filter 갖는 Item group 반환 */
const GetTableGroup = (aTableList: any) => {
    const sResultTable: any = {};
    aTableList.map((aTable: any) => {
        if (sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter)]) {
            sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter)] = [
                ...sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter)],
                aTable,
            ];
        } else sResultTable[aTable.table + '-' + aTable.userName + GetFilterId(aTable.filter)] = [aTable];
    });
    return Object.keys(sResultTable).map((aKey: string) => {
        return sResultTable[aKey];
    });
};
/** 동일한 filter 사용 검사를 위한 method */
const GetFilterId = (aFilterList: any) => {
    return aFilterList
        .map((aFilter: any) => {
            return '' + aFilter.column + aFilter.operator + aFilter.value;
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
const GetTimeColumn = (aType: string): string => {
    if (aType === 'tag') return 'TIME';
    else return '_ARRIVAL_TIME';
};
const GetColumns = (aQueryList: any) => {
    return aQueryList.map((aQuery: any) => {
        return aQuery.values.map((aValue: any) => {
            if (aValue.alias && aValue.alias !== '') return `${aValue.aggregator}(${aValue.value}) AS '${aValue.alias}'`;
            else return `${aValue.aggregator}(${aValue.value}) AS '${aValue.aggregator}(${aValue.value})'`;
        });
    });
};
const GetWhere = (aQueryList: any) => {
    console.log('getWhere', aQueryList);
    // let sValueList: any = [];
    let sWhere: string[] = [];
    // const sNameList: string[] = [];
    aQueryList.map((aQuery: any) => {
        aQuery.filter.map((aFilter: any) => {
            console.log('aFilter', aFilter);
        });
    });

    sWhere = [''];
    return sWhere;
};
const GetParsedQuery = (sQueryGroup: any, aTime: { interval: any; start: any; end: any }) => {
    // TABLE | TAG | VALUE | FILTER
    // TABLE(FILTER)이 다르면 다른 쿼리

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
            sTime = GetTimeColumn(aQueryList[0].type);
            sTable = aQueryList[0].userName + '.' + aQueryList[0].tableName;
            sColumns = GetColumns(aQueryList);
            sWhere = GetWhere(aQueryList);
        }

        return `SELECT ${sTime}${sTableType === 'tag' ? ' / 1000000000 * 1000000000' : ''} AS TIME, ${sColumns} FROM ${sTable} WHERE ${sTime} BETWEEN ${aTime.start} AND ${
            aTime.end
        }${sWhere ? sWhere : ''}`;
    });

    console.log('res', sResultQuery);
    // COMMON
    // SELECT (TIME) AS TIME, (COLUMN) FROM (USER.TABLE) WHERE (TIME) BETWEEN (START_TIME) AND (END_TIME) AND (AGGREGATOR) GROUP BY (TIME), (COLUMN)

    // Tag
    //      select TIME / 1000000000 * 1000000000 AS time, name, max(value) as vvv from example
    //        where TIME between 1672197914776000000 and 1703733914776000000 and name in ('temperature') GROUP BY TIME, name
    // union all (테이블 다를 경우)
    // Log
    //     select _arrival_time as time, name, min(seq) as max from sample_table
    //        where _arrival_time between 1672197914776000000 and 1703733914776000000 and name in ('TEST_NAME1') GROUP BY _arrival_time, name
    // return aTagTable;
};
