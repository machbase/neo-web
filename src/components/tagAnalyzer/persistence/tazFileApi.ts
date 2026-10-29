import { postFileList } from '@/api/repository/api';
import { getTypedFileList } from '@/utils/fileExistence';
import { isSuccessfulFileWrite } from '@/utils/fileRequestResult';
import type { FileWriteOptions } from '@/api/repository/fileWriteQueue';

export type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean;
    gitClone?: boolean;
    lastModifiedUnixMillis: number;
    size: number;
};

export const tazFileApi = { fetchTazFileList, saveTazFile };

// This boolean API cannot return an Axios error value. Keep an unconfirmed write
// distinct from a definite rejection for direct TAZ service callers too.
const uncertainWrite: FileWriteOptions = {onUncertain: () => undefined};

// -------------------- Local --------------------

type SaveTazFileParams = {
    payload: unknown;
    directoryPath: string;
    fileName: string;
    writeOptions?: FileWriteOptions;
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
    writeOptions,
}: SaveTazFileParams): Promise<boolean> {
    const response: unknown = await postFileList(payload, directoryPath, fileName, writeOptions ?? uncertainWrite);
    return isSuccessfulFileWrite(response);
}
