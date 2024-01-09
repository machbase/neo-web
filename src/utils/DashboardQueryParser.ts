/** Dashboard QUERY PARSER */
export const DashboardQueryParser = async (aTableList: any, aTime: { interval: any; start: any; end: any }) => {
    const sTmpTableList = JSON.parse(JSON.stringify(aTableList)).map((aTable: any) => {
        return {
            ...aTable,
            filter: aTable.useCustom ? UseFilter(aTable.filter) : GetFilter(aTable),
            values: aTable.useCustom ? aTable.values : GetValues(aTable),
        };
    });
    const sTableGroupList = GetTableGroup(sTmpTableList);
    const sQueryGroup = sTableGroupList.map((aTableGroup: any) => {
        return aTableGroup.map((aTable: any) => {
            return {
                time: aTable.time,
                type: aTable.type,
                userName: aTable.userName,
                tableName: aTable.table,
                filterList: aTable.filter,
                valueList: aTable.values,
                useRollup: aTable.useRollup,
                useCustom: aTable.useCustom,
                color: aTable.color,
                blockIdx: aTable.blockIdx,
            };
        });
    });
    const sTagList = GetColumnList(sQueryGroup);
    const sParsedQueryList = GetParsedQuery(sQueryGroup, aTime);
    console.log('sTagList', sTagList);
    console.log('sParsedQueryList', sParsedQueryList);
    const sResultQuery = `SELECT * FROM (\n` + `${sParsedQueryList.join(' UNION ALL ')}\n` + `) ORDER BY TIME, NAME`;
    return [sResultQuery, sTagList];
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
const GetTimeColumn = (aTable: any): string => {
    if (aTable.type === 'tag') return 'TIME';
    else return aTable.time;
};
const GetColumns = (aQueryList: any) => {
    return aQueryList[0].valueList.map((aValue: any) => {
        if (aValue.alias && aValue.alias !== '') return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS '${aValue.alias}'`;
        else return ` ${aValue.aggregator}(${aValue.value}) * 1.0 AS '${aValue.aggregator}(${aValue.value})'`;
    });
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
        }000000 AND ${aTime.end}000000${sWhere ? ' AND' + sWhere : ''} GROUP BY NAME, ${sTime} `;
    });

    return sResultQuery;
};
