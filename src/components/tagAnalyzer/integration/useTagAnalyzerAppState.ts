import { useCallback } from 'react';
import { useRecoilValue, useSetRecoilState, type RecoilState } from 'recoil';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { gFileTree } from '@/recoil/fileTree';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import type { BoardInfo } from '../model';

type FileTreeState = typeof gFileTree extends RecoilState<infer Value>
    ? Value
    : never;

export function useTagAnalyzerAppState() {
    const selectedTab = useRecoilValue(gSelectedTab);
    const fileTree = useRecoilValue(gFileTree);
    const setFileTree = useSetRecoilState(gFileTree);
    const updateBoardList = useSetRecoilState(gBoardList);

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
        selectedTab,
        handleFileSaved,
        updateSavedBoard,
    };
}

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
