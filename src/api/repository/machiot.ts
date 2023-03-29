import request from '@/api/core';

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue } = params;

    const sMultiTagCount = 1;
    let sStart = '';
    let sEnd = '';
    let sTimeCalc = '';
    let sHint = '';
    let sHintType = '';

    if (IntervalType.toUpperCase() == 'DAY') {
        sHintType = 'hour';
    } else {
        sHintType = IntervalType;
    }
    let sMode = CalculationMode;
    if (CalculationMode == 'total') {
        sMode = 'sum';
    }
    console.log(Start);
    if (Start.length < 19) {
        sStart = Start.substr(0, 10) + ' 00:00:00 000:000:000';
    } else {
        sStart = Start.substr(0, 10) + ' ' + Start.substr(11, 19) + ' 000:000:000';
    }
    if (End.length < 19) {
        sEnd = End.substr(0, 10) + ' 23:59:59 999:999:999';
    } else {
        sEnd = End.substr(0, 10) + ' ' + End.substr(11, 19) + ' 999:999:999';
    }

    const sNameCol = 'Name';
    const sTimeCol = 'Time';
    const sValueCol = 'Value';

    if (IntervalValue == 1 && IntervalType != 'day') {
        sTimeCalc = sTimeCol;
    } else {
        if (IntervalType == 'min' || IntervalType == 'minute') {
            sTimeCalc = "DATE_TRUNC('minute', " + sTimeCol + ', ' + String(IntervalValue) + ')';
        } else if (IntervalType == 'hour') {
            sTimeCalc = "DATE_TRUNC('hour', " + sTimeCol + ', ' + String(IntervalValue) + ')';
        } else if (IntervalType == 'day') {
            if (IntervalValue <= 1) {
                sTimeCalc = "DATE_TRUNC('day', " + sTimeCol + ', ' + String(IntervalValue) + ')';
            } else {
                sTimeCalc = sTimeCol + '/' + String(IntervalValue * 86400) + '000000000 * ' + String(IntervalValue * 86400) + '000000000'; // 86400 = 60*60*24
            }
        } else {
            //elif IntervalType == 'sec' or IntervalType == 'second':
            sTimeCalc = "DATE_TRUNC('second', " + sTimeCol + ', ' + String(IntervalValue) + ')';
        }
    }

    sHint = '/*+ ROLLUP(' + Table + ', ' + sHintType + ', ' + sMode + ') */ ' + sTimeCol;
    const sCalcCol = sMode + '(' + sValueCol + ')';

    const sInlineQuery = `SELECT ${sHint}, ${sValueCol} FROM ${Table} WHERE ${sNameCol} = '${TagNames}' AND ${sTimeCol} BETWEEN TO_DATE('${sStart}') AND TO_DATE('${sStart}')`;
    let sQuery = `SELECT ${sTimeCalc} as date, ${sCalcCol} as value FROM (${sInlineQuery}) GROUP BY date ORDER BY 1`;

    if (Count > 0) {
        sQuery = sQuery + ' LIMIT ' + String(Count * sMultiTagCount);
    }
    const queryString = `/machbase?q=${sQuery}`;

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
        sStart = Start.substr(0, 10) + ' 00:00:00 000:000:000';
    } else if (Start.length < 22) {
        sStart = Start.substr(0, 10) + ' ' + Start.substr(11, 19) + ' 000:000:000';
    } else {
        sStart = Start.substr(0, 10) + ' ' + Start.substr(11, 19) + Start.substr(20, 23) + ' 000:000:000';
    }
    if (End.length < 19) {
        sEnd = End.substr(0, 10) + ' 23:59:59 999:999:999';
    } else if (End.length < 22) {
        sEnd = End.substr(0, 10) + ' ' + End.substr(11, 19) + ' 000:000:000';
    } else {
        sEnd = End.substr(0, 10) + ' ' + End.substr(11, 19) + End.substr(20, 23) + ' 000:000:000';
    }

    if (Direction == 1) {
        sOrderBy = '1 desc';
    } else if (Direction == 2) {
        sOrderBy = '1';
    }

    const sNameCol = 'Name';
    const sTimeCol = 'Time';
    const sValueCol = 'Value';

    const sTimeQ = sTimeCol + ' as date';
    const sValueQ = sValueCol + ' as value';

    let sQuery = `SELECT ${sTimeQ}, ${sValueQ} FROM ${Table} WHERE ${sNameCol} = '${TagNames}' AND ${sTimeCol} BETWEEN TO_DATE('${sStart}') AND TO_DATE('${sEnd}')`;

    if (sOrderBy !== '') {
        sQuery = sQuery + ' ORDER BY ' + sOrderBy;
    }
    if (Count > 0) {
        sQuery = sQuery + ' LIMIT ' + Count;
    }

    const queryString = `/machbase?q=${sQuery}`;
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
