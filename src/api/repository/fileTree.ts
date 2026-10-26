import { ResFileListType } from '@/utils/fileTreeParser';
import { buildFilesUrl } from '@/utils/filePath';
import request from '../core';
import { AxiosResponse } from 'axios';
import { cancelPendingFileWrites } from './fileWriteQueue';

/**
 * `rawText` returns the body exactly as stored. Without it axios turns any body that looks like JSON
 * into an object — a `.json`, or a `.txt` that happens to hold JSON — and showing it again means
 * serializing it back: the file's own layout is lost, and a document a few thousand levels deep
 * overflows the call stack doing so (#1553).
 */
export const getFiles = (aPath: string, aOptions?: { rawText?: boolean }): Promise<AxiosResponse<ResFileListType>> => {
    return request({
        method: 'GET',
        url: buildFilesUrl(aPath),
        ...(aOptions?.rawText ? { transformResponse: [(aData: unknown) => aData] } : {}),
    });
};

export const deleteFile = (aDir: string, aFileName: string, aOpts?: { recursive?: boolean }) => {
    cancelPendingFileWrites(`/${aDir}/${aFileName}`);
    return request({
        method: 'DELETE',
        url: buildFilesUrl(`/${aDir}/${aFileName}`, aOpts?.recursive ? '?recursive=true' : undefined),
    });
};

export const moveFile = (aPath: string, aDestinationPath: string) => {
    cancelPendingFileWrites(aPath);
    cancelPendingFileWrites(aDestinationPath);
    return request({
        method: 'PUT',
        url: buildFilesUrl(aPath),
        data: { destination: `${aDestinationPath}` },
    });
};
