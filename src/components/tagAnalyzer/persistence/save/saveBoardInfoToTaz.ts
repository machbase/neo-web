import type { BoardInfo } from '../../domain/BoardDomain';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';
import { saveTazFile } from './saveTazFile';

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