import { isBoardSaved } from './boardSaveStatus';
import { createTazBoardSnapshot } from '@/components/tagAnalyzer/persistence/tazBoardSnapshot';

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
        ...(fileType === 'json' && typeof submitted === 'object' && board.code === submitted
            ? { code: savedCode }
            : {}),
        savedCode,
    };
};

/** Reuse each format's existing saved-state comparison, including WRK/DSH/TAZ. */
export const hasBoardContentChanged = (board: any, previous: any): boolean => {
    if (board.type !== previous.type) return true;
    const submitted = previous.type === 'taz'
        ? createTazBoardSnapshot(previous)
        : getBoardSaveData(previous);
    return !isBoardSaved(applyBoardSaveResult(board, previous.type, submitted));
};
