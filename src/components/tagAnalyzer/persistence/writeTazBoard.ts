import type { BoardInfo } from '../board/boardModel';
import { tazFileApi } from './tazFileApi';
import { encodeTazBoard } from './tazFormat';
import type { FileWriteOptions } from '@/api/repository/fileWriteQueue';

export function writeTazBoard(boardInfo: BoardInfo, writeOptions?: FileWriteOptions): Promise<boolean> {
    return tazFileApi.saveTazFile({
        payload: encodeTazBoard(boardInfo),
        directoryPath: boardInfo.path,
        fileName: boardInfo.name,
        ...(writeOptions ? {writeOptions} : {}),
    });
}
