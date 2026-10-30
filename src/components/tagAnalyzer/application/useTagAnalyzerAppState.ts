import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue, useSetRecoilState, useRecoilCallback } from 'recoil';
import { Toast } from '@/design-system/components';
import { useFileTreeRefresh } from '@/hooks/useFileTreeRefresh';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { applyFileSaveResult, applySaveAsResult, hasBoardContentChanged } from '@/utils/boardSaveResult';
import { hasPendingBoardSave } from '@/utils/boardFileSave';
import type { SavedBoardOptions } from '../board/useBoardSave';
import type { BoardInfo } from '../board/boardModel';
import { tableMetadataApi } from '../api/tableMetadataApi';
import type { RollupTableMap } from '../api/rollupMetadata';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';

export function useTagAnalyzerAppState(info: BoardInfo) {
    const selectedTab = useRecoilValue(gSelectedTab);
    const refreshFileTree = useFileTreeRefresh();
    const updateBoardList = useSetRecoilState(gBoardList);
    const [rollupTableList, setRollupTableList] = useState<RollupTableMap>();
    const isActiveTab = selectedTab === info.id;

    useLatestAsyncRequest({
        enabled: isActiveTab && rollupTableList === undefined,
        requestKey: info.id,
        fetch: () => tableMetadataApi.fetchRollupMetadata(),
        onSuccess: setRollupTableList,
        onError: () => setRollupTableList({}),
    });

    useEffect(() => {
        if (info.loadWarning) Toast.warning(info.loadWarning, undefined);
    }, [info.loadWarning]);

    const getSaveBoards = useRecoilCallback(({snapshot}) => () =>
        snapshot.getLoadable(gBoardList).getValue() as unknown as BoardInfo[], []);

    // Keep the shared tab's content current; savedCode belongs to successful writes only.
    const updateRuntimeBoard = useCallback((runtime: BoardInfo) => {
        updateBoardList(boards => boards.map(board => board.id === runtime.id &&
            board.path === runtime.path && board.name === runtime.name && hasBoardContentChanged(runtime, board)
            ? {...board, panels: runtime.panels, boardTimeRange: runtime.boardTimeRange,
                boardNumericRange: runtime.boardNumericRange, unreadablePanels: runtime.unreadablePanels}
            : board));
    }, [updateBoardList]);

    const updateSavedBoard = useRecoilCallback(({snapshot, set}) => (
        savedBoard: BoardInfo, opts?: SavedBoardOptions,
    ): BoardInfo | undefined => {
        const boards = snapshot.getLoadable(gBoardList).getValue();
        const owner = opts?.owner ?? boards.find(board => board.id === savedBoard.id) ?? savedBoard;
        const next = opts?.acknowledgementOnly || (!opts?.saveAs && !opts?.overwritten)
            ? applyFileSaveResult(boards, savedBoard, 'taz', savedBoard)
            : applySaveAsResult(boards, {
                owner, target: savedBoard, fileType: 'taz', submitted: savedBoard,
                sourceIsCurrent: boards.some(board => board.id === owner.id && board.path === owner.path && board.name === owner.name),
                confirmed: !!opts?.overwritten, previousBoards: opts?.before,
                isSaving: opts?.isSaving ?? (board => hasPendingBoardSave(board.id)),
            });
        set(gBoardList, next);
        set(gSelectedTab, selected => next.some(board => board.id === selected) ? selected : savedBoard.id);
        return next.find(board => board.id === savedBoard.id) as unknown as BoardInfo | undefined;
    }, []);

    const handleFileSaved = useCallback(
        (directoryPath: string, fileName: string, canApply?: () => boolean) =>
            refreshFileTree(`${directoryPath}${fileName}`, canApply),
        [refreshFileTree],
    );

    return {
        isActiveTab,
        isLoading: isActiveTab && rollupTableList === undefined,
        rollupTableList: rollupTableList ?? EMPTY_ROLLUP_TABLE_LIST,
        handleFileSaved,
        updateSavedBoard,
        getSaveBoards,
        updateRuntimeBoard,
    };
}

// -------------------- Local --------------------

const EMPTY_ROLLUP_TABLE_LIST: RollupTableMap = {};
