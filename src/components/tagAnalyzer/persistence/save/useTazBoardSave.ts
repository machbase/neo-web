import { useCallback, useEffect, useState, type Dispatch } from 'react';
import { Toast } from '@/design-system/components';
import type { BoardInfo } from '../../domain/BoardDomain';
import type { FileTreeState } from '../../appState/useTagAnalyzerAppState';
import {
    getBoardInfoForRuntimeBoardSave,
    type RuntimeBoardAction,
    type RuntimeBoardInfo,
} from '../../board/runtimeBoardInfo';
import {
    loadTazSaveAsModalInitialState,
    refreshTazFileTreeAfterSave,
    type TazSaveAsModalInitialState,
} from '../../fetch/tazFile/TazFileFetch';
import {
    createSavedTazBoardSnapshot,
    createTazSavedCodeFromBoardInfo,
} from './SavedTazBoardSnapshot';
import { saveBoardInfoToTaz } from './saveBoardInfoToTaz';

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const FILE_TREE_REFRESH_ERROR_MESSAGE = 'TAZ file saved, but file tree refresh failed.';

type TazBoardSaveAsModalProps = {
    initialState: TazSaveAsModalInitialState;
    onClose: () => void;
    onSaveAs: (directoryPath: string, fileName: string) => Promise<boolean>;
    onRecentModalPathChange: (path: string) => void;
};

/**
 * Owns the whole TAZ save flow: unsaved-change detection, the save/save-as
 * actions, the post-save rebaseline of the runtime board, the Ctrl+S shortcut,
 * and the Save As dialog state. The board component only renders
 * `saveAsModalProps`.
 */
export function useTazBoardSave({
    runtimeBoardInfo,
    dispatchRuntimeBoardAction,
    isActiveTab,
    recentModalPath,
    fileTree,
    onSavedBoard,
    onFileTreeChange,
    onRecentModalPathChange,
}: {
    runtimeBoardInfo: RuntimeBoardInfo;
    dispatchRuntimeBoardAction: Dispatch<RuntimeBoardAction>;
    isActiveTab: boolean;
    recentModalPath: string;
    fileTree: FileTreeState;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileTreeChange: (tree: FileTreeState) => void;
    onRecentModalPathChange: (path: string) => void;
}): {
    hasUnsavedChanges: boolean;
    save: () => Promise<boolean>;
    saveAs: () => Promise<void>;
    saveAsModalProps: TazBoardSaveAsModalProps | undefined;
} {
    const [sSaveAsModalInitialState, setSaveAsModalInitialState] =
        useState<TazSaveAsModalInitialState | undefined>(undefined);
    const [sIsSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);

    const hasUnsavedChanges =
        createTazSavedCodeFromBoardInfo(
            getBoardInfoForRuntimeBoardSave(runtimeBoardInfo),
        ) !== runtimeBoardInfo.savedCode;

    const saveAs = useCallback(async (): Promise<void> => {
        setSaveAsModalInitialState(
            await loadTazSaveAsModalInitialState({
                initialDirectoryPath: runtimeBoardInfo.path,
                initialFileName: runtimeBoardInfo.name,
                recentModalPath,
            }),
        );
        setIsSaveAsModalOpen(true);
    }, [recentModalPath, runtimeBoardInfo.name, runtimeBoardInfo.path]);

    const saveBoardInfo = useCallback(async (
        boardInfo: BoardInfo,
    ): Promise<boolean> => {
        const sDidSave = await saveBoardInfoToTaz(boardInfo);

        if (!sDidSave) {
            Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }

        const sSavedBoardInfo = createSavedTazBoardSnapshot(boardInfo);

        dispatchRuntimeBoardAction({
            type: 'REPLACE_FROM_SAVED_BOARD',
            boardInfo: sSavedBoardInfo,
        });
        onSavedBoard(sSavedBoardInfo);
        Toast.success(SAVE_SUCCESS_MESSAGE);
        return true;
    }, [dispatchRuntimeBoardAction, onSavedBoard]);

    const save = useCallback(async (): Promise<boolean> => {
        if (!runtimeBoardInfo.path) {
            await saveAs();
            return false;
        }

        return saveBoardInfo(getBoardInfoForRuntimeBoardSave(runtimeBoardInfo));
    }, [runtimeBoardInfo, saveAs, saveBoardInfo]);

    const saveBoardAs = useCallback(async (
        directoryPath: string,
        fileName: string,
    ): Promise<boolean> => {
        const sDidSave = await saveBoardInfo(
            getBoardInfoForRuntimeBoardSave({
                ...runtimeBoardInfo,
                name: fileName,
                path: directoryPath,
            }),
        );

        if (!sDidSave) {
            return false;
        }

        try {
            const sUpdatedTree = await refreshTazFileTreeAfterSave(
                fileTree,
                directoryPath,
                fileName,
            );
            if (sUpdatedTree) {
                onFileTreeChange(sUpdatedTree);
            }
        } catch {
            Toast.error(FILE_TREE_REFRESH_ERROR_MESSAGE);
        }

        return true;
    }, [fileTree, onFileTreeChange, runtimeBoardInfo, saveBoardInfo]);

    useEffect(() => {
        if (!isActiveTab) {
            return undefined;
        }

        const handleDocumentSaveShortcut = function handleDocumentSaveShortcut(
            event: KeyboardEvent,
        ) {
            const sIsSaveShortcut =
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's';

            if (!sIsSaveShortcut) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void save();
        };

        document.addEventListener('keydown', handleDocumentSaveShortcut, true);

        return () => {
            document.removeEventListener('keydown', handleDocumentSaveShortcut, true);
        };
    }, [isActiveTab, save]);

    return {
        hasUnsavedChanges,
        save,
        saveAs,
        saveAsModalProps: sIsSaveAsModalOpen && sSaveAsModalInitialState
            ? {
                  initialState: sSaveAsModalInitialState,
                  onClose: () => setIsSaveAsModalOpen(false),
                  onSaveAs: saveBoardAs,
                  onRecentModalPathChange,
              }
            : undefined,
    };
}
