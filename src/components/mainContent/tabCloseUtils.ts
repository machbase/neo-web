import type { GBoardListType } from '@/recoil/recoil';
import { getId } from '@/utils';

export interface CloseTabStateResult {
    nextBoardList: GBoardListType[];
    nextSelectedTabId: string;
    closedBoards: GBoardListType[];
}

export const createNewBoardTab = (): GBoardListType => ({
    id: getId(),
    type: 'new',
    name: 'new',
    path: '',
    code: '',
    panels: [],
    range_bgn: '',
    range_end: '',
    sheet: [],
    savedCode: false,
});

export const closeTabState = (boardList: GBoardListType[], selectedTabId: string, targetTabId: string): CloseTabStateResult => {
    const targetIndex = boardList.findIndex((board) => board.id === targetTabId);

    if (targetIndex === -1) {
        return {
            nextBoardList: boardList,
            nextSelectedTabId: selectedTabId,
            closedBoards: [],
        };
    }

    const closedBoard = boardList[targetIndex];
    const nextBoardList = boardList.filter((board) => board.id !== targetTabId);

    if (nextBoardList.length === 0) {
        const newBoard = createNewBoardTab();

        return {
            nextBoardList: [newBoard],
            nextSelectedTabId: newBoard.id,
            closedBoards: [closedBoard],
        };
    }

    const fallbackBoard = targetIndex === boardList.length - 1 ? boardList[targetIndex - 1] : boardList[targetIndex + 1];

    return {
        nextBoardList,
        nextSelectedTabId: selectedTabId === targetTabId ? fallbackBoard?.id ?? nextBoardList[0].id : selectedTabId,
        closedBoards: [closedBoard],
    };
};

export const closeOtherTabsState = (boardList: GBoardListType[], targetTabId: string): CloseTabStateResult => {
    const targetBoard = boardList.find((board) => board.id === targetTabId);

    if (!targetBoard) {
        return {
            nextBoardList: boardList,
            nextSelectedTabId: '',
            closedBoards: [],
        };
    }

    return {
        nextBoardList: [targetBoard],
        nextSelectedTabId: targetBoard.id,
        closedBoards: boardList.filter((board) => board.id !== targetTabId),
    };
};
