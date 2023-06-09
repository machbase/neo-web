import request from '@/api/core';
import { ResponseData, ResponseList, ResType } from '@/assets/ts/common';
import { BoardInfo } from '@/interface/chart';
import { ResBoardList, ResPreferences } from '@/interface/tagView';

const normalizePath = (path: string) => path.replace(/[\\/]+/g, '/');

const getFileList = (aFilter: string, aDir: string, aName: string) => {
    return request({
        method: 'GET',
        url: normalizePath(`/api/files/${aDir}${aName ? '/' + aName : ''}${aFilter}`),
    });
};

const postMd = (aData: string) => {
    return request({
        method: 'POST',
        url: `/api/md`,
        data: aData,
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
const getTutorial = (aUrl: any) => {
    return request({
        method: 'get',
        url: aUrl,
    });
};

export { getFileList, postFileList, getLicense, postLicense, deleteFileList, getTutorial, postMd };
