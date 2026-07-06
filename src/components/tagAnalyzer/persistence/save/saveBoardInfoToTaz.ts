import type { BoardInfo } from '../../domain/BoardDomain';
import { saveTazFile } from '../../fetch/tazFile/TazFileFetch';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

export async function saveBoardInfoToTaz(boardInfo: BoardInfo): Promise<boolean> {
    try {
        const sResult = await saveTazFile({
            payload: mapBoardToPersistedTaz(boardInfo),
            directoryPath: boardInfo.path,
            fileName: boardInfo.name,
        });

        return sResult.success;
    } catch {
        return false;
    }
}
