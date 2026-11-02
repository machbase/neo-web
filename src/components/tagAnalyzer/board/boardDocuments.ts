import type { BoardInfo } from './boardModel';
import { restoreBoard } from './boardReconstruction';
import { parseTazDocument } from '../persistence/tazMigrations';
import { getOutdatedTazFormatWarning, getTazFormatVersion } from '../persistence/tazFormat';
import { createTazBoardSnapshot } from '../persistence/tazBoardSnapshot';
import { writeTazBoard } from '../persistence/writeTazBoard';
import { UncertainFileWriteError } from '@/api/repository/fileWriteQueue';
import type { FileWriteOptions, FileWriteContext } from '@/api/repository/fileWriteQueue';
import { isSuccessfulFileWrite } from '@/utils/fileRequestResult';

export { isTazBoardSaved } from '../persistence/tazBoardSnapshot';

export function loadTazBoard(
    parsedTaz: unknown,
    id: string,
    name: string,
    path: string,
): BoardInfo {
    const sLoadedBoardInfo = restoreBoard(parseTazDocument(parsedTaz));
    return createTazBoardSnapshot({
        ...sLoadedBoardInfo,
        id,
        name,
        path,
        type: 'taz',
        code: '',
        loadWarning: getOutdatedTazFormatWarning(
            sLoadedBoardInfo.version,
            sLoadedBoardInfo.panels.length,
        ),
    });
}

export async function saveTazBoard(
    boardInfo: BoardInfo,
    options?: FileWriteOptions & { onSaved?: (board: BoardInfo, context: FileWriteContext) => void | Promise<void> },
): Promise<BoardInfo | undefined> {
    try {
        const sSavedBoard = createTazBoardSnapshot({
            ...boardInfo,
            version: getTazFormatVersion(boardInfo),
            code: '',
            loadWarning: undefined,
        });
        const writeOptions = options ? {
            ...options,
            onResult: async (result: any, context: FileWriteContext) => {
                await options.onResult?.(result, context);
                if (isSuccessfulFileWrite(result)) await options.onSaved?.(sSavedBoard, context);
            },
        } : undefined;
        const sDidSave = await (writeOptions ? writeTazBoard(sSavedBoard, writeOptions) : writeTazBoard(sSavedBoard));
        return sDidSave ? sSavedBoard : undefined;
    } catch (error) {
        if (error instanceof UncertainFileWriteError) throw error;
        return undefined;
    }
}
