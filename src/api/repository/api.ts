import request from '@/api/core';
import { rpcCall, RpcMethod } from '@/api/repository/rpc';
import { getUserName, isCurUserEqualAdmin } from '@/utils';
import { ensureCurrentDatabase } from '@/api/repository/currentDatabase';
import { fetchQuery } from '@/api/repository/database';
import { findDatabaseByName, LEGACY_DATABASE } from '@/utils/currentDatabaseState';
import { DATABASE_PERMISSION } from '@/components/side/DBExplorer/utils';
import type { BackupRequest } from '@/components/database/backup/backupPayload';

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
/**
 * The databases this user may connect to, by name.
 *
 * `M$SYS_USER_ACCESS` holds both grades of grant in one table, told apart by whether the object
 * columns are filled: a row with `OWNER_NAME` and `TABLE_NAME` NULL is a *database* grant, and
 * anything else is a table grant. That NULL is also why the tree's existing grant join can never
 * surface a database-only grant — it equates those very columns, and NULL equals nothing.
 *
 * Only CONNECT counts. The mask can carry CREATE or BACKUP without it, and a user who cannot
 * connect has no business seeing the database in their tree.
 *
 * Returns `undefined` for an administrator: SYS has zero rows in this table (verified), so an
 * empty result there means "unrestricted", not "nothing". Callers must not confuse the two.
 */
export const getConnectableDatabases = async (): Promise<string[] | undefined> => {
    if (isCurUserEqualAdmin()) return undefined;
    const sDb = await ensureCurrentDatabase();
    // Pre-v8.7 servers have one database and no database-level grants to read.
    if (sDb.id === LEGACY_DATABASE.id) return undefined;
    const sUser = getUserName()?.toUpperCase();
    const sSql = `select DB_NAME from M$SYS_USER_ACCESS where USER_NAME = '${sUser}' and TABLE_NAME is NULL and BITAND(PRIV, ${DATABASE_PERMISSION.CONNECT}) = ${DATABASE_PERMISSION.CONNECT}`;
    const { svrState, svrData } = await fetchQuery(sSql);
    if (!svrState) return undefined;
    return (svrData?.rows ?? []).map((aRow: any[]) => String(aRow[0] ?? '')).filter(Boolean);
};
const getTableList = async () => {
    const U_NAME = getUserName();
    // v8.7 renamed nothing here — it added a column. `M$SYS_TABLES.DATABASE_NAME` carries the
    // database name directly, which is why the old `V$STORAGE_MOUNT_DATABASES` join disappears
    // below: that join only ever produced a name for mounted backups, and on v8.7 it returns
    // NULL for every ordinary table, which is what left the tree's DB column empty.
    const sDb = await ensureCurrentDatabase();
    const sHasLogicalDb = sDb.id !== LEGACY_DATABASE.id;
    // `a.DATABASE_ID` reaches the statements below as `DBID`, and every database id the explorer
    // later writes back into SQL comes from there. It used to be wrapped in `TO_CHAR`: on v8.7 a
    // mounted database's id was tagged in bit 62 and overflowed a JS number. The tag now sits in
    // bit 30 and the whole range fits int32 (measured: a mounted `AA2` reports 1073741825), so
    // the plain column survives JSON intact — `normalizeDatabaseId` turns it into the text form
    // the catalogue is keyed by, whichever way it arrives.

    const sDbNameExpr = sHasLogicalDb
        ? 'a.DATABASE_NAME'
        : `case a.DATABASE_ID when -1 then 'MACHBASEDB' else d.MOUNTDB end`;
    const sMountJoin = sHasLogicalDb ? '' : ' left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID';
    let queryString;
    if (!isCurUserEqualAdmin())
    {
        // Four separate v8.7 changes meet in this one statement, and fixing fewer than all of
        // them just moves the failure: the union throws ERR-2156 until `priv` types match, and
        // once it compiles the grant join still matches nothing until it stops comparing a
        // three-part string to a bare table name.
        //   1. `M$SYS_USER_ACCESS.PRIV` became int64, so the placeholder must be 0, not ''.
        //   2. DB_NAME comes from `a.DATABASE_NAME`; the mount join yielded NULL for every row.
        //   3. Grants now carry DB_NAME / OWNER_NAME as columns instead of a `db.user.table` key.
        //   4. `a.database_id = -1` selects nothing once databases are numbered from 1.
        const sPrivPlaceholder = sHasLogicalDb ? '0' : `''`;
        const sOwnScope = sHasLogicalDb ? '' : ' and a.database_id=-1';
        const sGrantJoin = sHasLogicalDb
            ? `ua.DB_NAME = dl.DB_NAME AND ua.OWNER_NAME = dl.USER_NAME AND ua.TABLE_NAME = dl.TABLE_NAME`
            : `ua.TABLE_NAME = dl.DB_NAME || '.' || dl.USER_NAME || '.' || dl.TABLE_NAME`;
        queryString = `/api/query?q=SELECT ${sDbNameExpr} as DB_NAME, u.name as USER_NAME, a.ID as TABLE_ID, a.NAME as TABLE_NAME, a.TYPE as TABLE_TYPE, a.FLAG as TABLE_FLAG, a.DATABASE_ID as DBID , ${sPrivPlaceholder} as priv from M$SYS_TABLES a${sMountJoin} left join m$sys_users u on u.user_id=a.user_id where u.name='${U_NAME.toUpperCase()}'${sOwnScope} union all SELECT dl.*, ua.priv from M$SYS_USER_ACCESS ua, (SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, ${sDbNameExpr} as DB_NAME from M$SYS_TABLES a${sMountJoin}) as j where u.USER_ID = j.USER_ID) dl WHERE ${sGrantJoin} AND dl.USER_NAME <> '${U_NAME?.toUpperCase()}' and ua.USER_NAME = '${U_NAME?.toUpperCase()}' order by dl.TABLE_NAME`;
    }
    else
        // Admins take the same DB_NAME source; the mount join left this column NULL for all 58
        // rows on v8.7, which is what the tree rendered as an empty database name.
        queryString = `/api/query?q=SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID, '' as priv from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, ${sDbNameExpr} as DB_NAME from M$SYS_TABLES a${sMountJoin}) as j where u.USER_ID = j.USER_ID order by j.NAME`;
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
/**
 * Columns of a `V$` view — the tag statistics view a Gauge / Pie / Liquid fill panel reads.
 *
 * The inner lookup is scoped by DATABASE_ID as well as by name. v8.7 gives every logical
 * database its own copy of the view, so `select ID from v$tables where name = 'V$X_STAT'`
 * answers one row per database and the single-row subquery fails outright with
 * `ERR-2131, Single-row subquery returns more than one row`. Measured on a server with two
 * active databases: the same view name resolved to ids 462 and 480. The outer
 * `DATABASE_ID = ...` filter does not help — it constrains v$columns, not the subquery.
 */
export const getVirtualTableInfo = async (aDataBaseId: string, aTableName: string, aUserName: string) => {
    const queryString = `/api/query?q=select * from v$columns WHERE DATABASE_ID = ${aDataBaseId} AND ID > 0 AND ID < 65534 AND TABLE_ID = (select ID from v$tables where name = '${aTableName}' and DATABASE_ID = ${aDataBaseId} and user_ID = (select USER_ID from M$sys_users where name = '${aUserName}')) ORDER BY ID`;
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

// Shared adapter for the shell.* mutation RPCs whose result is a ShellDefinition. Reproduces the
// REST envelope: success → {success, reason:'success', data}, error → {data:{reason}, statusText}
// with NO top-level `reason` — ModalShell treats a truthy `res.reason` as success, so on error the
// reason may only appear under data.reason/statusText (same shape the axios interceptor produced
// by resolving `error.response` for REST failures).
const shellRpcEnvelope = async (method: string, params: any[]) => {
    try {
        const res = await rpcCall<any>(method, params);
        const msg = res?.error ? res.error.message || `JSON-RPC error ${res.error.code}` : null;
        if (msg) return { success: false, elapse: '', statusText: msg, data: { reason: msg } };
        return { success: true, reason: 'success', elapse: '', data: res?.result };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { success: false, elapse: '', statusText: msg, data: { reason: msg } };
    }
};
// Add shell — `shell.add(name, command)` (params: [name, command]). The RPC result is the created
// shell's id string; the server fills type/attributes itself and leaves icon/theme empty, so style
// customization needs a follow-up shell.update (see ShellManage createShell).
const addShell = (aName: string, aCommand: string) => shellRpcEnvelope(RpcMethod.shell.add, [aName, aCommand]);
// Copy shell — `shell.copy(srcId)` (params: [srcId]). The RPC result is the copied ShellDefinition
// itself; the adapter wraps it into the {success, data} envelope the callers (ShellManage, side/Shell)
// read the new shell from.
const copyShell = (aId: string) => shellRpcEnvelope(RpcMethod.shell.copy, [aId]);
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
// Update shell — `shell.update(shell)` (params: [ShellDefinition]). The full definition (id, type,
// label, command, icon?, theme?, attributes?) rides in a single object param; `attributes` keeps the
// array form ([{removable:true},...]) — the backend's custom UnmarshalJSON accepts exactly that shape.
const postShell = (aInfo: any) => shellRpcEnvelope(RpcMethod.shell.update, [aInfo]);
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
export const databaseBackup = (backupInfo: BackupRequest) => {
    return request({
        method: 'POST',
        url: `/api/backup/archive`,
        data: backupInfo,
    });
};
/** GET TABLE (LOG | TAG) */
export const getAllowBackupTable = async (aDatabase?: string | null) => {
    // Which database's tables to offer. Named, it is the one the backup form picked; otherwise the
    // database this session is in — before v8.7 the only one there was, whose id was -1.
    //
    // `M$SYS_TABLES` is instance-wide and carries `DATABASE_ID`, so another database's tables come
    // back from this session without moving it (measured on v8.7: `database_id = 2` returns
    // FACTORY_A's seven tables). That is not true of every meta object — `V$<TABLE>_STAT` outside
    // the session database answers MACHCLI-ERR-3031 (machbase/neo#1492) — but it is true here.
    //
    // The type filter follows the manual's backup support table (17.6.8): TAG(6), LOG(0),
    // LOOKUP(4) and TRANSACTION(8) can be backed up; VOLATILE(3) cannot, being memory-resident.
    // TRANSACTION matters most here — it is what a bare `CREATE TABLE` produces on v8.7, so
    // leaving it out would quietly hide most newly created tables from the backup picker.
    const sSession = await ensureCurrentDatabase();
    const sDb = findDatabaseByName(aDatabase) ?? sSession;
    return request({
        method: 'POST',
        url: '/api/query',
        data: {
            q: `SELECT u.USER_ID, u.NAME as USER_NAME, m.ID as TABLE_ID, decode(u.name, 'SYS', m.NAME, u.name || '.' || m.NAME) as TABLE_NAME, m.TYPE as TABLE_TYPE, decode(u.name, 'SYS',  ' ', u.name) as un from M$SYS_USERS u, (select * from M$SYS_TABLES where database_id = ${sDb.id} and flag = 0 and type in (0,4,6,8)) as m where u.USER_ID = m.USER_ID order by un, m.NAME`,
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
    getFileList,
    postFileList,
    getLicense,
    getTableList,
    postLicense,
    deleteFileList,
    getReferenceList,
    getTutorial,
    addShell,
    copyShell,
    removeShell,
    postShell,
    getTableInfo,
};
