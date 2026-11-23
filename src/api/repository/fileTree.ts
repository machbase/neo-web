import { ResFileListType } from '@/utils/fileTreeParser';
import request from '../core';
import { repositoryFileUrl } from '@/extensions/host/paths';
import { AxiosResponse } from 'axios';


/**
 * `rawText` returns the body exactly as stored. Without it axios turns any body that looks like JSON
 * into an object — a `.json`, or a `.txt` that happens to hold JSON — and showing it again means
 * serializing it back: the file's own layout is lost, and a document a few thousand levels deep
 * overflows the call stack doing so (#1553).
 */
export const getFiles = (aPath: string, aOptions?: { rawText?: boolean }): Promise<AxiosResponse<ResFileListType>> => {
    return request({
        method: 'GET',
        url: repositoryFileUrl(aPath),
        ...(aOptions?.rawText ? { transformResponse: [(aData: unknown) => aData] } : {}),
    });
};

export const deleteFile = (aDir: string, aFileName: string, recursive = false) => {
    return request({
        method: 'DELETE',
        url: repositoryFileUrl(aDir + '/' + aFileName) + (recursive ? '?recursive=true' : ''),
    });
};

export const moveFile = (aPath: string, aDestinationPath: string) => {
    return request({
        method: 'PUT',
        url: repositoryFileUrl(aPath),
        data: { destination: `${aDestinationPath}` },
    });
};

export const copyFile = (source: string, destination: string) =>
    request({
        method: 'PUT',
        url: repositoryFileUrl(source),
        data: { copyTo: destination },
    });

// A successful move or delete may have finished before another request recreated its old name.
export async function listRepositoryChildNames(path: string) {
    const response = await getFiles(path);
    const data = response?.data;
    return data?.isDir ? new Set((data.children ?? []).map(child => child.name)) : undefined;
}
