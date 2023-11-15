import request from '@/api/core';
import { Error } from '@/components/toast/Toast';
import { decodeJwt } from '@/utils';
import { ADMIN_ID } from '@/utils/constants';
// import { getTimeZoneValue } from '@/utils/utils';

const getTqlChart = (aData: string) => {
    return request({
        method: 'POST',
        url: `/api/tql`,
        data: aData,
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
    let sUserName = ADMIN_ID;
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
    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC, M$SYS_USERS MU WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MT.USER_ID = MU.USER_ID AND MU.NAME = UPPER('${sUserName}') AND MC.DATABASE_ID = ${DBName} AND MT.NAME = '${sTableName}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const queryString = `/machbase?q=${sSql}`;

    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });

    return sData;
};

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue, Rollup, colName } = params;

    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub.toUpperCase();
    const sTableName = sCurrentUserName === ADMIN_ID ? Table : Table.split('.').length === 1 ? sCurrentUserName + '.' + Table : Table;
    const sName = colName.name;
    const sTime = colName.time;
    const sValue = colName.value;

    let sSubQuery = '';
    let sMainQuery = '';
    let sTimeCalc = '';
    let sOnedayOversize = '';
    let sRollupValue = 0;

    if (Rollup && IntervalType == 'day' && IntervalValue > 1) {
        sTimeCalc = '1hour';
        sOnedayOversize = `to_char(mTime / ${IntervalValue * 60 * 60 * 24 * 1000000000}  * ${IntervalValue * 60 * 60 * 24 * 1000000000})`;
    } else if (!Rollup) {
        if (IntervalType === 'sec') {
            sRollupValue = 1;
        } else if (IntervalType === 'min') {
            sRollupValue = 60;
        } else if (IntervalType === 'hour') {
            sRollupValue = 3600;
        }
        sTimeCalc = IntervalValue + IntervalType;
        sOnedayOversize = '(mTime)';
    } else {
        sTimeCalc = IntervalValue + IntervalType;
        sOnedayOversize = '(mTime)';
    }

    if (CalculationMode === 'sum' || CalculationMode === 'min' || CalculationMode === 'max') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;

        if (!Rollup) {
            sCol = `DATE_TRUNC('${IntervalType}', ${sTime}, ${IntervalValue})`;
        }

        sSubQuery = `select ${sCol} as mTime, ${CalculationMode}(${sValue}) as mValue from ${sTableName} where ${sName} in ('${TagNames}') and ${sTime} between ${Start}000000 and ${End}000000 group by mTime`;
        sMainQuery = `select to_timestamp(${sOnedayOversize}/1000000) as time, ${CalculationMode}(mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${
            Count * 1
        }`;
    }
    if (CalculationMode === 'avg') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;
        if (!Rollup) {
            sCol = `${sTime} / (${IntervalValue} * ${sRollupValue} * 1000000000) * (${IntervalValue} * ${sRollupValue} * 1000000000)`;
        }
        sSubQuery = `select ${sCol} as mTime, sum(${sValue}) as SUMMVAL, count(${sValue}) as CNTMVAL from ${sTableName} where ${sName} in ('${TagNames}') and ${sTime} between ${Start}000000 and ${End}000000 group by mTime`;
        sMainQuery = `SELECT to_timestamp(${sOnedayOversize})/1000000 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${
            Count * 1
        }`;
    }

    if (CalculationMode === 'cnt') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;
        if (!Rollup) {
            sCol = `${sTime} / (${IntervalValue} * ${sRollupValue} * 1000000000) * (${IntervalValue} * ${sRollupValue} * 1000000000)`;
        }

        sSubQuery = `select ${sCol} as mTime, count(${sValue}) as mValue from ${sTableName} where ${sName} in ('${TagNames}') and ${sTime} between ${Start}000000 and ${End}000000 group by mTime`;
        sMainQuery = `SELECT to_timestamp(${sOnedayOversize}/1000000) AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${Count * 1}`;
    }

    // UTC+${-1 * (getTimeZoneValue() / 60)}
    // const sTimezone = String(-1 * (getTimeZoneValue() / 60));
    // sTimezone
    const queryString = `/machbase?q=${encodeURIComponent(sMainQuery)}`;

    const sData = await request({
        method: 'GET',
        url: queryString,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    return sData;
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count, colName, sampleValue } = params;

    let sOrderBy = '';
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
    const sValueCol = colName.value;

    const sTimeQ = `(${sTimeCol}/1000000)` + ' as date';
    const sValueQ = sValueCol + ' as value';

    let sQuery = `SELECT ${sampleValue ? '/*+ SAMPLING(' + sampleValue + ') */' : ''} ${sTimeQ}, ${sValueQ} FROM ${Table} WHERE ${sNameCol} = '${encodeURIComponent(
        TagNames
    )}' AND ${sTimeCol} BETWEEN ${Start}000000 AND ${End}000000`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }
    if (Count > 0) {
        if (sampleValue) {
            sQuery = sQuery + ' LIMIT ' + 50000;
        } else {
            sQuery = sQuery + ' LIMIT ' + Count;
        }
    }

    const queryString = `/machbase?q=${encodeURIComponent(sQuery)}&timeformat=ns`;

    const sData = await request({
        method: 'GET',
        url: queryString,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }

    return sData;
};

const fetchRangeData = async (Table: string, TagNames: string, time: string) => {
    const sCurrentUserName = decodeJwt(JSON.stringify(localStorage.getItem('accessToken'))).sub.toUpperCase();
    const sTableName = sCurrentUserName === ADMIN_ID ? Table : Table.split('.').length === 1 ? sCurrentUserName + '.' + Table : Table;
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=` + encodeURIComponent(`SELECT (min(${time})) as MIN, (max(${time})) as MAX FROM ${sTableName} WHERE name = '${TagNames}'`),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    return sData;
};

const fetchOnMinMaxTable = async (table: string, userName: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=` + encodeURIComponent(`select MIN(min_time), MAX(max_time) from ${userName}.v$${table}_stat`),
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    return sData;
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
            Error(sData.data.reason);
        } else {
            Error(sData.data);
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
            Error(sData.data.reason);
        } else {
            Error(sData.data);
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
            Error(sData.data.reason);
        } else {
            Error(sData.data);
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
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    return sData;
};
const fetchOnRollupTable = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=select * from v$rollup where root_table = '${table}' and ENABLED = 1 `,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    return sData;
};
const getRollupTableList = async () => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=select u.name as user_name, root_table, interval_time from v$rollup as v, m$sys_users as u where v.user_id = u.user_id group by root_table, interval_time, user_name order by root_table asc, interval_time desc`,
    });
    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Error(sData.data.reason);
        } else {
            Error(sData.data);
        }
    }
    const sConvertArray: any = {};
    if (sData.data.rows && sData.data.rows.length > 0) {
        for (const [user, table, value] of sData.data.rows) {
            if (!sConvertArray[user]) {
                sConvertArray[user] = {};
            }
            if (!sConvertArray[user][table]) {
                sConvertArray[user][table] = [];
            }
            sConvertArray[user][table].push(value);
        }

        return sConvertArray;
    } else {
        return [];
    }
};

export {
    fetchCalculationData,
    fetchRawData,
    fetchTablesData,
    fetchRollupData,
    fetchRangeData,
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
