import request from '@/api/core';
import { ResponseData, ResponseList, ResType } from '@/assets/ts/common';
import { BoardInfo } from '@/interface/chart';
import { ResBoardList, ResPreferences } from '@/interface/tagView';

const getFileList = (aFilter: string, aDir: string, aName: string) => {
    return request({
        method: 'GET',
        url: `/api/files/${aDir}${aName ? '/' + aName : ''}${aFilter}`,
    });
};

const postFileList = (aContents: string, aDir: string, aFileName: string) => {
    return request({
        method: 'POST',
        url: `/api/files/${aDir}/${aFileName}`,
        data: aContents,
    });
};

export { getFileList, postFileList };
