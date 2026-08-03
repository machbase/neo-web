import { getFileList, postFileList } from '@/api/repository/api';
import { isPlainObject } from '../objectGuards';

export type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean;
    gitClone?: boolean;
    lastModifiedUnixMillis: number;
    size: number;
};

type SaveTazFileParams = {
    payload: unknown;
    directoryPath: string;
    fileName: string;
};

const TAZ_FILE_FILTER = '?filter=*.taz';

async function fetchTazFileList(
    directorySegments: string[],
): Promise<FileListItem[]> {
    const response = await getFileList(
        TAZ_FILE_FILTER,
        directorySegments.join('/'),
        '',
    );

    return (response.data?.children ?? []) as FileListItem[];
}

async function saveTazFile({
    payload,
    directoryPath,
    fileName,
}: SaveTazFileParams): Promise<boolean> {
    const response: unknown = await postFileList(
        payload,
        directoryPath,
        fileName,
    );
    if (!isPlainObject(response)) return false;

    const responseEnvelope = response as {
        success?: boolean;
        data?: { success?: boolean };
    };

    return responseEnvelope.success === true ||
        responseEnvelope.data?.success === true;
}

export const tazFileApi = { fetchTazFileList, saveTazFile };
