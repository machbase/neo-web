import request from '@/api/core';
import { rpcCall, RpcMethod } from '@/api/repository/rpc';
import { getUserName, isCurUserEqualAdmin } from '@/utils';

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
    if (!isCurUserEqualAdmin())
        queryString = `/api/query?q=SELECT case a.DATABASE_ID when -1 then 'MACHBASEDB' end as DB_NAME, u.name as USER_NAME, a.ID as TABLE_ID, a.NAME as TABLE_NAME, a.TYPE as TABLE_TYPE, a.FLAG as TABLE_FLAG, a.DATABASE_ID as DBID , '' as priv from M$SYS_TABLES a left join m$sys_users u on u.user_id=a.user_id where u.name='${U_NAME.toUpperCase()}' and a.database_id=-1 union all SELECT dl.*, ua.priv from M$SYS_USER_ACCESS ua, (SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID  when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID) dl WHERE ua.TABLE_NAME = dl.DB_NAME || '.' || dl.USER_NAME || '.' || dl.TABLE_NAME AND dl.USER_NAME <> '${U_NAME?.toUpperCase()}' and ua.USER_NAME = '${U_NAME?.toUpperCase()}' order by dl.TABLE_NAME`;
    else
        queryString = `/api/query?q=SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID, '' as priv from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID  when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID order by j.NAME`;
    return await request({
        method: 'GET',
        url: queryString,
    });
};
const getTableInfo = async (aDataBaseId: string, aTableId: string) => {
    const queryString = `/api/query?q=select name, type, length, id, flag from M$SYS_COLUMNS where table_id = ${aTableId} and database_id = ${aDataBaseId} order by id`;
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

// Copy shell — stays on REST. There is no `shell.copy` RPC, and the only RPC create primitive
// `shell.add(name, command)` takes just name+command (no theme/icon) and always mints a new id, so an
// RPC copy would drop the source's theme/icon. Keep GET /api/shell/:id/copy until the backend adds
// shell.copy (or shell.add gains style fields).
const copyShell = (aId: string) => {
    return request({
        method: 'get',
        url: `/api/shell/${aId}/copy`,
    });
};
// Remove shell — `shell.delete(id)` (params: [id]). Adapts the RPC error|null into the { success }
// envelope the caller (ShellManage) checks.
const removeShell = async (aId: string) => {
    try {
        const res = await rpcCall(RpcMethod.shell.delete, [aId]);
        const msg = res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;
        return msg ? { success: false, reason: msg, statusText: msg } : { success: true, reason: 'success' };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, reason: msg, statusText: msg };
    }
};
// Update shell — stays on REST. There is no `shell.update` RPC; `shell.add` only *creates* (new id) and
// can't carry theme/icon, so it cannot express an in-place update of an existing shell. Keep
// POST /api/shell/:id until the backend adds shell.update. (Same kept-on-REST policy as timer.ts modTimer.)
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
/** POST SPLITTER — migrated to the `sql.split` RPC (HTTP) (#1334). The return shape
 *  {success, data:{statements}} is kept so call sites (sql/index.tsx, WorkSheetEditor.tsx)
 *  need no changes. AbortSignal is passed through to callHttpRpc. */
export const postSplitter = async (txt: string, signal?: AbortSignal) => {
    try {
        const res = await rpcCall<any[]>(RpcMethod.sql.split, [txt], signal);
        if (res?.error) return { success: false, reason: res.error.message, elapse: '', data: { statements: undefined } };
        return { success: true, reason: 'success', elapse: '', data: { statements: res?.result ?? [] } };
    } catch (e) {
        return { success: false, reason: e instanceof Error ? e.message : String(e), elapse: '', data: { statements: undefined } };
    }
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
