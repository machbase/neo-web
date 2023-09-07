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

export { getFileList, postFileList, getLicense, postLicense, deleteFileList, getReferenceList, getTutorial, postMd, copyShell, removeShell, postShell };
