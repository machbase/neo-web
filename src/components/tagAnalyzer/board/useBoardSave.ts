import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Toast } from '@/design-system/components';
import { useAbortController } from '@/hooks/useAbortController';
import { saveBoardFile } from '@/utils/boardFileSave';
import type { OverwriteDecision } from '@/utils/fileExistence';
import { applyBoardSaveResult } from '@/utils/boardSaveResult';
import { isTabOnFile } from '@/utils/boardAfterOverwrite';
import type { BoardInfo } from './boardModel';
import {isBoardSaved} from '@/utils/boardSaveStatus';
import {subscribeFileOperations, getFileOperationVersion} from '@/api/repository/fileWriteQueue';

export function useBoardSave({
    board,
    isActive,
    applySaveResult,
    onSavedBoard,
    onFileSaved,
    getSaveBoards,
}: UseBoardSaveParams) {
    useSyncExternalStore(subscribeFileOperations, getFileOperationVersion, getFileOperationVersion);
    const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
    const { createSignal, releaseSignal, isCurrentLifetime, abort } = useAbortController();
    const currentBoard = useRef(board);
    currentBoard.current = board;

    useLayoutEffect(() => abort, [abort, board.id]);

    const save = useCallback(async (
        destination?: SaveDestination,
    ): Promise<boolean> => {
        if (!destination && !board.path) {
            setIsSaveAsOpen(true);
            return false;
        }

        const signal = createSignal();
        const before = destination?.before ?? (destination && getSaveBoards ? new Map(getSaveBoards().map(info => [info.id, info])) : undefined);
        const boardToSave: BoardInfo = destination
            ? {
                  ...board,
                  path: destination.directoryPath,
                  name: destination.fileName,
              }
            : board;
        // The dialog's intent survives neither Cancel nor a newer save. Unlike
        // the pre-write owner check, this remains valid after a normal rebind.
        const canFinishSave = () => isCurrentLifetime(signal) && !signal.aborted && (destination?.canWrite?.() ?? true);
        const canWrite = () => isCurrentLifetime(signal) && (!destination || (
            canFinishSave() &&
            currentBoard.current.id === board.id && currentBoard.current.name === board.name && currentBoard.current.path === board.path
        ));
        try {
            let overwritten = !!destination?.overwritten;
            let latestAction = true;
            let failureReason: string | undefined;
            const success = await saveBoardFile({
                board: boardToSave,
                saveAs: !!destination,
                beforeWrite: async () => {
                    if (!canWrite()) return false;
                    if (!destination) return true;
                    if (signal.aborted) return false;
                    if (destination.prepare) {
                        const decision = await destination.prepare();
                        if (decision.status !== 'none' && decision.status !== 'confirmed') return false;
                        overwritten = decision.status === 'confirmed';
                    }
                    return canWrite();
                },
                onFailure: reason => {failureReason = reason;},
                canApply: () => isCurrentLifetime(signal),
                canWrite,
                getSaveBoards,
                onRead: loaded => {
                    const actualOwner = onSavedBoard(loaded, { overwritten: false, acknowledgementOnly: true });
                    if (isCurrentLifetime(signal) && isTabOnFile(currentBoard.current, loaded, true)) {
                        applySaveResult(actualOwner || applyBoardSaveResult(currentBoard.current, 'taz', loaded));
                    }
                },
                onSuccess: (savedBoard, context) => {
                    latestAction = context.isLatestAction;
                    if (!canFinishSave() || !latestAction) {
                        const acknowledged = isTabOnFile(currentBoard.current, savedBoard, true)
                            ? applyBoardSaveResult(currentBoard.current, 'taz', savedBoard) : savedBoard;
                        const actualOwner = onSavedBoard(acknowledged, { overwritten: false, acknowledgementOnly: true });
                        if (isCurrentLifetime(signal) && isTabOnFile(currentBoard.current, savedBoard, true)) applySaveResult(actualOwner || acknowledged);
                        return;
                    }
                    const acknowledged = {
                        ...applyBoardSaveResult(currentBoard.current, 'taz', savedBoard),
                        name: savedBoard.name, path: savedBoard.path,
                    };
                    const actualOwner = onSavedBoard(acknowledged, {
                        overwritten, isSaving: context.isSaving,
                        ...(destination ? {saveAs: true, owner: board, before} : {}),
                    });
                    applySaveResult(actualOwner || acknowledged);
                },
                onUncertain: (target = boardToSave) => {
                    const unknownFile = { ...boardToSave, name: target.name, path: target.path, savedCode: false as const };
                    const unknownBoard = isTabOnFile(currentBoard.current, unknownFile, true)
                        ? applyBoardSaveResult(currentBoard.current, 'taz', unknownFile) : unknownFile;
                    const actualOwner = onSavedBoard(unknownBoard, { overwritten: false, acknowledgementOnly: true });
                    if (isCurrentLifetime(signal) && isTabOnFile(currentBoard.current, unknownBoard, true)) applySaveResult(actualOwner || unknownBoard);
                },
            });
            if (!success || !canFinishSave() || !latestAction) {
                if (!success && !signal.aborted && canWrite()) Toast.error(failureReason ?? SAVE_ERROR_MESSAGE);
                return false;
            }
            Toast.success(SAVE_SUCCESS_MESSAGE, {
                testId: 'tag-analyzer-save-success-toast',
            });

            if (destination) {
                try {
                    await onFileSaved(destination.directoryPath, destination.fileName, canFinishSave);
                } catch {
                    if (canFinishSave()) Toast.error(FILE_TREE_REFRESH_ERROR_MESSAGE);
                }
            }
            return canFinishSave();
        } catch {
            if (!isCurrentLifetime(signal)) return false;
            if (!signal.aborted) Toast.error(SAVE_ERROR_MESSAGE);
            return false;
        } finally {
            releaseSignal(signal);
        }
    }, [applySaveResult, board, createSignal, isCurrentLifetime, onFileSaved, onSavedBoard, releaseSignal, getSaveBoards]);

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
        (directoryPath: string, fileName: string, overwritten?: boolean, before?: ReadonlyMap<string, BoardInfo>, prepare?: () => Promise<OverwriteDecision>, canWrite?: () => boolean) =>
            save({ directoryPath, fileName, overwritten, before, prepare, canWrite }),
        [save],
    );
    const openSaveAs = useCallback(() => setIsSaveAsOpen(true), []);
    const closeSaveAs = useCallback(() => setIsSaveAsOpen(false), []);

    return {
        hasUnsavedChanges: !isBoardSaved(board),
        isSaveAsOpen,
        save,
        saveAs,
        openSaveAs,
        closeSaveAs,
    };
}

// -------------------- Local --------------------

const SAVE_ERROR_MESSAGE = 'Failed to save TAZ file. Please try again.';
const SAVE_SUCCESS_MESSAGE = 'TAZ file saved successfully.';
const FILE_TREE_REFRESH_ERROR_MESSAGE =
    'TAZ file saved, but file tree refresh failed.';

type SaveDestination = {
    directoryPath: string;
    fileName: string;
    overwritten?: boolean;
    before?: ReadonlyMap<string, BoardInfo>;
    prepare?: () => Promise<OverwriteDecision>;
    canWrite?: () => boolean;
};

type UseBoardSaveParams = {
    board: BoardInfo;
    isActive: boolean;
    applySaveResult: (savedBoard: BoardInfo) => void;
    onSavedBoard: (savedBoard: BoardInfo, opts: SavedBoardOptions) => BoardInfo | void;
    getSaveBoards?: () => BoardInfo[];
    onFileSaved: (directoryPath: string, fileName: string, canApply?: () => boolean) => Promise<void>;
};


export type SavedBoardOptions = {
    overwritten: boolean;
    acknowledgementOnly?: boolean;
    isSaving?: (board: {id: string}) => boolean;
    saveAs?: boolean;
    owner?: Pick<BoardInfo, 'id' | 'name' | 'path'>;
    before?: ReadonlyMap<string, BoardInfo>;
};
