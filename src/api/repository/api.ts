import request from '@/api/core';

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

const getTableList = async () => {
    const queryString = `/machbase?q=SELECT j.DB_NAME as DB_NAME, u.NAME as USER_NAME, j.ID as TABLE_ID, j.NAME as TABLE_NAME, j.TYPE as TABLE_TYPE, j.FLAG as TABLE_FLAG, j.DBID as DBID from M$SYS_USERS u, (select a.NAME as NAME, a.ID as ID, a.USER_ID as USER_ID, a.TYPE as TYPE, a.FLAG as FLAG, a.DATABASE_ID as DBID, case a.DATABASE_ID  when -1 then 'MACHBASEDB' else d.MOUNTDB end as DB_NAME from M$SYS_TABLES a left join V$STORAGE_MOUNT_DATABASES d on a.DATABASE_ID = d.BACKUP_TBSID) as j where u.USER_ID = j.USER_ID order by j.NAME`;

    return await request({
        method: 'GET',
        url: queryString,
    });
};
const getTableInfo = async (aDataBaseId: string, aTableId: string) => {
    const queryString = `/machbase?q=select name, type, length, id from M$SYS_COLUMNS where table_id = ${aTableId} and database_id = ${aDataBaseId} order by id`;
    return await request({
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

export { getFileList, postFileList, getLicense, getTableList, postLicense, deleteFileList, getReferenceList, getTutorial, postMd, copyShell, removeShell, postShell, getTableInfo };
