import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue, useSetRecoilState, type RecoilState } from 'recoil';
import { Toast } from '@/design-system/components';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { gFileTree } from '@/recoil/fileTree';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import type { BoardInfo } from '../board/boardModel';
import { tableMetadataApi } from '../api/tableMetadataApi';
import type { RollupTableMap } from '../api/rollupMetadata';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';

export function useTagAnalyzerAppState(info: BoardInfo) {
    const selectedTab = useRecoilValue(gSelectedTab);
    const fileTree = useRecoilValue(gFileTree);
    const setFileTree = useSetRecoilState(gFileTree);
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

    const updateSavedBoard = useCallback(
        (savedBoard: BoardInfo): void => {
            updateBoardList((boards) =>
                boards.map((board) =>
                    board.id === savedBoard.id
                        ? { ...board, ...savedBoard }
                        : board,
                ),
            );
        },
        [updateBoardList],
    );

    const handleFileSaved = useCallback(
        async (directoryPath: string, fileName: string): Promise<void> => {
            const updatedTree = await refreshTazFileTreeAfterSave(
                fileTree,
                directoryPath,
                fileName,
            );
            if (updatedTree) setFileTree(updatedTree);
        },
        [fileTree, setFileTree],
    );

    return {
        isActiveTab,
        isLoading: isActiveTab && rollupTableList === undefined,
        rollupTableList: rollupTableList ?? EMPTY_ROLLUP_TABLE_LIST,
        handleFileSaved,
        updateSavedBoard,
    };
}

// -------------------- Local --------------------

const EMPTY_ROLLUP_TABLE_LIST: RollupTableMap = {};

type FileTreeState = typeof gFileTree extends RecoilState<infer Value>
    ? Value
    : never;

async function refreshTazFileTreeAfterSave(
    fileTree: FileTreeState,
    directoryPath: string,
    fileName: string,
): Promise<FileTreeState | undefined> {
    const updatedTreeResult = await TreeFetchDrilling(
        fileTree,
        `${directoryPath}${fileName}`,
        true,
    );

    return updatedTreeResult?.tree
        ? JSON.parse(JSON.stringify(updatedTreeResult.tree))
        : undefined;
}
