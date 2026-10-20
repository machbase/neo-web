import { postFileList } from '@/api/repository/api';
import { getTypedFileList } from '@/utils/fileExistence';
import { isPlainObject } from '../objectGuards';

export type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean;
    gitClone?: boolean;
    lastModifiedUnixMillis: number;
    size: number;
};

export const tazFileApi = { fetchTazFileList, saveTazFile };

// -------------------- Local --------------------

type SaveTazFileParams = {
    payload: unknown;
    directoryPath: string;
    fileName: string;
};

// r19: `.taz` filtering is client-side and case-insensitive (the server `?filter=*.taz` drops `B.TAZ`)
const TAZ_FILE_TYPE = 'taz';

async function fetchTazFileList(
    directorySegments: string[],
): Promise<FileListItem[]> {
    const response = await getTypedFileList(
        TAZ_FILE_TYPE,
        directorySegments.join('/'),
    );

    return (response?.data?.children ?? []) as FileListItem[];
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
