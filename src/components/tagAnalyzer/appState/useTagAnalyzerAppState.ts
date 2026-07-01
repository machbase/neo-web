import { useCallback } from 'react';
import {
    useRecoilValue,
    useSetRecoilState,
    type RecoilState,
    type SetterOrUpdater,
} from 'recoil';
import { gFileTree } from '@/recoil/fileTree';
import {
    gBoardList,
    gSelectedTab,
} from '@/recoil/recoil';
import type { BoardInfo } from '../domain/BoardDomain';
import {
    type GlobalBoardListState,
    getNextBoardListWithSavedBoard,
} from './gBoardListUpdater';

export type FileTreeState = typeof gFileTree extends RecoilState<infer TValue>
    ? TValue
    : never;

type TagAnalyzerAppState = {
    selectedTab: string;
    fileTree: FileTreeState;
    setFileTree: SetterOrUpdater<FileTreeState>;
    updateSavedBoard: (savedBoard: BoardInfo) => void;
};

export function useTagAnalyzerAppState(): TagAnalyzerAppState {
    const selectedTab = useRecoilValue(gSelectedTab);
    const fileTree = useRecoilValue(gFileTree);
    const setFileTree = useSetRecoilState(gFileTree);
    const updateBoardList = useSetRecoilState<GlobalBoardListState>(gBoardList);

    const updateSavedBoard = useCallback((savedBoard: BoardInfo): void => {
        updateBoardList((prev) =>
            getNextBoardListWithSavedBoard(prev, savedBoard),
        );
    }, [updateBoardList]);

    return {
        selectedTab,
        fileTree,
        setFileTree,
        updateSavedBoard,
    };
}