import request from '@/api/core';

const fetchCalculationData = async (params: any) => {
    const { Table, TagNames, Start, End, CalculationMode, Count, IntervalType, IntervalValue } = params;
    const queryString = `/machiot/datapoints/calculated/${Table}/${TagNames}/${Start}/${End}/${CalculationMode}/${Count}/${IntervalType}/${IntervalValue}`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};

const fetchRawData = async (params: any) => {
    const { Table, TagNames, Start, End, Direction, Count } = params;
    const queryString = `/machiot/datapoints/raw/${Table}/${TagNames}/${Start}/${End}/${Direction}/${Count}/${0}/`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};

const fetchRangeData = async (Table: string, TagNames: string) => {
    return await request({
        method: 'GET',
        url: `/machiot/tags/range/${Table}/${TagNames}`,
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
        url: `/machiot/tags/list/${table}`,
    });
};
const fetchRollUp = async (table: string) => {
    return await request({
        method: 'GET',
        url: `/machiot/rollup/${table}`,
    });
};

export { fetchCalculationData, fetchRawData, fetchTablesData, fetchRollupData, fetchRangeData, fetchTags, fetchRollUp };
