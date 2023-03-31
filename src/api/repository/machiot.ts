import request from '@/api/core';

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue } = params;

    const sTime = 'Time';
    const sName = 'Name';
    const sValue = 'Value';
    let sSubQuery = '';
    let sMainQuery = '';

    if (CalculationMode === 'sum' || CalculationMode === 'min' || CalculationMode === 'max') {
        sSubQuery = `select to_char(${sTime} rollup ${IntervalValue}${IntervalType}) as mTime, ${CalculationMode}(${sValue}) as mValue from ${Table} where ${sName} in ('${TagNames}') and ${sTime} between to_date('${Start}') and to_date('${End}') group by mTime`;
        sMainQuery = `select mTime as time, ${CalculationMode}(mvalue) as value from (${sSubQuery}) Group by ${sTime} order by ${sTime}  LIMIT ${Count * 1}`;
    }
    if (CalculationMode === 'avg') {
        sSubQuery = `select to_char(${sTime} rollup ${IntervalValue}${IntervalType}) as mtime, sum(${sValue}) as SUMMVAL, count(${sValue}) as CNTMVAL from ${Table} where ${sName} in ('${TagNames}') and ${sTime} between to_date('${Start}') and to_date('${End}') group by mTime`;
        sMainQuery = `SELECT MTIME AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by ${sTime} order by ${sTime} LIMIT ${Count * 1}`;
    }

    if (CalculationMode === 'cnt') {
        sMainQuery = `SELECT to_char(LAST(${sTime}, ${sTime})) AS time, Count(*) AS value FROM ${Table} WHERE ${sName} = '${TagNames}' AND ${sTime} BETWEEN TO_DATE('${Start}') AND TO_DATE('${End}')`;
    }

    // const sMultiTagCount = 1;
    // let sStart = '';
    // let sEnd = '';
    // let sTimeCalc = '';
    // let sHint = '';
    // let sHintType = '';

    // if (IntervalType.toUpperCase() == 'DAY') {
    //     sHintType = 'hour';
    // } else {
    //     sHintType = IntervalType;
    // }
    // let sMode = CalculationMode;
    // if (CalculationMode == 'total') {
    //     sMode = 'sum';
    // }
    // if (Start.length < 19) {
    //     sStart = Start.substring(0, 10) + ' 00:00:00 000:000:000';
    // } else {
    //     sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' 000:000:000';
    // }
    // if (End.length < 19) {
    //     sEnd = End.substring(0, 10) + ' 23:59:59 999:999:999';
    // } else {
    //     sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' 999:999:999';
    // }

    // const sNameCol = 'Name';
    // const sTimeCol = 'Time';
    // const sValueCol = 'Value';

    // if (IntervalValue == 1 && IntervalType != 'day') {
    //     sTimeCalc = sTimeCol;
    // } else {
    //     if (IntervalType == 'min' || IntervalType == 'minute') {
    //         sTimeCalc = "DATE_TRUNC('minute', " + sTimeCol + ', ' + String(IntervalValue) + ')';
    //     } else if (IntervalType == 'hour') {
    //         sTimeCalc = "DATE_TRUNC('hour', " + sTimeCol + ', ' + String(IntervalValue) + ')';
    //     } else if (IntervalType == 'day') {
    //         if (IntervalValue <= 1) {
    //             sTimeCalc = "DATE_TRUNC('day', " + sTimeCol + ', ' + String(IntervalValue) + ')';
    //         } else {
    //             sTimeCalc = sTimeCol + '/' + String(IntervalValue * 86400) + '000000000 * ' + String(IntervalValue * 86400) + '000000000'; // 86400 = 60*60*24
    //         }
    //     } else {
    //         //elif IntervalType == 'sec' or IntervalType == 'second':
    //         sTimeCalc = "DATE_TRUNC('second', " + sTimeCol + ', ' + String(IntervalValue) + ')';
    //     }
    // }

    // sHint = '/*%2B ROLLUP(' + Table + ', ' + sHintType + ', ' + sMode + ') */ ' + sTimeCol;
    // const sCalcCol = sMode + '(' + sValueCol + ')';

    // const sInlineQuery = `SELECT ${sHint}, ${sValueCol} FROM ${Table} WHERE ${sNameCol} = '${TagNames}' AND ${sTimeCol} BETWEEN TO_DATE('${sStart}') AND TO_DATE('${sEnd}')`;

    // let sQuery = `SELECT TO_CHAR(${sTimeCalc}) as date, ${sCalcCol} as value FROM (${sInlineQuery}) GROUP BY date ORDER BY 1`;

    // if (Count > 0) {
    //     sQuery = sQuery + ' LIMIT ' + String(Count * sMultiTagCount);
    // }
    const queryString = `/machbase?q=${sMainQuery}`;

    return await request({
        method: 'GET',
        url: queryString,
    });
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count } = params;

    let sStart = '';
    let sEnd = '';
    let sOrderBy = '';

    if (Start.length < 19) {
        sStart = Start.substring(0, 10) + ' 00:00:00 000:000:000';
    } else if (Start.length < 22) {
        sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + ' 000:000:000';
    } else {
        sStart = Start.substring(0, 10) + ' ' + Start.substring(11, 19) + Start.substring(20, 23) + ' 000:000:000';
    }

    if (End.length < 19) {
        sEnd = End.substring(0, 10) + ' 23:59:59 999:999:999';
    } else if (End.length < 22) {
        sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + ' 000:000:000';
    } else {
        sEnd = End.substring(0, 10) + ' ' + End.substring(11, 19) + End.substring(20, 23) + ' 000:000:000';
    }

    if (Direction == 1) {
        sOrderBy = '1 desc';
    } else if (Direction == 2) {
        sOrderBy = '1';
    }

    const sNameCol = 'Name';
    const sTimeCol = 'Time';
    const sValueCol = 'Value';

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
    return await request({
        method: 'GET',
        url: queryString,
    });
};

const fetchRangeData = async (Table: string, TagNames: string) => {
    return await request({
        method: 'GET',
        url: `/machbase?q=SELECT TO_CHAR(min(time)) as MIN, TO_CHAR(max(time)) as MAX FROM ${Table} WHERE name = '${TagNames}'`,
    });
};

const fetchRollupData = async (params: any) => {
    const { Table } = params;
    return await request({
        method: 'GET',
        url: `/machiot/rollup`,
        data: {
            Table,
        },
    });
};

const fetchTablesData = async () => {
    return await request({
        method: 'GET',
        url: `/machbase?q=SELECT decode(s.DBID, -1, s.NAME, m.MOUNTDB || '.' || s.OWNER || ',' || s.NAME) AS name FROM (SELECT t.NAME AS name, u.NAME AS owner, t.DATABASE_ID AS dbid FROM m$sys_tables t, m$sys_users u WHERE t.USER_ID = u.USER_ID AND t.TYPE = 6 ORDER BY dbid, name) s LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES m ON s.DBID = m.BACKUP_TBSID ORDER BY name`,
    });
};

const fetchTags = async (table: string) => {
    return await request({
        method: 'GET',
        url: `/machbase?q=select name from _${table}_META order by name`,
    });
};
const fetchRollUp = async (table: string) => {
    return await request({
        method: 'GET',
        url: `/machiot/rollup/${table}`,
    });
};

export { fetchCalculationData, fetchRawData, fetchTablesData, fetchRollupData, fetchRangeData, fetchTags, fetchRollUp };
