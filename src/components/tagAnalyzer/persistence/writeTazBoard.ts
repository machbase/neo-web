import type { BoardInfo } from '../board/boardModel';
import { tazFileApi } from './tazFileApi';
import { encodeTazBoard } from './tazFormat';

export function writeTazBoard(boardInfo: BoardInfo): Promise<boolean> {
    return tazFileApi.saveTazFile({
        payload: encodeTazBoard(boardInfo),
        directoryPath: boardInfo.path,
        fileName: boardInfo.name,
    });
}
