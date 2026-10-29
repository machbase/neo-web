import { useRecoilCallback } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { saveBoardFile } from '@/utils/boardFileSave';
import { applyFileReadResult, applyFileSaveResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { Toast } from '@/design-system/components';

/** Automatic changes keep their draft immediately; only successful writes mark
 * it saved. This callback survives the panel editor that initiated the write. */
export const useBoardFileSave = () => {
    const getSaveBoards = useRecoilCallback(({snapshot}) => () => snapshot.getLoadable(gBoardList).getValue(), []);
    return useRecoilCallback(({set}) => async (board: any): Promise<void> => {
        if (!board.path) return;
        try {
            const success = await saveBoardFile({
                board,
                getSaveBoards,
                onSuccess: submitted => set(gBoardList, boards => applyFileSaveResult(boards, board, board.type, submitted)),
                onRead: loaded => set(gBoardList, boards => applyFileReadResult(boards, loaded)),
                onUncertain: (target = board) => set(gBoardList, boards => invalidateFileSaveResult(boards, target)),
            });
            if (!success) Toast.error('Failed to save file. Please try again.');
        } catch {
            Toast.error('Failed to save file. Please try again.');
        }
    }, [getSaveBoards]);
};
