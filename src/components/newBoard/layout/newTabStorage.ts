import axios from 'axios';
import request from '@/api/core';
import { postFileList } from '@/api/repository/api';
import { getUserName } from '@/utils';
import { buildFilesUrl } from '@/utils/filePath';

/**
 * New tab settings live as JSON files in a hidden folder of the server's file root. The file API
 * serves dot paths but leaves them out of every listing, so they never show up in the explorer,
 * and they follow the user to any browser. Measured on v8.7.2: writing into a folder that does not
 * exist yet fails with `no such file or directory`, so the folders are created on the first save.
 */
export const NEW_TAB_DIR = '/.neo-web/new-tab';

/** Login names go into file names, so keep them to characters every file system accepts. */
export const accountKey = () => String(getUserName() ?? 'unknown').toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

export const layoutFileName = () => `layout.${accountKey()}.json`;
export const privateGroupsFileName = () => `groups.${accountKey()}.json`;
export const SHARED_GROUPS_FILE = 'groups.shared.json';

export type ReadResult<T> = { status: 'ok'; data: T } | { status: 'missing' } | { status: 'error'; reason: string };

const isErrorResponse = (aResult: any) => !!aResult && typeof aResult === 'object' && 'status' in aResult && 'headers' in aResult && 'config' in aResult;
const reasonOf = (aResult: any) => aResult?.data?.reason ?? aResult?.reason ?? aResult?.message ?? 'Unknown error';

export const readJsonFile = async <T = unknown>(aName: string): Promise<ReadResult<T>> => {
    const sResult: any = await request({ method: 'GET', url: buildFilesUrl(`${NEW_TAB_DIR}/${aName}`) });
    if (axios.isAxiosError(sResult)) return { status: 'error', reason: reasonOf(sResult) };
    if (isErrorResponse(sResult)) return sResult.status === 404 ? { status: 'missing' } : { status: 'error', reason: reasonOf(sResult) };
    if (typeof sResult === 'string') {
        try {
            return { status: 'ok', data: JSON.parse(sResult) as T };
        } catch {
            return { status: 'error', reason: `${aName} is not valid JSON.` };
        }
    }
    return { status: 'ok', data: sResult as T };
};

const ensureFolders = async () => {
    const sParts = NEW_TAB_DIR.split('/').filter(Boolean);
    let sPath = '';
    for (const sPart of sParts) {
        // A folder that already exists answers `mkdir ...: file exists`; that is fine, so the result is not checked.
        await postFileList(undefined, sPath || '/', sPart);
        sPath += '/' + sPart;
    }
};

export const writeJsonFile = async (aName: string, aData: unknown): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const sWrite = async () => {
        const sResult: any = await postFileList(JSON.stringify(aData, null, 2), NEW_TAB_DIR, aName);
        return sResult?.success ? undefined : reasonOf(sResult);
    };
    let sFailure = await sWrite();
    if (sFailure && /no such file or directory/i.test(sFailure)) {
        await ensureFolders();
        sFailure = await sWrite();
    }
    return sFailure ? { ok: false, reason: sFailure } : { ok: true };
};
