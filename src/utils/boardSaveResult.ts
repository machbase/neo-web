import {stampFileSnapshot} from '@/api/repository/fileWriteQueue';
import { isBoardContentSaved } from './boardSaveStatus';
import { createTazBoardSnapshot } from '@/components/tagAnalyzer/persistence/tazBoardSnapshot';
import { afterOverwrite, isTabOnFile } from './boardAfterOverwrite';

/** The same submitted content is used for writes and snapshot comparisons. */
export const getBoardSaveData = (board: any, fileType = board.type): any =>
    fileType === 'wrk' ? { data: board.sheet } : fileType === 'dsh' ? board : board.code;

/** A successful save acknowledges its submitted snapshot, never later edits. */
export const applyBoardSaveResult = <T extends { code: any; savedCode: any }>(
    board: T,
    fileType: string,
    submitted: any,
): T => {
    if (fileType === 'taz') {
        return {
            ...board,
            version: submitted.version,
            code: submitted.code,
            loadWarning: submitted.loadWarning,
            savedCode: submitted.savedCode,
        };
    }

    const savedCode = fileType === 'wrk'
        ? JSON.stringify(submitted.data)
        : fileType === 'dsh'
          ? JSON.stringify(submitted.dashboard)
          : fileType === 'json' && typeof submitted === 'object'
            ? JSON.stringify(submitted, null, 4)
            : submitted;

    return {
        ...board,
        ...(fileType === 'json' && typeof submitted === 'object' && JSON.stringify(board.code) === JSON.stringify(submitted)
            ? { code: savedCode }
            : {}),
        savedCode,
    };
};

/** File writes are ordered by the shared queue. Every success updates that file's
 * baseline, even if a later tab action superseded the writer or another tab reopened it.
 * Contents, tab identity and unrelated files are never replaced here. */
export const applyFileSaveResult = <T extends { id: string; code: any; savedCode: any; name?: string; path?: string }>(
    boards: T[], target: { path: string; name: string }, fileType: string, submitted: any,
): T[] => boards.map(board => isTabOnFile(board, target, true) ? stampFileSnapshot(applyBoardSaveResult(board, fileType, submitted), target.path + target.name) : board);

/** The loader already computed the file's baseline, including compatibility formats.
 * A read never changes current contents, tab identity or editor metadata. */
export const applyFileReadResult = <T extends { id: string; code: any; savedCode: any; name?: string; path?: string }>(
    boards: T[], loaded: any,
): T[] => boards.map(board => isTabOnFile(board, loaded, true) ? stampFileSnapshot({ ...board, savedCode: loaded.savedCode }, loaded.path + loaded.name) : board);

/** A lost response cannot confirm the old baseline: the server may already have written the file. */
export const invalidateFileSaveResult = <T extends { name?: string; path?: string; id: string; savedCode: any }>(
    boards: T[], target: { path: string; name: string },
): T[] => boards.map(board => isTabOnFile(board, target, true) ? { ...board, savedCode: false } : board);

/** Reuse each format's existing saved-state comparison, including WRK/DSH/TAZ. */
export const hasBoardContentChanged = (board: any, previous: any): boolean => {
    if (board.type !== previous.type) return true;
    const submitted = previous.type === 'taz'
        ? createTazBoardSnapshot(previous)
        : getBoardSaveData(previous);
    return !isBoardContentSaved(applyBoardSaveResult(board, previous.type, submitted));
};


/** Common Save As protection for text, worksheet, dashboard and TAZ editors. */
export const applySaveAsResult = <T extends {id: string; name: string; path: string; type: string; code: any; savedCode: any}>(
    boards: T[], options: {
        owner: {id: string; name: string; path: string};
        target: {name: string; path: string};
        fileType: string; submitted: any; sourceIsCurrent: boolean; confirmed: boolean;
        previousBoards?: ReadonlyMap<string, any>;
        isSaving: (board: T) => boolean;
    },
): T[] => {
    const {owner, target, fileType, submitted, sourceIsCurrent, confirmed, previousBoards, isSaving} = options;
    const destinationIsSaving = boards.some(board => board.id !== owner.id && isTabOnFile(board, target, true) && isSaving(board));
    if (destinationIsSaving) {
        return applyFileSaveResult(boards, target, fileType, submitted).map(board =>
            board.id === owner.id && sourceIsCurrent && isTabOnFile(board, target, true)
                ? {...board, path: '', savedCode: false} : board);
    }
    if (!sourceIsCurrent) return applyFileSaveResult(boards, target, fileType, submitted);
    const protectedBoards = confirmed ? boards.map(board => {
        if (board.id === owner.id || !isTabOnFile(board, target, true)) return board;
        const previous = previousBoards?.get(board.id);
        // Without an opening snapshot, retain any dirty destination as a draft.
        const changed = previousBoards ? !previous || previous.path !== board.path || previous.name !== board.name || hasBoardContentChanged(board, previous) : !isBoardContentSaved(board);
        return changed ? {...board, path: '', savedCode: false} : board;
    }) : boards;
    return afterOverwrite(applyFileSaveResult(protectedBoards, target, fileType, submitted), {...target, currentTabId: owner.id, confirmed}, board => ({
        ...stampFileSnapshot(applyBoardSaveResult(board, fileType, submitted), target.path + target.name), name: target.name, path: target.path,
    }));
};

/** Publish only the file binding. Editing state, IDs and new draft tabs survive. */
export const applyFileMoveResult = <T extends {path: string; name: string; savedCode: any}>(
    boards: T[], destination: (path: string) => string | null | undefined,
): T[] => boards.map(board => {
    if (!board.path) return board;
    const target = destination(board.path + board.name);
    if (target === undefined) return board;
    if (target === null) return {...board, path: '', savedCode: false};
    const separator = target.lastIndexOf('/');
    return stampFileSnapshot({...board, path: target.slice(0, separator + 1), name: target.slice(separator + 1)}, target);
});

/** A confirmed deletion closes clean proven aliases. Edited or unproven
 * editors keep their content as drafts through the existing move binding rules. */
export const applyFileDeleteResult = <T extends {path: string; name: string; savedCode: any}>(
    boards: T[], relation: (path: string) => 'same' | 'different' | 'unknown',
): T[] => applyFileMoveResult(
    boards.filter(board => !board.path || relation(board.path + board.name) !== 'same' || !isBoardContentSaved(board)),
    path => relation(path) === 'different' ? undefined : null,
);
