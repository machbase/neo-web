import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../domain/BoardDomain';
import type { PanelInfo } from '../domain/PanelDomain';
import { mapBoardToPersistedTaz } from '../persistence/save/mapBoardToPersistedTaz';
import { mapPanelToPersistedTaz } from '../persistence/save/mapPanelToPersistedTaz';
import type {
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from '../persistence/TazPersistenceTypesV200';
import type { PersistedPanelInfoV204 } from '../persistence/TazPersistenceTypesV204';
import { TAZ_FORMAT_VERSION } from '../persistence/load/parseLoadedTaz';
import { cloneTimeBoundary } from '../persistence/PersistenceCloneUtils';
import type { TimeRangeConfig } from '../domain/time/TimeTypes';

export type GlobalBoardListState = GBoardListType[];

export type UpdateGlobalBoardList = (
    updater: (boards: GlobalBoardListState) => GlobalBoardListState,
) => void;

type SavedBoardSnapshot = PersistedTazBoardInfo & {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    savedCode: string | false;
};

export function getNextBoardListWithSavedBoard(
    boards: GlobalBoardListState,
    savedBoard: SavedBoardSnapshot,
): GlobalBoardListState {
    return updateBoard(boards, savedBoard.id, () => savedBoard as unknown as GBoardListType);
}

export function getNextBoardListWithAppendedPersistedPanel(
    boards: GlobalBoardListState,
    boardId: string,
    panel: PersistedTazPanelInfo,
): GlobalBoardListState {
    return updateBoard(boards, boardId, (board) => ({
        ...board,
        version: TAZ_FORMAT_VERSION,
        panels: board.panels.concat(panel),
    }));
}
export function getNextBoardListWithSavedPanels(
    boards: GlobalBoardListState,
    boardId: string,
    panels: PanelInfo[],
): GlobalBoardListState {
    return updateBoardPanels(boards, boardId, createPersistedPanelList(panels));
}
export function getNextBoardListWithSavedPanel(
    boards: GlobalBoardListState,
    boardId: string,
    panelKey: string,
    panelInfo: PanelInfo,
): GlobalBoardListState {
    const sPanels = findBoardPanels(boards, boardId);
    if (!sPanels) {
        return boards;
    }

    return updateBoardPanels(
        boards,
        boardId,
        replacePersistedPanel(sPanels, panelKey, panelInfo),
    );
}

export function getNextBoardListWithBoardTimeRange(
    boards: GlobalBoardListState,
    boardId: string,
    boardTimeRange: TimeRangeConfig,
): GlobalBoardListState {
    return updateBoard(boards, boardId, (board) => ({
        ...board,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: cloneBoardTimeRange(boardTimeRange),
    } as unknown as GBoardListType));
}
export function getNextBoardListWithoutPanel(
    boards: GlobalBoardListState,
    boardId: string,
    panelKey: string,
): GlobalBoardListState {
    const sPanels = findBoardPanels(boards, boardId);
    if (!sPanels) {
        return boards;
    }

    return updateBoardPanels(boards, boardId, removePersistedPanel(sPanels, panelKey));
}
export function getNextBoardListWithPersistedBoardInfo(
    boards: GlobalBoardListState,
    boardInfo: BoardInfo,
): GlobalBoardListState {
    let sHasChanges = false;

    const sNextBoards = updateBoard(boards, boardInfo.id, (board) => {
        const sNextBoard = createPersistedBoardTabSnapshot(board, boardInfo);
        if (isSameBoardSnapshot(board, sNextBoard)) {
            return board;
        }

        sHasChanges = true;
        return sNextBoard;
    });

    return sHasChanges ? sNextBoards : boards;
}

function updateBoard(
    boards: GlobalBoardListState,
    boardId: string,
    update: (board: GBoardListType) => GBoardListType,
): GlobalBoardListState {
    return boards.map((board) => (board.id === boardId ? update(board) : board));
}

function updateBoardPanels(
    boards: GlobalBoardListState,
    boardId: string,
    panels: PersistedPanelInfoV204[],
): GlobalBoardListState {
    return updateBoard(boards, boardId, (board) => ({
        ...board,
        version: TAZ_FORMAT_VERSION,
        panels,
    }));
}

function cloneBoardTimeRange(boardTimeRange: TimeRangeConfig): TimeRangeConfig {
    return {
        start: cloneTimeBoundary(boardTimeRange.start),
        end: cloneTimeBoundary(boardTimeRange.end),
    };
}

function findBoardPanels(
    boards: GlobalBoardListState,
    boardId: string,
): PersistedTazPanelInfo[] | undefined {
    return boards.find((board) => board.id === boardId)?.panels as
        | PersistedTazPanelInfo[]
        | undefined;
}

function createPersistedPanelList(panels: PanelInfo[]): PersistedPanelInfoV204[] {
    return panels.map((panelInfo) => mapPanelToPersistedTaz(panelInfo));
}

function replacePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
    panelInfo: PanelInfo,
): PersistedPanelInfoV204[] {
    const sPersistedPanel = mapPanelToPersistedTaz(panelInfo);

    return panels.map((panel) =>
        getPersistedPanelKey(panel) === panelKey
            ? sPersistedPanel
            : (panel as PersistedPanelInfoV204),
    );
}

function removePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
): PersistedPanelInfoV204[] {
    return panels
        .filter((panel) => getPersistedPanelKey(panel) !== panelKey)
        .map((panel) => panel as PersistedPanelInfoV204);
}

function getPersistedPanelKey(panel: PersistedTazPanelInfo): string | undefined {
    if ('index_key' in panel && typeof panel.index_key === 'string') {
        return panel.index_key;
    }

    if ('data' in panel && panel.data && typeof panel.data === 'object') {
        const sData = panel.data as Record<string, unknown>;

        if (typeof sData.index_key === 'string') {
            return sData.index_key;
        }
    }

    if ('meta' in panel && panel.meta && typeof panel.meta === 'object') {
        const sMeta = panel.meta as Record<string, unknown>;

        if (typeof sMeta.index_key === 'string') {
            return sMeta.index_key;
        }

        if (typeof sMeta.panelKey === 'string') {
            return sMeta.panelKey;
        }
    }

    return undefined;
}

function createPersistedBoardTabSnapshot(
    currentBoard: GBoardListType,
    boardInfo: BoardInfo,
): GBoardListType {
    const sPersistedBoard = mapBoardToPersistedTaz(boardInfo);

    return {
        id: sPersistedBoard.id,
        type: sPersistedBoard.type,
        name: boardInfo.name,
        path: currentBoard.path,
        code: '',
        panels: sPersistedBoard.panels,
        boardTimeRange: sPersistedBoard.boardTimeRange,
        savedCode: currentBoard.savedCode ?? false,
        version: sPersistedBoard.version,
    } as unknown as GBoardListType;
}

function isSameBoardSnapshot(
    currentBoard: GBoardListType,
    nextBoard: GBoardListType,
): boolean {
    return JSON.stringify(currentBoard) === JSON.stringify(nextBoard);
}


