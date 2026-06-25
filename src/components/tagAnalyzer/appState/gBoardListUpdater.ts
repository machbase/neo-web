import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../domain/BoardDomain';

export type GlobalBoardListState = GBoardListType[];

type SavedBoardSnapshot = BoardInfo;

export function getNextBoardListWithSavedBoard(
    boards: GlobalBoardListState,
    savedBoard: SavedBoardSnapshot,
): GlobalBoardListState {
    return boards.map((board) =>
        board.id === savedBoard.id
            ? savedBoard as unknown as GBoardListType
            : board,
    );
}
