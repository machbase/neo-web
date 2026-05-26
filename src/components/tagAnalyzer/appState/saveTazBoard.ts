import {
    createSavedTazBoardAfterSave,
    createSavedTazBoardAfterSaveAs,
    type SaveableTazBoard,
} from './SavedTazBoardSnapshot';
import { createTazSavePayload } from '../persistence/save/createTazSavePayload';
import { saveTazFile } from '../persistence/save/saveTazFile';

type TazBoardSaveResult<TBoard extends SaveableTazBoard> = {
    success: boolean;
    savedBoard?: TBoard;
};

type SaveAsTazBoardParams<TBoard extends SaveableTazBoard> = {
    board: TBoard;
    directoryPath: string;
    fileName: string;
};

export async function saveTaz<TBoard extends SaveableTazBoard>(
    board: TBoard,
): Promise<TazBoardSaveResult<TBoard>> {
    const sResult = await saveTazFile({
        payload: createTazSavePayload(board),
        directoryPath: getExistingSaveDirectoryPath(board.path),
        fileName: board.name,
    });

    if (!sResult.success) {
        return { success: false };
    }

    return {
        success: true,
        savedBoard: createSavedTazBoardAfterSave(board),
    };
}

export async function saveAsTaz<TBoard extends SaveableTazBoard>({
    board,
    directoryPath,
    fileName,
}: SaveAsTazBoardParams<TBoard>): Promise<TazBoardSaveResult<TBoard>> {
    const sResult = await saveTazFile({
        payload: createTazSavePayload(board),
        directoryPath,
        fileName,
    });

    if (!sResult.success) {
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
