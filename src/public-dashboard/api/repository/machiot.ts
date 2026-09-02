import request from '../core';
import { qualifyTableName, qualifySiblingObject } from '@/utils/qualifiedTableName';
// This tree's own resolver, not the editor's: the editor's rides `/web/api/query`, which answers
// 401 for an unauthenticated board and would leave every lookup below on the pre-v8.7 fallback.
import { ensureCurrentDatabase } from './currentDatabase';
import { executeQuery } from './publicQuery';
import { getCurrentDatabaseId, hasLogicalDatabases } from '@/utils/currentDatabaseState';
import { Toast } from '@/design-system/components';
import { getRollupMatch, getUserName, isCurUserEqualAdmin } from '../../utils';
import { ADMIN_ID } from '../../utils/constants';
import { getInterval } from '../../utils/DashboardQueryParser';
import { createBlockTimeMinMaxFetcher, createLogTimeMinMaxQuery, createViewTimeMinMaxQuery } from '@/utils/dashboardTimeMinMax';
import { jsonValueFieldToNumericSql, toSqlValueExpressionForAggregator } from '@/utils/dashboardJsonValue';
import { removeV$Table } from '../../utils/dbUtils';
import { canUseTagAnalyzerRollup } from '@/utils/tagAnalyzerFields';
import { DATETIME_COLUMN_TYPE, isNumericBaseTimeBlock } from '@/utils/timeFieldColumns';
import { buildTagStatExtentSelect, isMissingStatColumnError, otherTagStatBaseKind, type TagStatBaseKind } from '@/utils/tagStatColumns';
import { TagzCsvParser } from '../../utils/tqlCsvParser';
import moment from 'moment';
import {
    buildRawTimeExpression,
    buildRollupAwareAggregationSql,
    buildRollupTimeExpression,
    createJsonRollupAggregationMetric,
    createRollupAggregationMetric,
} from '../../../utils/rollupQueryBuilder';
import { getBaseJsonRollupValue, ROLLUP_EXT_TYPE_BY_COLUMN } from '@/utils/rollupColumnCandidates';


// Moved to `./publicQuery` so the database resolver can be built on it without the two files
// importing each other. Re-exported because DashboardView imports it from here.
export { executeQuery };

const getTqlChart = async (aData: string, _aType?: 'dsh') => {
    try {
        const response = await fetch('/db/tql', {
            method: 'POST',
            headers: {
                'X-Tql-Output': 'json',
                Accept: 'application/json',
            },
            body: aData,
        });

        if (response.ok) {
            const result = await response.json();
            return {
                data: result,
                success: true,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
            };
        } else {
            return {
                data: `Request failed: ${response.statusText}`,
                success: false,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
            };
        }
    } catch (error) {
        return { data: { reason: `Network error: ${error}` }, success: false };
    }
};

export const getTqlScripts = async (aFullPath: string) => {
    try {
        const sTargetPath = aFullPath.split('/').filter((aPath: string) => aPath !== '');
        const response = await fetch(`/db/tql/${sTargetPath.join('/')}`, {
            method: 'GET',
            headers: {
                'X-Tql-Output': 'json',
                Accept: 'application/json',
            },
        });

        const responseHeaders = Object.fromEntries(response.headers.entries());

        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            let result;
            if (contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                try {
                    result = JSON.parse(text);
                } catch {
                    result = text;
                }
            }
            return {
                data: result,
                success: true,
                status: response.status,
                headers: responseHeaders,
            };
        } else {
            const text = await response.text().catch(() => response.statusText);
            return {
                data: `Request failed: ${text}`,
                success: false,
                status: response.status,
                headers: responseHeaders,
            };
        }
    } catch (error) {
        return {
            data: `Network error: ${error}`,
            success: false,
            status: 500,
            headers: {},
        };
    }
};

export const fetchMountTimeMinMax = async (aTargetInfo: any) => {
    const sTime = aTargetInfo.time || aTargetInfo.tableInfo[1][0];
    const sQuery = `select min(${sTime}), max(${sTime}) from ${aTargetInfo.table}`;

    const sData = await executeQuery(sQuery);

    if (sData.status >= 400) {
    }

    if (!sData?.data || !sData.data?.rows || sData.data.rows.length === 0) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
};

export const fetchRollupVersion = async () => {
    const sData = await executeQuery('SELECT count(DATABASE_ID) FROM V$ROLLUP');
    return {
        ...sData,
        svrState: sData?.success ?? false,
    };
};

const isFailedMinMaxResponse = (aData: any) => (aData?.status ?? 0) >= 400 || aData?.success === false;
const minMaxFailureReason = (aData: any) => (typeof aData?.data === 'object' ? aData?.data?.reason ?? '' : aData?.data ?? '');
const hasMinMaxRow = (aData: any) => Boolean(aData?.data?.rows?.length) && aData.data.rows[0]?.[0] != null;

/**
 * A tag block's base extent, from the stat view when that view can answer and from the column when
 * it cannot. The editor's twin — `src/api/repository/machiot.ts` — carries the full reasoning; keep
 * the two in step.
 */
const fetchTagTimeMinMaxResponse = async (aTargetInfo: any) => {
    const sIsVirtualTable = aTargetInfo.table.includes('V$');
    const sTime = aTargetInfo.time || 'TIME';
    const sName = aTargetInfo.name || 'NAME';
    const sBaseKind: TagStatBaseKind = isNumericBaseTimeBlock(aTargetInfo) ? 'distance' : 'time';

    // The block names either the stat view (a Gauge / Pie panel stores that) or the
    // source table, and either way the name keeps the database it came with. Reducing
    // it to the bare table and re-attaching only the owner built `SYS.V$ATABLE_STAT`,
    // which resolves in whichever database the session is in — so a panel on FACTORY_A
    // read MACHBASEDB's empty copy of the view, got no extent, and fell back to a
    // `now - 1h` window. The data query is correctly qualified, so the panel asked the
    // right table for the wrong hour and drew a blank chart with no error. Measured:
    // FACTORY_A.SYS.V$ATABLE_STAT answers a real range where SYS.V$ATABLE_STAT is empty.
    const sStatView = sIsVirtualTable
        ? qualifyTableName(aTargetInfo.userName, aTargetInfo.table)
        : qualifySiblingObject(aTargetInfo.userName, aTargetInfo.table, (n) => `V$${n}_STAT`);
    // Undoing the decoration on the last segment alone, for the same reason.
    const sSourceTable = sIsVirtualTable
        ? qualifySiblingObject(aTargetInfo.userName, aTargetInfo.table, (n) => removeV$Table(n))
        : qualifyTableName(aTargetInfo.userName, aTargetInfo.table);
    const sScanQuery = `select min(${sTime}), max(${sTime}) from ${sSourceTable} where ${sName} in ('${aTargetInfo.tag}')`;

    const sCanUseStatView = sBaseKind === 'distance' || sTime.toUpperCase() === 'TIME';
    if (!sCanUseStatView) return executeQuery(sScanQuery);

    const sStatQuery = (aBaseKind: TagStatBaseKind) => `select ${buildTagStatExtentSelect(aBaseKind, 'mn', 'mx')} from ${sStatView} where name in ('${aTargetInfo.tag}')`;
    const sStatData = await executeQuery(sStatQuery(sBaseKind));
    if (!isFailedMinMaxResponse(sStatData)) return sStatData;

    if (isMissingStatColumnError(minMaxFailureReason(sStatData))) {
        const sRetryData = await executeQuery(sStatQuery(otherTagStatBaseKind(sBaseKind)));
        if (!isFailedMinMaxResponse(sRetryData)) return sRetryData;
    }

    return executeQuery(sScanQuery);
};

export const fetchTimeMinMax = async (aTargetInfo: any) => {
    let sData: any;
    if (aTargetInfo.type === 'tag') {
        sData = await fetchTagTimeMinMaxResponse(aTargetInfo);
    } else {
        let sQuery: string | undefined = undefined;
        // Query log table
        if (aTargetInfo.type === 'log') sQuery = createLogTimeMinMaxQuery(aTargetInfo);
        // Query view table
        if (aTargetInfo.type === 'view') sQuery = createViewTimeMinMaxQuery(aTargetInfo);
        if (!sQuery) return;
        sData = await executeQuery(sQuery);
    }

    // An aggregate always answers a row, so a tag with no data arrives as `[[null, null]]` where an
    // unaggregated read answered no rows at all. Both say the same thing — no extent.
    if (!hasMinMaxRow(sData)) {
        const sNowTime = moment().unix() * 1000000;
        const sNowTimeMinMax = [moment(sNowTime).subtract(1, 'h').unix() * 1000000, sNowTime];
        return [sNowTimeMinMax];
    }

    return sData.data.rows;
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
    // A name with no database part means the database this session is in — which is -1 only on
    // pre-v8.7 servers. A three-part name names a logical database on v8.7 (V$DATABASES) and a
    // mounted backup on older ones, which is the only multi-database concept they had.
    await ensureCurrentDatabase();
    if (aTable.indexOf('.') === -1 || sTableInfos.length < 3) {
        DBName = String(getCurrentDatabaseId());
        if (sTableInfos.length === 2) {
            sUserName = sTableInfos[0];
            sTableName = sTableInfos[sTableInfos.length - 1];
        }
    } else {
        DBName = hasLogicalDatabases()
            ? `(select DATABASE_ID from V$DATABASES WHERE NAME = '${sTableInfos[0]}')`
            : `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = '${sTableInfos[0]}')`;
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
    const sInterval = getInterval(IntervalType, IntervalValue);
    const sRollupMatch = sRollup && !sUseNumericBaseTime ? getRollupMatch(RollupList, sTableName, sInterval, colName.value, colName.jsonKey) : undefined;
    const sNanoSec = 1000000;
    let sStartTime = Start,
        sEndTime = End;
    const sCheckStartTime = Start?.toString()?.includes('.');
    const sCheckEndTime = End?.toString()?.includes('.');
    const sTimeRange = (End - Start) / 2;

    if (!sUseNumericBaseTime) {
        if (sCheckStartTime) sStartTime = Start * sNanoSec;
        if (sCheckEndTime) sEndTime = End * sNanoSec;
        if (Start.toString().length === 13) sStartTime = Start * sNanoSec - sTimeRange;
        if (End.toString().length === 13) sEndTime = End * sNanoSec + sTimeRange;
    }

    const getTimeBucketColumn = () => {
        const sInterval = getInterval(IntervalType, IntervalValue) * (sUseNumericBaseTime ? 1 : 1000000);
        if (!sInterval) return sTime;
        return `${sTime} / ${sInterval} * ${sInterval}`;
    };

    const getSourceMode = (): 'raw' | 'rollup' => {
        if (!sRollupMatch) return 'raw';
        if (CalculationMode === 'first' || CalculationMode === 'last') {
            return sRollupMatch.extType ? 'rollup' : 'raw';
        }
        return 'rollup';
    };

    const getMetric = (aSourceMode: 'raw' | 'rollup') => {
        const sBaseJsonRollupValue = aSourceMode === 'rollup' && CalculationMode !== 'cnt' ? getBaseJsonRollupValue(colName.value, colName.jsonKey, sRollupMatch) : undefined;
        if (sBaseJsonRollupValue) {
            return createJsonRollupAggregationMetric({
                aggregator: CalculationMode,
                outputAlias: 'VALUE',
                jsonColumn: sBaseJsonRollupValue.column,
                jsonPath: sBaseJsonRollupValue.path,
                timeExpression: sTime,
            });
        }

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
    const sOuterTimeExpression = sUseNumericBaseTime ? `mTime as time` : `to_timestamp(mTime) / 1000000.0 as time`;

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
        rawTimeExpression: sUseNumericBaseTime ? getTimeBucketColumn() : buildRawTimeExpression(sTime, IntervalType, IntervalValue),
        outerTimeExpression: sOuterTimeExpression,
        outerGroupBy: sUseNumericBaseTime ? 'GROUP BY mTime' : undefined,
        metrics: [getMetric(sSourceMode)],
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

    const sNameCol = colName.name;
    const sTimeCol = colName.time;
    const sValueCol = colName.jsonKey ? jsonValueFieldToNumericSql(colName.value, colName.jsonKey) : colName.value;
    const sUseNumericBaseTime = Boolean(colName?.timeBaseTime) && Number(colName?.timeType) !== DATETIME_COLUMN_TYPE;

    if (!sUseNumericBaseTime) {
        if (sCheckStartTime) sStartTime = Start * sNanoSec;
        if (sCheckEndTime) sEndTime = End * sNanoSec;
        if (Start.toString().length === 13) sStartTime = Start * sNanoSec - sTimeRange;
        if (End.toString().length === 13) sEndTime = End * sNanoSec + sTimeRange;
    }

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

    // const sTimeQ = `(${sTimeCol}/1000000)` + ' as date';
    const sTimeQ = (sUseNumericBaseTime ? sTimeCol : `to_timestamp(${sTimeCol}) / 1000000.0`) + ' as date';
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
    // v8.7 gave v$rollup a DATABASE_NAME column. The old shape reached into
    // V$STORAGE_MOUNT_DATABASES, which names only mounted backups — on v8.7 that join matches
    // nothing for an ordinary table and every root_table came back NULL.
    await ensureCurrentDatabase();
    let sUrl = hasLogicalDatabases()
        ? `select t1.user_name as user_name, 
    t1.database_name || '.' || t1.root_table as root_table, 
    t1.interval_time as interval_time, t1.column_name as column_name, t1.ext_type as ext_type 
  from (
    select v.database_name, u.name as user_name, root_table, interval_time, column_name, ext_type 
    from v$rollup as v, m$sys_users as u 
    where v.user_id = u.user_id 
    group by v.database_name, root_table, interval_time, user_name, column_name, ext_type 
  ) as t1 
  order by user_name, root_table asc, interval_time desc`
        : `select t1.user_name as user_name, 
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

    const sData = await executeQuery(sUrl);
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
            if (!sConvertArray[user][table][ROLLUP_EXT_TYPE_BY_COLUMN]) {
                sConvertArray[user][table][ROLLUP_EXT_TYPE_BY_COLUMN] = {};
            }
            if (!sConvertArray[user][table][ROLLUP_EXT_TYPE_BY_COLUMN][column]) {
                sConvertArray[user][table][ROLLUP_EXT_TYPE_BY_COLUMN][column] = [];
            }
            // exist ext_type = 1
            // noExist ext_type = 0
            sConvertArray[user][table]['EXT_TYPE'].push(ext_type);
            sConvertArray[user][table][ROLLUP_EXT_TYPE_BY_COLUMN][column].push(ext_type);
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

/**
 * The block time-extent reader for this tree, bound to its transports.
 *
 * Call this instead of branching on `isMountedTableName` at the call site — the branch needs the
 * database catalogue to have been fetched first, and this is where that await lives. See
 * `createBlockTimeMinMaxFetcher`.
 */
export const fetchBlockTimeMinMax = createBlockTimeMinMaxFetcher({ ensureCurrentDatabase, fetchTimeMinMax, fetchMountTimeMinMax });

export {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
    fetchRollupData,
    fetchTableName,
    fetchTags,
    fetchRollUp,
    fetchOnRollupTable,
    fetchData,
    postTerminalSize,
    getChartData,
    getChartMinMaxData,
    getTqlChart,
    getRollupTableList,
};
