import request from '@/api/core';

const getChartMinMaxData = async (aTable: string, aTag: string) => {
    return await request({
        method: 'GET',
        url: `/api/tables/${aTable}/tags/${aTag}/stat?timeformat=ns`,
    });
};
const getChartData = async (aTagTables: string, option: boolean, range: number, time: number) => {
    return await request({
        method: 'GET',
        url: `/api/chart?${aTagTables}&time=${time}&range=${range}s&format=${'json'}&timeformat=ns${option ? `&transform=${option}` : ''}`,
    });
};

const postTerminalSize = async (aTerminalId: number, aSize: any) => {
    await request({
        method: 'POST',
        url: `/api/term/${aTerminalId}/windowsize`,
        data: JSON.parse(JSON.stringify({ cols: aSize.cols, rows: aSize.rows })),
    });
};
const fetchData = async (aSql: string, aFormat: string, aTimezone: any, aLimit?: any) => {
    let sSql;
    if (aSql.toLowerCase().includes('select')) {
        if (aLimit) {
            sSql = aSql + ` LIMIT ${aLimit * 50 - 50},${50}`;
        } else {
            sSql = aSql;
        }
    } else {
        sSql = aSql;
    }

    return await request({
        method: 'GET',
        url: `/machbase?q=${encodeURIComponent(sSql)}&timeformat=${aFormat}&tz=${aTimezone}`,
    });
};
const fetchTableName = async (aTable: any) => {
    let DBName = '';
    if (aTable.indexOf('.') === -1) DBName = String(-1);
    else DBName = `(select BACKUP_TBSID from V$STORAGE_MOUNT_DATABASES WHERE MOUNTDB = 'MOUNTDB')`;
    const sSql = `SELECT MC.NAME AS NM, MC.TYPE AS TP FROM M$SYS_TABLES MT, M$SYS_COLUMNS MC WHERE MT.DATABASE_ID = MC.DATABASE_ID AND MT.ID = MC.TABLE_ID AND MC.DATABASE_ID = ${DBName} AND MT.NAME = '${aTable}' AND MC.NAME <> '_RID' ORDER BY MC.ID`;

    const queryString = `/machbase?q=${sSql}`;

    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }

    return sData;
};

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue, Rollup, colName } = params;

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
        sOnedayOversize = 'to_char(mTime)';
    } else {
        sTimeCalc = IntervalValue + IntervalType;
        sOnedayOversize = 'to_char(mTime)';
    }

    if (CalculationMode === 'sum' || CalculationMode === 'min' || CalculationMode === 'max') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;

        if (!Rollup) {
            sCol = `DATE_TRUNC('${IntervalType}', ${sTime}, ${IntervalValue})`;
        }

        sSubQuery = `select ${sCol} as mTime, ${CalculationMode}(${sValue}) as mValue from ${Table} where ${sName} in ('${TagNames}') and ${sTime} between to_date('${Start}') and to_date('${End}') group by mTime`;
        sMainQuery = `select ${sOnedayOversize} as time, ${CalculationMode}(mvalue) as value from (${sSubQuery}) Group by ${sTime} order by ${sTime}  LIMIT ${Count * 1}`;
    }
    if (CalculationMode === 'avg') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;
        if (!Rollup) {
            sCol = `${sTime} / (${IntervalValue} * ${sRollupValue} * 1000000000) * (${IntervalValue} * ${sRollupValue} * 1000000000)`;
        }
        sSubQuery = `select ${sCol} as mtime, sum(${sValue}) as SUMMVAL, count(${sValue}) as CNTMVAL from ${Table} where ${sName} in ('${TagNames}') and ${sTime} between to_date('${Start}') and to_date('${End}') group by mTime`;
        sMainQuery = `SELECT ${sOnedayOversize} AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by ${sTime} order by ${sTime} LIMIT ${Count * 1}`;
    }

    if (CalculationMode === 'cnt') {
        let sCol = `${sTime} rollup ${sTimeCalc}`;
        if (!Rollup) {
            sCol = `${sTime} / (${IntervalValue} * ${sRollupValue} * 1000000000) * (${IntervalValue} * ${sRollupValue} * 1000000000)`;
        }

        sSubQuery = `select ${sCol} as mtime, count(${sValue}) as mValue from ${Table} where ${sName} in ('${TagNames}') and ${sTime} between to_date('${Start}') and to_date('${End}') group by mTime`;
        sMainQuery = `SELECT ${sOnedayOversize} AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by ${sTime} order by ${sTime} LIMIT ${Count * 1}`;
    }

    const queryString = `/machbase?q=${sMainQuery}`;

    const sData = await request({
        method: 'GET',
        url: encodeURI(queryString),
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }

    return sData;
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count, colName } = params;

    let sStart = '';
    let sEnd = '';
    let sOrderBy = '';

    if (Start.length < 19) {
        sStart = Start.substring(0, 10) + ' 00:00:00 000:000:000';
    } else if (Start.length < 22) {
        sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' 000:000:000';
    } else {
        sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' ' + Start.substring(20, 23) + ':000:000';
    }

    if (End.length < 19) {
        sEnd = End.substring(0, 10) + ' 23:59:59 999:999:999';
    } else if (End.length < 22) {
        sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' 000:000:000';
    } else {
        sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' ' + End.substring(20, 23) + ':000:000';
    }

    if (Direction == 1) {
        sOrderBy = '1 desc';
    } else if (Direction == 2) {
        sOrderBy = '1';
    }

    const sNameCol = colName.name;
    const sTimeCol = colName.time;
    const sValueCol = colName.value;

    const sTimeQ = `TO_CHAR(${sTimeCol})` + ' as date';
    const sValueQ = sValueCol + ' as value';

    let sQuery = `SELECT ${sTimeQ}, ${sValueQ} FROM ${Table} WHERE ${sNameCol} = '${TagNames}' AND ${sTimeCol} BETWEEN TO_DATE('${sStart}') AND TO_DATE('${sEnd}')`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }
    if (Count > 0) {
        sQuery = sQuery + ' LIMIT ' + Count;
    }

    const queryString = `/machbase?q=${sQuery}&timeformat=ns`;

    const sData = await request({
        method: 'GET',
        url: queryString,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }

    return sData;
};

const fetchRangeData = async (Table: string, TagNames: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=SELECT TO_CHAR(min(time)) as MIN, TO_CHAR(max(time)) as MAX FROM ${Table} WHERE name = '${TagNames}'`,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
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
        alert(sData.data.reason);
    }
    return sData;
};

const fetchTablesData = async () => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=SELECT decode(s.DBID, -1, s.NAME, m.MOUNTDB || '.' || s.OWNER || ',' || s.NAME) AS name FROM (SELECT t.NAME AS name, u.NAME AS owner, t.DATABASE_ID AS dbid FROM m$sys_tables t, m$sys_users u WHERE t.USER_ID = u.USER_ID AND t.TYPE = 6 ORDER BY dbid, name) s LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES m ON s.DBID = m.BACKUP_TBSID ORDER BY name`,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }
    return sData;
};

const fetchTags = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=select name from _${table}_META order by name`,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }
    return sData;
};
const fetchRollUp = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machiot/rollup/${table}`,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }
    return sData;
};

const fetchOnMinMaxTable = async (table: string, tagName: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=select to_char(min(min_time)),to_char(max(max_time)) from v$${table}_stat where name = '${tagName}'`,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }
    return sData;
};
const fetchOnRollupTable = async (table: string) => {
    const sData = await request({
        method: 'GET',
        url: `/machbase?q=select * from v$rollup where root_table = '${table}' and ENABLED = 1 `,
    });
    if (sData.status >= 400) {
        alert(sData.data.reason);
    }
    return sData;
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
};
