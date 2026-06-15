import type { GBoardListType } from '@/recoil/recoil';
import type { PersistedTazBoardInfo } from '../persistence/TazPersistenceTypesV200';

export type GlobalBoardListState = GBoardListType[];

type SavedBoardSnapshot = PersistedTazBoardInfo & {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    savedCode: string | false;
};

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
