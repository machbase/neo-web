import type { BoardInfo } from './boardModel';
import { restoreBoard } from './boardReconstruction';
import { parseTazDocument } from '../persistence/tazMigrations';
import { getOutdatedTazFormatWarning, TAZ_FORMAT_VERSION } from '../persistence/tazFormat';
import { createTazBoardSnapshot } from '../persistence/tazBoardSnapshot';
import { writeTazBoard } from '../persistence/writeTazBoard';

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
): Promise<BoardInfo | undefined> {
    try {
        const sSavedBoard = createTazBoardSnapshot({
            ...boardInfo,
            version: TAZ_FORMAT_VERSION,
            code: '',
            loadWarning: undefined,
        });
        const sDidSave = await writeTazBoard(sSavedBoard);
        return sDidSave ? sSavedBoard : undefined;
    } catch {
        return undefined;
    }
}
