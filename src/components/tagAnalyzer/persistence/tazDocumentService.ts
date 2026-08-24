import { deepEqual } from '@/utils';
import { tazFileApi } from '../api/tazFileApi';
import type { BoardInfo } from '../board/boardModel';
import { isPlainObject } from '../objectGuards';
import {
    encodeTazBoard,
    getOutdatedTazFormatWarning,
    TAZ_FORMAT_VERSION,
} from './tazFormat';
import { parseLoadedTaz } from './tazMigrations';
import { isRangeExpressionEmpty } from '../range/rangeModel';

type TazBoardSnapshotState = Pick<
    ReturnType<typeof encodeTazBoard>,
    'boardTimeRange' | 'boardNumericRange' | 'panels'
>;

const EMPTY_BOARD_RANGE = { start: '', end: '' };

function createTazBoardSnapshot(boardInfo: BoardInfo): BoardInfo {
    const sSnapshotState = createTazBoardSnapshotState(boardInfo);

    return {
        ...boardInfo,
        savedCode: JSON.stringify(sSnapshotState),
    };
}

export function isTazBoardSaved(boardInfo: BoardInfo): boolean {
    if (typeof boardInfo.savedCode !== 'string') return false;

    try {
        const sSavedState: unknown = JSON.parse(boardInfo.savedCode);
        return isTazBoardSnapshotSaved(boardInfo, sSavedState);
    } catch {
        return false;
    }
}

function isTazBoardSnapshotSaved(
    boardInfo: BoardInfo,
    savedState: unknown,
): boolean {
    if (Array.isArray(savedState)) {
        const sBoardNumericRange =
            boardInfo.boardNumericRange ?? EMPTY_BOARD_RANGE;

        return isRangeExpressionEmpty(sBoardNumericRange) && deepEqual(
            normalizeLegacyPanelSnapshot(boardInfo.panels),
            normalizeLegacyPanelSnapshot(savedState),
        );
    }

    if (!isPlainObject(savedState) || !Array.isArray(savedState.panels)) {
        return false;
    }

    const sSavedSnapshot = {
        boardTimeRange: savedState.boardTimeRange,
        boardNumericRange:
            savedState.boardNumericRange ?? EMPTY_BOARD_RANGE,
        panels: savedState.panels,
    };
    const sUsesRuntimePanelShape = savedState.panels.some(
        (panel) => isPlainObject(panel) && 'time' in panel,
    );

    if (sUsesRuntimePanelShape) {
        return deepEqual(
            createComparableRuntimeSnapshot(boardInfo),
            createComparableRuntimeSnapshot(sSavedSnapshot),
        );
    }

    return deepEqual(createTazBoardSnapshotState(boardInfo), sSavedSnapshot);
}

function createComparableRuntimeSnapshot(snapshot: {
    boardTimeRange: unknown;
    boardNumericRange?: unknown;
    panels: readonly unknown[];
}) {
    return {
        boardTimeRange: snapshot.boardTimeRange,
        boardNumericRange: snapshot.boardNumericRange ?? EMPTY_BOARD_RANGE,
        panels: normalizeLegacyPanelSnapshot(snapshot.panels),
    };
}

function createTazBoardSnapshotState(
    boardInfo: BoardInfo,
): TazBoardSnapshotState {
    const sPersistedBoard = encodeTazBoard({
        ...boardInfo,
        boardNumericRange:
            boardInfo.boardNumericRange ?? EMPTY_BOARD_RANGE,
    });

    return JSON.parse(JSON.stringify({
        boardTimeRange: sPersistedBoard.boardTimeRange,
        boardNumericRange: sPersistedBoard.boardNumericRange,
        panels: sPersistedBoard.panels,
    })) as TazBoardSnapshotState;
}

function normalizeLegacyPanelSnapshot(panels: readonly unknown[]): unknown[] {
    return panels.map((panel) => isPlainObject(panel)
        ? { ...panel, isOverlapSelected: false }
        : panel);
}

export function loadTazBoard(
    parsedTaz: unknown,
    id: string,
    name: string,
    path: string,
): BoardInfo {
    const sLoadedBoardInfo = parseLoadedTaz(parsedTaz);
    return createTazBoardSnapshot({
        ...sLoadedBoardInfo,
        id,
        name,
        path,
        type: 'taz',
        code: '',
        loadWarning: getOutdatedTazFormatWarning(
            sLoadedBoardInfo.version,
            sLoadedBoardInfo.panels.length,
        ),
    });
}

export async function saveTazBoard(
    boardInfo: BoardInfo,
): Promise<BoardInfo | undefined> {
    try {
        const sSavedBoard = createTazBoardSnapshot({
            ...boardInfo,
            version: TAZ_FORMAT_VERSION,
            code: '',
            loadWarning: undefined,
        });
        const sDidSave = await tazFileApi.saveTazFile({
            payload: encodeTazBoard(sSavedBoard),
            directoryPath: boardInfo.path,
            fileName: boardInfo.name,
        });

        return sDidSave ? sSavedBoard : undefined;
    } catch {
        return undefined;
    }
}
