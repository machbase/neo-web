import request from '@/api/core';
import { Toast } from '@/design-system/components';
import { createMinMaxQuery, createTableTagMap, getUserName, isCurUserEqualAdmin, isRollupExt } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
import { getInterval } from '@/utils/DashboardQueryParser';
import { toSqlValueExpressionForAggregator, jsonValueFieldToNumericSql } from '@/utils/dashboardJsonValue';
import { createLogTimeMinMaxQuery, createViewTimeMinMaxQuery } from '@/utils/dashboardTimeMinMax';
import { removeV$Table } from '@/utils/dbUtils';
import { canUseTagAnalyzerRollup } from '@/utils/tagAnalyzerFields';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import { TagzCsvParser } from '@/utils/tqlCsvParser';
import moment from 'moment';
import {
    buildRawTimeExpression,
    buildRollupAwareAggregationSql,
    buildRollupTimeExpression,
    createRollupAggregationMetric,
} from '@/utils/rollupQueryBuilder';
// import { getTimeZoneValue } from '@/utils/utils';

const getTqlChart = (aData: string, aType?: 'dsh', signal?: AbortSignal) => {
    return request({
        method: 'POST',
        url: `/api/tql${aType ? '/' + aType : ''}`,
        data: aData,
        signal,
    });
};

export const getTqlScripts = (aFullPath: string) => {
    const sTargetPath = aFullPath.split('/').filter((aPath: string) => aPath !== '');
    return request({
        method: 'GET',
        url: `/api/tql/${sTargetPath.join('/')}`,
        headers: { 'X-Tql-Output': 'json' },
    });
};

const getChartMinMaxData = async (aTable: string, aTag: string) => {
    return await request({
        method: 'GET',
        url: encodeURIComponent(`/api/tables/${aTable}/tags/${aTag}/stat?timeformat=ns`),
    });
};
const getChartData = async (aTagTables: string, option: boolean, range: number, time: number) => {
    return await request({
        method: 'GET',
        url: `/api/chart?${aTagTables}&time=${time}&range=${range}s&format=${'json'}&timeformat=ns${option ? `&transform=${option}` : ''}`,
    });
};

const postTerminalSize = async (aTerminalId: number, aSize: { cols: number; rows: number }) => {
    await request({
        method: 'POST',
        url: `/api/term/${aTerminalId}/windowsize`,
        data: JSON.parse(JSON.stringify({ cols: aSize.cols, rows: aSize.rows })),
    });
};
const fetchData = async (aSql: string, aFormat: string, aTimezone: any, aLimit?: any) => {
    const sSQL = 'INPUT(SQL(`' + aSql + '`))\n' + 'DROP(' + (aLimit * 50 - 50) + ')\n' + 'TAKE(50)\n' + "OUTPUT(JSON(timeformat('" + aFormat + "'), tz('" + aTimezone + "')))";
    return await request({
        method: 'POST',
        url: `/api/tql`,
        data: sSQL,
    });
};
const fetchTableName = async (aTable: string) => {
    let DBName = '';
    let sTableName = aTable;
    let sUserName = ADMIN_ID.toUpperCase();
    const sTableInfos = aTable.split('.');
    if (aTable.indexOf('.') === -1 || sTableInfos.length < 3) {
        DBName = String(-1);
        if (sTableInfos.length === 2) {
            sUserName = sTableInfos[0];
            sTableName = sTableInfos[sTableInfos.length - 1];
        }
    } else {
        DBName = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = '${sTableInfos[0]}')`;
        sTableName = sTableInfos[sTableInfos.length - 1];
        sUserName = sTableInfos[1];
    }
    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP, MC.FLAG AS FLAG FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER('${sUserName}') AND MC.DATABASE_ID = ${DBName} AND MT.NAME = '${sTableName}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const queryString = `/api/query?q=${sSql}`;

    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });

    return sData;
};

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue, Rollup, colName, RollupList } = params;
    const sCurrentUserName = getUserName();
    const sTableName = isCurUserEqualAdmin() ? Table : Table.split('.').length === 1 ? sCurrentUserName + '.' + Table : Table;
    const sName = colName.name;
    const sTime = colName.time;
    const sValue = toSqlValueExpressionForAggregator(colName.value, CalculationMode, colName.jsonKey);
    const sRollup = Rollup && canUseTagAnalyzerRollup(colName);
    const sUseNumericBaseTime = Boolean(colName?.timeBaseTime) && Number(colName?.timeType) !== DATETIME_COLUMN_TYPE;
    const sNanoSec = 1000000;
    let sStartTime = Start,
        sEndTime = End;
    const sCheckStartTime = Start?.toString()?.includes('.');
    const sCheckEndTime = End?.toString()?.includes('.');
    const sTimeRange = (End - Start) / 2;

    if (sCheckStartTime) sStartTime = Start * sNanoSec;
    if (sCheckEndTime) sEndTime = End * sNanoSec;
    if (Start.toString().length === 13) sStartTime = Start * sNanoSec - sTimeRange;
    if (End.toString().length === 13) sEndTime = End * sNanoSec + sTimeRange;

    const getTimeBucketColumn = () => {
        const sInterval = getInterval(IntervalType, IntervalValue) * 1000000;
        if (!sInterval) return sTime;
        return `${sTime} / ${sInterval} * ${sInterval}`;
    };

    const getRawTimeExpression = () => {
        return sUseNumericBaseTime ? getTimeBucketColumn() : buildRawTimeExpression(sTime, IntervalType, IntervalValue);
    };

    const getSourceMode = (): 'raw' | 'split' => {
        if (!sRollup) return 'raw';
        if (CalculationMode === 'first' || CalculationMode === 'last') {
            const sIsExtRollup = isRollupExt(RollupList, sTableName, getInterval(IntervalType, IntervalValue));
            return sIsExtRollup ? 'split' : 'raw';
        }
        return 'split';
    };

    const getMetric = () => {
        if (CalculationMode === 'cnt') {
            return createRollupAggregationMetric({
                aggregator: 'count',
                outputAlias: 'VALUE',
                valueExpression: sValue,
            });
        }

        return createRollupAggregationMetric({
            aggregator: CalculationMode,
            outputAlias: 'VALUE',
            valueExpression: sValue,
            timeExpression: sTime,
        });
    };

    const sSourceMode = getSourceMode();
    const sOuterTimeExpression = sUseNumericBaseTime ? `mTime / 1000000.0 as time` : `to_timestamp(mTime) / 1000000.0 as time`;

    const sMainQuery = buildRollupAwareAggregationSql({
        sourceMode: sSourceMode,
        tableName: sTableName,
        timeColumn: sTime,
        timeRange: {
            start: sStartTime,
            end: sEndTime,
        },
        baseConditions: [`${sName} in ('${TagNames}')`],
        intervalType: IntervalType,
        intervalValue: IntervalValue,
        rollupTimeExpression: buildRollupTimeExpression(sTime, IntervalType, IntervalValue),
        rawTimeExpression: getRawTimeExpression(),
        outerTimeExpression: sOuterTimeExpression,
        outerGroupBy: sUseNumericBaseTime ? 'GROUP BY mTime / 1000000.0' : undefined,
        metrics: [getMetric()],
        limit: Count * 1,
    });

    // UTC+${-1 * (getTimeZoneValue() / 60)}
    // const sTimezone = String(-1 * (getTimeZoneValue() / 60));

    const sLastQuery = `SQL("${sMainQuery}")\nCSV()`;
    const sData = await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    });

    // const queryString = `/machbase?q=${encodeURIComponent(sMainQuery)}`;
    // const sData = await request({
    //     method: 'GET',
    //     url: queryString,
    // });

    let sConvertData;
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    } else {
        if (typeof sData.data === 'string') {
            sConvertData = {
                ...sData,
                data: {
                    column: ['TIME', 'VALUE'],
                    rows: TagzCsvParser(sData.data),
                },
            };
        }
    }
    return sConvertData;
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count, colName, sampleValue, UseSampling } = params;
    let sOrderBy = '';
    const sNanoSec = 1000000;
    let sStartTime = Start,
        sEndTime = End;
    const sCheckStartTime = Start.toString().includes('.');
    const sCheckEndTime = End.toString().includes('.');
    const sTimeRange = (End - Start) / 2;

    if (sCheckStartTime) sStartTime = Start * sNanoSec;
    if (sCheckEndTime) sEndTime = End * sNanoSec;
    if (Start.toString().length === 13) sStartTime = Start * sNanoSec - sTimeRange;
    if (End.toString().length === 13) sEndTime = End * sNanoSec + sTimeRange;

    // if (Start.length < 19) {
    //     sStart = Start.substring(0, 10) + ' 00:00:00 000:000:000';
    // } else if (Start.length < 22) {
    //     sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' 000:000:000';
    // } else {
    //     sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' ' + Start.substring(20, 23) + ':000:000';
    // }

    // if (End.length < 19) {
    //     sEnd = End.substring(0, 10) + ' 23:59:59 999:999:999';
    // } else if (End.length < 22) {
    //     sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' 000:000:000';
    // } else {
    //     sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' ' + End.substring(20, 23) + ':000:000';
    // }

    if (Direction == 1) {
        sOrderBy = '1 desc';
    } else if (Direction == 2) {
        sOrderBy = '1';
    }

    const sNameCol = colName.name;
    const sTimeCol = colName.time;
    const sValueCol = colName.jsonKey ? jsonValueFieldToNumericSql(colName.value, colName.jsonKey) : colName.value;
    const sUseNumericBaseTime = Boolean(colName?.timeBaseTime) && Number(colName?.timeType) !== DATETIME_COLUMN_TYPE;

    // const sTimeQ = `(${sTimeCol}/1000000)` + ' as date';
    const sTimeQ = (sUseNumericBaseTime ? `${sTimeCol} / 1000000.0` : `to_timestamp(${sTimeCol}) / 1000000.0`) + ' as date';
    const sValueQ = sValueCol + ' as value';

    let sQuery = `SELECT${
        UseSampling ? '/*+ SAMPLING(' + sampleValue + ') */' : ''
    } ${sTimeQ}, ${sValueQ} FROM ${Table} WHERE ${sNameCol} = '${TagNames}' AND ${sTimeCol} BETWEEN ${sStartTime} AND ${sEndTime}`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }

    if (sampleValue) {
        if (sampleValue) {
            sQuery = 'select * from (' + sQuery + ') LIMIT ' + 200000;
        }
    } else {
        if (Count > 0) {
            sQuery = sQuery + ' LIMIT ' + Count;
        }
    }

    // const queryString = `/machbase?q=${encodeURIComponent(sQuery)}&timeformat=ns`;
    const sLastQuery = `SQL("${sQuery}")\nCSV()`;

    const sData = await request({
        method: 'POST',
        url: '/api/tql/taz',
        data: sLastQuery,
    });

    let sConvertData;
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    } else {
        if (typeof sData.data === 'string') {
            sConvertData = {
                ...sData,
                data: {
                    column: ['TIME', 'VALUE'],
                    rows: TagzCsvParser(sData.data),
                },
            };
        }
    }
    return sConvertData;
};

const fetchOnMinMaxTable = async (tableTagInfo: any, userName: string) => {
    const convert = createTableTagMap(tableTagInfo);
    const query = createMinMaxQuery(convert, userName);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(`${query}`),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};

export const fetchMountTimeMinMax = async (aTargetInfo: any) => {
    const sTime = aTargetInfo.time || aTargetInfo.tableInfo[1][0];
    const sQuery = `select min(${sTime}), max(${sTime}) from ${aTargetInfo.table}`;
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(sQuery),
    });

    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    if (!sData?.data || !sData.data?.rows || sData.data.rows.length === 0) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
};

const getTableName = (targetTxt: string) => {
    if (targetTxt.includes('.')) return targetTxt.split('.').at(-1);
    else return targetTxt;
};

export const fetchTimeMinMax = async (aTargetInfo: any) => {
    let sQuery: string | undefined = undefined;
    // Query tag table
    if (aTargetInfo.type === 'tag') {
        const sIsVirtualTable = aTargetInfo.table.includes('V$');
        const sTableName = sIsVirtualTable ? removeV$Table(aTargetInfo.table) : getTableName(aTargetInfo.table);
        const sTime = aTargetInfo.time || 'TIME';
        const sName = aTargetInfo.name || 'NAME';
        if (sTime.toUpperCase() === 'TIME') {
            sQuery = `select min_time, max_time from ${aTargetInfo.userName}.V$${sTableName}_STAT where name in ('${aTargetInfo.tag}')`;
        } else {
            sQuery = `select min(${sTime}), max(${sTime}) from ${aTargetInfo.userName}.${sTableName} where ${sName} in ('${aTargetInfo.tag}')`;
        }
    }
    // Query log table
    if (aTargetInfo.type === 'log') sQuery = createLogTimeMinMaxQuery(aTargetInfo);
    // Query view table
    if (aTargetInfo.type === 'view') sQuery = createViewTimeMinMaxQuery(aTargetInfo);
    if (!sQuery) return;

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(sQuery),
    });

    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    if (!sData?.data || !sData.data?.rows || sData.data.rows.length === 0) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
};

export const fetchVirtualStatTable = async (aTable: string, aTagList: string[], aTagSet?: any) => {
    const sTime = aTagSet ? aTagSet.colName.time : 'TIME';
    const sName = aTagSet ? aTagSet.colName.name : 'NAME';
    const sSplitTable = aTable.split('.');
    const sTags = `'${aTagList.join("','")}'`;
    let query: string = `select min_time, max_time from ${sSplitTable.length === 1 ? ADMIN_ID : sSplitTable[0]}.V$${sSplitTable.at(-1)}_STAT WHERE NAME IN (${sTags})`;

    if (aTable.split('.').length > 2 || sTime.toUpperCase() !== 'TIME') {
        const sTableName = sSplitTable.length === 1 ? `${ADMIN_ID}.${aTable}` : aTable;
        query = `select min(${sTime}), max(${sTime}) from ${sTableName} where ${sName} in (${sTags})`;
    }

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(query),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData.data.rows;
};

export const fetchDashboardJsonColumnSamples = async (aTable: string, aColumn: string) => {
    const sQuery = `select ${aColumn} from ${aTable} where ${aColumn} is not null limit 50`;
    return await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(sQuery),
    });
};

const fetchRollupData = async (params: any) => {
    const { Table } = params;

    const sData = await request({
        method: 'GET',
        url: `/machiot/rollup`,
        data: {
            Table,
        },
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};

const fetchTablesData = async () => {
    const sData = await request({
        method: 'GET',
        url: `/api/tables`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    return sData;
};

const fetchTags = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/api/tables/${table}/tags`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};
const fetchRollUp = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machiot/rollup/${table}`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};
const fetchOnRollupTable = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=select * from v$rollup where root_table = '${table}' and ENABLED = 1 `,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};
const getRollupTableList = async () => {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    let sUrl = `select t1.user_name as user_name, 
  case when t1.database_id = -1 then 'MACHBASEDB' else t2.MOUNTDB end || '.' || t1.root_table as root_table, 
  t1.interval_time as interval_time, t1.column_name as column_name, t1.ext_type as ext_type 
from (
  select v.database_id, u.name as user_name, root_table, interval_time, column_name, ext_type 
  from v$rollup as v, m$sys_users as u 
  where v.user_id = u.user_id 
  group by v.database_id, root_table, interval_time, user_name, column_name, ext_type 
) as t1 LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES as t2 ON (t1.database_id = t2.BACKUP_TBSID) 
order by user_name, root_table asc, interval_time desc`;

    if (sRollupVersion === 'OLD')
        sUrl = `select u.name as user_name, root_table, interval_time, column_name, ext_type 
from v$rollup as v, m$sys_users as u 
where v.user_id = u.user_id 
group by root_table, interval_time, user_name, column_name, ext_type 
order by user_name, root_table asc, interval_time desc`;

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${sUrl}`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    const sConvertArray: any = {};
    if (sData?.data && sData.data.rows && sData.data.rows.length > 0) {
        for (const [user, table, value, column, ext_type] of sData.data.rows) {
            if (!sConvertArray[user]) {
                sConvertArray[user] = {};
            }
            if (!sConvertArray[user][table]) {
                sConvertArray[user][table] = [];
            }
            if (!sConvertArray[user][table][column]) {
                sConvertArray[user][table][column] = [];
            }
            if (!sConvertArray[user][table]['EXT_TYPE']) {
                sConvertArray[user][table]['EXT_TYPE'] = [];
            }
            // exist ext_type = 1
            // noExist ext_type = 0
            sConvertArray[user][table]['EXT_TYPE'].push(ext_type);
            sConvertArray[user][table][column].push(value);
        }
        return sConvertArray;
    } else {
        return [];
    }
};

/**
 * getTagList
 * @param aTable target table
 * @param aFilter search text
 * @param aPage pagination num [1 ~ 9999....]
 * @returns
 */
export const getTagPagination = async (aTable: string, aFilter: string, aPage: number, aColName: string) => {
    const DEFAULT_LIMIT = 10;
    const sFilter = aFilter ? `${aColName} like '%${aFilter}%'` : '';
    const sLimit = `${(aPage - 1) * DEFAULT_LIMIT}, ${DEFAULT_LIMIT}`;
    const sTableName = getMetaTableName(aTable);
    const sData = await request({
        method: 'GET',
        url:
            `/api/query?q=` +
            encodeURIComponent(`select * from ${sTableName}${sFilter !== '' ? ' where ' + sFilter + ` ORDER BY ${aColName} ` : ` ORDER BY ${aColName} `} LIMIT ${sLimit}`),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};

const getMetaTableName = (aTableName: string) => {
    const sSplitName = aTableName.split('.');
    const sTableName = '_' + sSplitName?.at(-1) + '_META';
    sSplitName.pop();
    sSplitName.push(sTableName);
    return sSplitName.join('.');
};

export const getTagTotal = async (aTable: string, aFilter: string, aColName: string) => {
    const sTableName = getMetaTableName(aTable);
    const sFilter = aFilter ? `${aColName} like '%${aFilter}%'` : '';
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(`select count(*) from ${sTableName}${sFilter !== '' ? ' where ' + sFilter : ''}`),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }
    return sData;
};

export {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
    fetchRollupData,
    fetchTableName,
    fetchTags,
    fetchRollUp,
    fetchOnRollupTable,
    fetchOnMinMaxTable,
    fetchData,
    postTerminalSize,
    getChartData,
    getChartMinMaxData,
    getTqlChart,
    getRollupTableList,
};
