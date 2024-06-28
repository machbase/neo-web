import { ResFileListType } from '@/utils/fileTreeParser';
import request from '../core';
import { AxiosResponse } from 'axios';

const normalizePath = (path: string) => path.replace(/[\\/]+/g, '/');

export const getFiles = (aPath: string): Promise<AxiosResponse<ResFileListType>> => {
    const sRegExp = new RegExp(/[/]*[/]/, 'g');
    return request({
        method: 'GET',
        url: `/api/files${aPath.replaceAll(sRegExp, '/')}`,
    });
};

export const deleteFile = (aDir: string, aFileName: string) => {
    return request({
        method: 'DELETE',
        url: normalizePath(`/api/files/${aDir}/${aFileName}`),
    });
};

export const moveFile = (aPath: string, aDestinationPath: string) => {
    return request({
        method: 'PUT',
        url: `/api/files${aPath}`,
        data: { destination: `${aDestinationPath}` },
    });
};
