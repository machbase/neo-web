import { ResFileListType } from '@/utils/fileTreeParser';
import { buildFilesUrl } from '@/utils/filePath';
import request from '../core';
import { AxiosResponse } from 'axios';

export const getFiles = (aPath: string): Promise<AxiosResponse<ResFileListType>> => {
    return request({
        method: 'GET',
        url: buildFilesUrl(aPath),
    });
};

export const deleteFile = (aDir: string, aFileName: string, aOpts?: { recursive?: boolean }) => {
    return request({
        method: 'DELETE',
        url: buildFilesUrl(`/${aDir}/${aFileName}`, aOpts?.recursive ? '?recursive=true' : undefined),
    });
};

export const moveFile = (aPath: string, aDestinationPath: string) => {
    return request({
        method: 'PUT',
        url: buildFilesUrl(aPath),
        data: { destination: `${aDestinationPath}` },
    });
};
