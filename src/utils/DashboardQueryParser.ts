/** Dashboard QUERY PARSER */
export const DashboardQueryParser = (aTableList: any, aTime: { interval: any; start: any; end: any }) => {
    console.log('--------------------------------DashboardQueryParser------------------------------------');
    // console.log('origin', aTableList);
    // console.log('time', aTime);

    const sTableGroupList = GetTableGroup(aTableList);
    // console.log('sTableList', sTableGroupList);
    const sQueryGroup = sTableGroupList.map((aTableGroup: any) => {
        return aTableGroup.map((aTable: any) => {
            return {
                type: aTable.type,
                userName: aTable.userName,
                tableName: aTable.table,
                filter: aTable.useCustom ? UseFilter(aTable.filter) : GetFilter(aTable.filter, aTable.tag),
                values: aTable.useCustom ? aTable.values : GetValues(aTable),
            };
        });
    });

    const sResultSql = `SELECT * FROM(
        ${GetParsedQuery(sQueryGroup, aTime)}
    ) ORDER BY TIME`;
    // console.log('sResultSql', sResultSql);
};

/** 동일한 Table명 + 동일한 userName 을 갖는 Item group 반환 */
const GetTableGroup = (aTableList: any) => {
    const sResultTable: any = {};
    aTableList.map((aTable: any) => {
        if (sResultTable[aTable.table + '-' + aTable.userName])
            sResultTable[aTable.table + '-' + aTable.userName] = [...sResultTable[aTable.table + '-' + aTable.userName], aTable];
        else sResultTable[aTable.table + '-' + aTable.userName] = [aTable];
    });
    return Object.keys(sResultTable).map((aKey: string) => {
        return sResultTable[aKey];
    });
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
    if (aType === 'tag') return 'TIME / 1000000000 * 1000000000';
    else return '_ARRIVAL_TIME';
};
const GetParsedQuery = (sQueryGroup: any, aTime: { interval: any; start: any; end: any }) => {
    console.log('aTime', aTime);
    // console.log('sQueryGroup', sQueryGroup);

    const test = sQueryGroup.map((aQueryList: any) => {
        // column
        let sColumns: any = '';
        // time
        let sTime: any = '';
        // user.table
        let sTable: string = '';

        if (aQueryList && aQueryList.length > 0) {
            sTime = GetTimeColumn(aQueryList[0].type);
            sTable = aQueryList[0].userName + '.' + aQueryList[0].tableName;
            aQueryList.map((aQuery: any) => {
                sColumns = aQuery.values.map((aValue: any) => {
                    if (aValue.alias && aValue.alias !== '') return `${aValue.aggregator}(${aValue.value}) AS "${aValue.aggregator}(${aValue.value})"`;
                    else return `${aValue.aggregator}(${aValue.value}) AS "${aValue.alias}"`;
                });

                // tag table
                if (aQuery.type === 'tag') {
                    console.log('TAG');
                }
                // log table
                else {
                    console.log('LOG');
                }
                console.log('aQuery', aQuery);
            });
        }

        console.log('sColumns', sColumns);

        return `SELECT ${sTime} AS TIME, ${sColumns} FROM ${sTable}`;
    });

    console.log('test', test);

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
