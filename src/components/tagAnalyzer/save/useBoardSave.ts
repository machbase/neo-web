import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Toast } from '@/design-system/components';
import { useAbortController } from '@/hooks/useAbortController';
import type { BoardInfo } from '../board/boardModel';
import {
    isTazBoardSaved,
    saveTazBoard,
} from '../persistence/tazDocumentService';

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const FILE_TREE_REFRESH_ERROR_MESSAGE =
    'TAZ file saved, but file tree refresh failed.';

type SaveDestination = {
    directoryPath: string;
    fileName: string;
};

type UseBoardSaveParams = {
    board: BoardInfo;
    isActive: boolean;
    applySaveResult: (savedBoard: BoardInfo) => void;
    onSavedBoard: (savedBoard: BoardInfo) => void;
    onFileSaved: (directoryPath: string, fileName: string) => Promise<void>;
};

export function useBoardSave({
    board,
    isActive,
    applySaveResult,
    onSavedBoard,
    onFileSaved,
}: UseBoardSaveParams) {
    const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
    const { createSignal, abort } = useAbortController();

    useLayoutEffect(() => abort, [abort, board.id]);

    const save = useCallback(async (
        destination?: SaveDestination,
    ): Promise<boolean> => {
        if (!destination && !board.path) {
            setIsSaveAsOpen(true);
            return false;
        }

        const signal = createSignal();
        const boardToSave: BoardInfo = destination
            ? {
                  ...board,
                  path: destination.directoryPath,
                  name: destination.fileName,
              }
            : board;
        const savedBoard = await saveTazBoard(boardToSave);

        if (!savedBoard) {
            if (!signal.aborted) Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        }
        if (signal.aborted) return false;

        applySaveResult(savedBoard);
        onSavedBoard(savedBoard);
        Toast.success(SAVE_SUCCESS_MESSAGE, {
            testId: 'tag-analyzer-save-success-toast',
        });

        if (destination) {
            try {
                await onFileSaved(
                    destination.directoryPath,
                    destination.fileName,
                );
            } catch {
                Toast.error(FILE_TREE_REFRESH_ERROR_MESSAGE);
            }
        }

        return !signal.aborted;
    }, [applySaveResult, board, createSignal, onFileSaved, onSavedBoard]);

    useEffect(() => {
        if (!isActive) {
            setIsSaveAsOpen(false);
            return undefined;
        }

        function handleSaveShortcut(event: KeyboardEvent): void {
            if (
                !(event.ctrlKey || event.metaKey) ||
                event.key.toLowerCase() !== 's'
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void save();
        }

        document.addEventListener('keydown', handleSaveShortcut, true);
        return () =>
            document.removeEventListener(
                'keydown',
                handleSaveShortcut,
                true,
            );
    }, [isActive, save]);

    const saveAs = useCallback(
        (directoryPath: string, fileName: string) =>
            save({ directoryPath, fileName }),
        [save],
    );
    const openSaveAs = useCallback(() => setIsSaveAsOpen(true), []);
    const closeSaveAs = useCallback(() => setIsSaveAsOpen(false), []);

    return {
        hasUnsavedChanges: !isTazBoardSaved(board),
        isSaveAsOpen,
        save,
        saveAs,
        openSaveAs,
        closeSaveAs,
    };
}
