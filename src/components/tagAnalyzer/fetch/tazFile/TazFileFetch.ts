import { getFileList, postFileList } from '@/api/repository/api';
import { extractionExtension } from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import type { FileTreeState } from '../../appState/useTagAnalyzerAppState';
import { isPlainObject } from '../../domain/ObjectGuards';
import type { PersistedTazBoardInfoV210 } from '../../persistence/TazPersistenceTypesV210';

export type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean | undefined;
    gitClone?: boolean | undefined;
    lastModifiedUnixMillis: number;
    size: number;
};

export type TazSaveAsModalInitialState = {
    directorySegments: string[];
    fileName: string;
    fileList: FileListItem[];
};

type TazFileSaveResult = {
    success: boolean;
};

type SaveTazFileParams = {
    payload: PersistedTazBoardInfoV210;
    directoryPath: string;
    fileName: string;
};

const TAZ_FILE_FILTER = '?filter=*.taz';

export async function loadTazSaveAsModalInitialState({
    initialDirectoryPath,
    initialFileName,
    recentModalPath,
}: {
    initialDirectoryPath: string;
    initialFileName: string;
    recentModalPath: string;
}): Promise<TazSaveAsModalInitialState> {
    const sResolvedDirectoryPath = normalizeDirectoryPath(
        initialDirectoryPath || recentModalPath || '/',
    );
    const sDirectorySegments = splitDirectoryPath(sResolvedDirectoryPath);

    return {
        directorySegments: sDirectorySegments,
        fileName: resolveInitialFileName(initialFileName),
        fileList: await fetchTazFileList(sDirectorySegments),
    };
}

export async function fetchTazFileList(
    directorySegments: string[],
): Promise<FileListItem[]> {
    const sResponse = await getFileList(
        TAZ_FILE_FILTER,
        directorySegments.join('/'),
        '',
    );

    return (sResponse.data?.children ?? []) as FileListItem[];
}

export async function saveTazFile({
    payload,
    directoryPath,
    fileName,
}: SaveTazFileParams): Promise<TazFileSaveResult> {
    const sResult = await postFileList(
        payload,
        directoryPath,
        fileName,
    );

    if (!didFileSaveSucceed(sResult)) {
        return { success: false };
    }

    return {
        success: true,
    };
}

export async function refreshTazFileTreeAfterSave(
    fileTree: FileTreeState,
    directoryPath: string,
    fileName: string,
): Promise<FileTreeState | undefined> {
    const sUpdatedTreeResult = await TreeFetchDrilling(
        fileTree,
        `${directoryPath}${fileName}`,
        true,
    );

    return sUpdatedTreeResult?.tree
        ? JSON.parse(JSON.stringify(sUpdatedTreeResult.tree))
        : undefined;
}

export function buildDirectoryPath(directorySegments: string[]): string {
    if (directorySegments.length === 0) {
        return '/';
    }

    return `/${directorySegments.join('/')}/`;
}

export function isValidTazFileName(fileName: string): boolean {
    return (
        FileNameAndExtensionValidator(fileName) &&
        extractionExtension(fileName) === 'taz'
    );
}

function splitDirectoryPath(directoryPath: string): string[] {
    return directoryPath.split('/').filter(Boolean);
}

function normalizeDirectoryPath(directoryPath: string): string {
    const sTrimmedPath = directoryPath.trim();

    if (sTrimmedPath === '') {
        return '/';
    }

    const sLeadingSlashPath = sTrimmedPath.startsWith('/')
        ? sTrimmedPath
        : `/${sTrimmedPath}`;

    return sLeadingSlashPath.endsWith('/')
        ? sLeadingSlashPath
        : `${sLeadingSlashPath}/`;
}

function resolveInitialFileName(initialFileName: string): string {
    if (initialFileName === '') {
        return 'new.taz';
    }

    return extractionExtension(initialFileName) === 'taz'
        ? initialFileName
        : `${initialFileName}.taz`;
}

function didFileSaveSucceed(response: unknown): boolean {
    if (!isPlainObject(response)) {
        return false;
    }

    const sResponse = response as {
        success?: boolean;
        data?: {
            success?: boolean;
        };
    };

    return sResponse.success === true || sResponse.data?.success === true;
}
