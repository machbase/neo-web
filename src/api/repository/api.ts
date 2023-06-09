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

const postFileList = (aContents: string, aDir: string, aFileName: string) => {
    return request({
        method: 'POST',
        url: normalizePath(`/api/files/${aDir}/${aFileName}`),
        data: aContents,
    });
};

export { getFileList, postFileList };
