import { getFileList } from '@/api/repository/api';
import { extractionExtension } from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';

export type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean | undefined;
    gitClone?: boolean | undefined;
    lastModifiedUnixMillis: number;
    size: number;
};

export type TazSaveModalInitialState = {
    directorySegments: string[];
    fileName: string;
    fileList: FileListItem[];
};

const TAZ_FILE_FILTER = '?filter=*.taz';

export async function loadTazSaveModalInitialState({
    initialDirectoryPath,
    initialFileName,
    recentModalPath,
}: {
    initialDirectoryPath: string;
    initialFileName: string;
    recentModalPath: string;
}): Promise<TazSaveModalInitialState> {
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