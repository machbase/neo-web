import { postFileList } from '@/api/repository/api';
import {
    createSavedTazBoardAfterSave,
    createSavedTazBoardAfterSaveAs,
    createTazSavePayload,
    type SaveableTazBoard,
} from './TazBoardSaveState';

type TazBoardSaveResult<TBoard extends SaveableTazBoard> = {
    success: boolean;
    savedBoard?: TBoard;
};

type SaveAsTazBoardParams<TBoard extends SaveableTazBoard> = {
    board: TBoard;
    directoryPath: string;
    fileName: string;
};

export async function saveTazBoard<TBoard extends SaveableTazBoard>(
    board: TBoard,
): Promise<TazBoardSaveResult<TBoard>> {
    const sResult = await postFileList(
        createTazSavePayload(board),
        getExistingSaveDirectoryPath(board.path),
        board.name,
    );

    if (!didFileSaveSucceed(sResult)) {
        return { success: false };
    }

    return {
        success: true,
        savedBoard: createSavedTazBoardAfterSave(board),
    };
}

export async function saveTazBoardAs<TBoard extends SaveableTazBoard>({
    board,
    directoryPath,
    fileName,
}: SaveAsTazBoardParams<TBoard>): Promise<TazBoardSaveResult<TBoard>> {
    const sResult = await postFileList(
        createTazSavePayload(board),
        directoryPath,
        fileName,
    );

    if (!didFileSaveSucceed(sResult)) {
        return { success: false };
    }

    return {
        success: true,
        savedBoard: createSavedTazBoardAfterSaveAs({
            board,
            fileName,
            filePath: directoryPath,
        }),
    };
}

function getExistingSaveDirectoryPath(directoryPath: string): string {
    return directoryPath.replace('/', '');
}

function didFileSaveSucceed(response: unknown): boolean {
    if (!response || typeof response !== 'object') {
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
