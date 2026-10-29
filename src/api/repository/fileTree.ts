import { ResFileListType } from '@/utils/fileTreeParser';
import { buildFilesUrl, relocateFilePath } from '@/utils/filePath';
import request from '../core';
import { AxiosResponse } from 'axios';
import { FileMutationContext, isUncertainFileResult, runFileMutation } from './fileWriteQueue';
import { getFileRequestFailure } from '@/utils/fileRequestResult';

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

export const deleteFile = (aDir: string, aFileName: string, aOpts?: { recursive?: boolean; handlers?: FileMutationHandlers }) => {
    return runFileMutation([`/${aDir}/${aFileName}`], async isCurrent => {
        if (!isCurrent()) return {success: false};
        return request({method: 'DELETE', url: buildFilesUrl(`/${aDir}/${aFileName}`, aOpts?.recursive ? '?recursive=true' : undefined)});
    }, aOpts?.handlers?.prepare, async (result, context) => {
        if (!getFileRequestFailure(result)) await aOpts?.handlers?.onDeleted?.(context);
        else if (!isUncertainFileResult(result)) await aOpts?.handlers?.onRejected?.(context);
    });
};

export type FileMoveContext = FileMutationContext & {
    /** undefined: separate file; null: related spelling without proven identity. */
    destination: (path: string) => string | null | undefined;
};
export type FileMutationHandlers = {
    prepare?: (context: FileMutationContext, paths?: readonly string[]) => Promise<void>;
    onDeleted?: (context: FileMutationContext) => void | Promise<void>;
    onRejected?: (context: FileMutationContext) => void | Promise<void>;
    onUncertain?: (context: FileMutationContext) => void;
};
export type FileMoveHandlers = FileMutationHandlers & {onMoved?: (context: FileMoveContext) => void | Promise<void>};

export const moveFile = (aPath: string, aDestinationPath: string, handlers?: FileMoveHandlers | (() => void | Promise<void>)) => {
    const callbacks = typeof handlers === 'function' ? {onMoved: handlers} : handlers;
    return runFileMutation([aPath, aDestinationPath], async (isCurrent, context) => {
        if (!isCurrent()) return {success: false, reason: 'File move cancelled.'};
        context.scope.capture();
        const result = await request({
            method: 'PUT', url: buildFilesUrl(aPath), data: { destination: aDestinationPath },
        });
        const failure = getFileRequestFailure(result, 'Failed to move.');
        // Neo Rename uses one os.Rename: its terminal rejection changes no bytes.
        if (failure && !isUncertainFileResult(result)) context.unchanged();
        else context.commit();
        return result;
    }, callbacks?.prepare, async (result, context) => {
        const isCurrent = context.isCurrent;
        const failure = getFileRequestFailure(result, 'Failed to move.');
        const publish = async () => {
            if (!isCurrent()) return;
            await callbacks?.onMoved?.({
                ...context,
                destination: path => {
                    const relation = context.scope.relation(path, aPath);
                    if (relation === 'different') return undefined;
                    if (relation === 'unknown') return null;
                    return relocateFilePath(decodeURIComponent(context.scope.identity(path)),
                        decodeURIComponent(context.scope.identity(aPath)), aDestinationPath);
                },
            });
        };
        if (isCurrent() && !failure) await publish();
        else if (isCurrent() && isUncertainFileResult(result)) callbacks?.onUncertain?.(context);
    });
};
