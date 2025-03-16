import request from '@/api/core';
import { getUserName } from '@/utils';

const normalizePath = (path: string) => path.replace(/[\\/]+/g, '/');

const getFileList = (aFilter: string, aDir: string, aName: string) => {
    return request({
        method: 'GET',
        url: normalizePath(`/api/files/${aDir}${aName ? '/' + aName : ''}${aFilter}`),
    });
};
const getReferenceList = () => {
    return request({
        method: 'GET',
        url: `/api/refs`,
    });
};

const postMd = async (aData: string, aIsDark: boolean, referer?: string) => {
    let sData: any = {
        method: 'POST',
        url: `/api/md?darkMode=${aIsDark}`,
        data: aData,
    };
    if (referer) {
        sData = { ...sData, headers: { 'X-Referer': window.btoa(unescape(encodeURIComponent(referer))) } };
    }
    return request(sData);
};

const postFileList = (aContents: any, aDir: string, aFileName: string) => {
    return request({
        method: 'POST',
        url: normalizePath(`/api/files/${aDir}/${aFileName}`),
        data: aContents,
    });
};
const deleteFileList = (aDir: string, aFileName: string) => {
    return request({
        method: 'DELETE',
        url: normalizePath(`/api/files/${aDir}/${aFileName}`),
    });
};

const getLicense = () => {
    return request({
        method: 'GET',
        url: `/api/license`,
    });
};

const postLicense = (aItem: any) => {
    return request({
        method: 'post',
        url: `/api/license`,
        data: aItem,
    });
};
/** EULA */
export const apiGetEula = () => {
    return request({
        method: 'GET',
        url: `/api/license/eula`,
    });
};
/** EULA Accept */
export const apiPostEulaAccept = () => {
    return request({
        method: 'POST',
        url: `/api/license/eula`,
    });
};
export interface MOUNTED_DB {
    backupBeginTime: string;
    backupEndTime: string;
    dbBeginTime: string;
    dbEndTime: string;
    flag: number;
    mountdb: string;
    name: string;
    path: string;
    scn: number;
    tbsid: number;
}
export const getMountedList = async () => {
    return await request({
        method: 'GET',
        url: '/api/backup/mounts',
    });
};
export const getBackupDBList = async () => {
    return await request({
        method: 'GET',
        url: '/api/backup/archives',
    });
};
const getTableList = async () => {
    const U_NAME = getUserName();
    let queryString;
    if (U_NAME !== 'sys')
        queryString = `/api/query?q=SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID , '' as priv  from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID and u.NAME = '${U_NAME?.toUpperCase()}' order by j.NAME union all SELECT dl.*, ua.priv from M$SYS_USER_ACCESS ua, (SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID  when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID) dl WHERE ua.TABLE_NAME = dl.DB_NAME || '.' || dl.USER_NAME || '.' || dl.TABLE_NAME and ua.USER_NAME = '${U_NAME?.toUpperCase()}' order by dl.TABLE_NAME`;
    else
        queryString = `/api/query?q=SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID, '' as priv from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID  when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID order by j.NAME`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
const getTableInfo = async (aDataBaseId: string, aTableId: string) => {
    const queryString = `/api/query?q=select name, type, length, id from M$SYS_COLUMNS where table_id = ${aTableId} and database_id = ${aDataBaseId} order by id`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
export const getVirtualTableInfo = async (aDataBaseId: string, aTableName: string, aUserName: string) => {
    const queryString = `/api/query?q=select * from v$columns WHERE DATABASE_ID = ${aDataBaseId} AND ID > 0 AND ID < 65534 AND TABLE_ID = (select ID from v$tables where name = '${aTableName}' and user_ID = (select USER_ID from M$sys_users where name = '${aUserName}')) ORDER BY ID`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
const getColumnIndexInfo = async (aDataBaseId: string, aTableId: string) => {
    const queryString = `/api/query?q=select c.name as col_name, i.name as index_name, i.type as index_type from m$sys_index_columns c inner join m$sys_indexes i on c.database_id=i.database_id and c.table_id=i.table_id and c.index_id=i.id where c.database_id=${aDataBaseId} and c.table_id=${aTableId}`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
const getRollupTable = async (aTableName: string, aUserName: string) => {
    // select root_table, interval_time, rollup_table, enabled, m.name as user_name from v$rollup as v, m$sys_users as m where v.user_id=m.user_id and m.name='${aUserName}' and root_table='${aTableName}' group by user_name, root_table, enabled, interval_time, rollup_table order by interval_time asc;
    const queryString = `/api/query?q=select root_table, interval_time, rollup_table, enabled, m.name as user_name from v$rollup as v, m$sys_users as m where v.user_id=m.user_id and m.name='${aUserName}' and root_table='${aTableName}' group by user_name, root_table, enabled, interval_time, rollup_table order by interval_time asc`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
export const getRecordCount = (aTableName: string, aUserName: string) => {
    const queryString = `/api/query?q=select count(*) from ${aUserName}.${aTableName}`;
    return request({
        method: 'GET',
        url: queryString,
    });
};
const getTutorial = (aUrl: any) => {
    return request({
        method: 'get',
        url: aUrl,
    });
};

const copyShell = (aId: string) => {
    return request({
        method: 'get',
        url: `/api/shell/${aId}/copy`,
    });
};
const removeShell = (aId: string) => {
    return request({
        method: 'delete',
        url: `/api/shell/${aId}`,
    });
};
const postShell = (aInfo: any) => {
    return request({
        method: 'post',
        url: `/api/shell/${aInfo.id}`,
        data: aInfo,
    });
};
// DATABASE
export const mountDB = (name: string, path: string) => {
    return request({
        method: 'POST',
        url: `/api/backup/mounts/${name}`,
        data: { path },
    });
};
export const unMountDB = (name: string) => {
    return request({
        method: 'DELETE',
        url: `/api/backup/mounts/${name}`,
    });
};
export const backupDBList = () => {
    return request({
        method: 'GET',
        url: `/api/backup/archives`,
    });
};
export const backupStatus = () => {
    return request({
        method: 'GET',
        url: `/api/backup/archive/status`,
    });
};
/**
 * BACKUP
 * Full backup: Backup of entire data
 * Incremental backup: Backup of the data added after the full or previous incremental backup
 * Time Duration backup: Backup of data for a specific period
 * @returns
 */
export const databaseBackup = (backupInfo: { type: string; duration: { type: string; after: string; from: string; to: string }; path: string }) => {
    return request({
        method: 'POST',
        url: `/api/backup/archive`,
        data: backupInfo,
    });
};
/** GET TABLE (LOG | TAG) */
export const getAllowBackupTable = () => {
    return request({
        method: 'POST',
        url: '/api/query',
        data: {
            q: `SELECT u.USER_ID, u.NAME as USER_NAME, m.ID as TABLE_ID, decode(u.name, 'SYS', m.NAME, u.name || '.' || m.NAME) as TABLE_NAME, m.TYPE as TABLE_TYPE, decode(u.name, 'SYS',  ' ', u.name) as un from M$SYS_USERS u, (select * from M$SYS_TABLES where database_id = -1 and flag = 0 and type in (0,6)) as m where u.USER_ID = m.USER_ID order by un, m.NAME`,
        },
    });
};
/** POST SPLITTER */
export const postSplitter = (txt: string) => {
    return request({
        method: 'POST',
        url: '/api/splitter/sql',
        data: txt,
    });
};

export {
    getColumnIndexInfo,
    getRollupTable,
    getFileList,
    postFileList,
    getLicense,
    getTableList,
    postLicense,
    deleteFileList,
    getReferenceList,
    getTutorial,
    postMd,
    copyShell,
    removeShell,
    postShell,
    getTableInfo,
};
