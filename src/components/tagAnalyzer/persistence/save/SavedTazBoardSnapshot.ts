import type { BoardInfo } from '../../domain/BoardDomain';
import { TAZ_FORMAT_VERSION } from '../TazVersion';

type TazSavedStateCarrier = {
    boardTimeRange?: unknown;
    panels: unknown[];
};

export function createSavedTazBoardSnapshot(boardInfo: BoardInfo): BoardInfo {
    const sSavedState = cloneTazSavedState(boardInfo);

    return {
        ...boardInfo,
        boardTimeRange: sSavedState.boardTimeRange as BoardInfo['boardTimeRange'],
        panels: sSavedState.panels as BoardInfo['panels'],
        version: TAZ_FORMAT_VERSION,
        code: '',
        savedCode: serializeTazSavedState(sSavedState),
    };
}

export function normalizeTazBoardForSavedState(boardInfo: BoardInfo): BoardInfo {
    const sSavedState = cloneTazSavedState(boardInfo);

    return {
        ...boardInfo,
        boardTimeRange: sSavedState.boardTimeRange as BoardInfo['boardTimeRange'],
        panels: sSavedState.panels as BoardInfo['panels'],
    };
}

export function createTazSavedCodeFromBoardInfo(board: BoardInfo): string {
    return serializeTazSavedState(cloneTazSavedState(board));
}

function cloneTazSavedState(board: TazSavedStateCarrier): TazSavedStateCarrier {
    return JSON.parse(
        JSON.stringify({
            boardTimeRange: board.boardTimeRange,
            panels: board.panels,
        }),
    ) as TazSavedStateCarrier;
}

function serializeTazSavedState(board: TazSavedStateCarrier): string {
    if (board.boardTimeRange === undefined) {
        return JSON.stringify(board.panels);
    }

    return JSON.stringify({
        boardTimeRange: board.boardTimeRange,
        panels: board.panels,
    });
}
