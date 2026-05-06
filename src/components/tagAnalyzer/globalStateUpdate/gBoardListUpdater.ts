import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../BoardTypes';
import type { PanelInfo } from '../PanelModelTypes';
import { mapBoardToPersistedTaz } from '../persistence/save/mapBoardToPersistedTaz';
import { mapPanelToPersistedTaz } from '../persistence/save/mapPanelToPersistedTaz';
import type {
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from '../persistence/TazPersistenceTypesV200';
import type { PersistedPanelInfoV201 } from '../persistence/TazPersistenceTypesV201';
import { TAZ_FORMAT_VERSION } from '../persistence/load/parseLoadedTaz';

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
    return boards.map((board) =>
        board.id === savedBoard.id
            ? (savedBoard as unknown as GBoardListType)
            : board,
    );
}

export function getNextBoardListWithAppendedPersistedPanel(
    boards: GlobalBoardListState,
    boardId: string,
    panel: PersistedPanelInfoV201,
): GlobalBoardListState {
    return boards.map((board) =>
        board.id === boardId
            ? {
                ...board,
                version: TAZ_FORMAT_VERSION,
                panels: board.panels.concat(panel),
            }
            : board,
    );
}

/**
 * Replaces one board's panels with the current persisted panel list.
 * Intent: Keep `.taz` board-list mutation logic near workspace state instead of the persistence serializer.
 * @param {GlobalBoardListState} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {PanelInfo[]} panels The runtime panels to persist.
 * @returns {GlobalBoardListState} The updated board list.
 */
export function getNextBoardListWithSavedPanels(
    boards: GlobalBoardListState,
    boardId: string,
    panels: PanelInfo[],
): GlobalBoardListState {
    return updateBoardPanels(boards, boardId, createPersistedPanelList(panels));
}

/**
 * Replaces one persisted panel inside the target board.
 * Intent: Update one saved panel while preserving the rest of the board tab state.
 * @param {GlobalBoardListState} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {string} panelKey The panel key to replace.
 * @param {PanelInfo} panelInfo The runtime panel to persist.
 * @returns {GlobalBoardListState} The updated board list.
 */
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

/**
 * Removes one persisted panel from the target board.
 * Intent: Keep deleted panels out of the saved `.taz` snapshot stored on the board tab.
 * @param {GlobalBoardListState} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {string} panelKey The panel key to remove.
 * @returns {GlobalBoardListState} The updated board list.
 */
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

/**
 * Replaces one board tab with the current `.taz` board snapshot.
 * Intent: Keep shared tab-only fields out of raw `.taz` saves even when shared save code serializes the tab object.
 * @param {GlobalBoardListState} boards The current board list.
 * @param {BoardInfo} boardInfo The normalized runtime TagAnalyzer board.
 * @returns {GlobalBoardListState} The updated board list.
 */
export function getNextBoardListWithPersistedBoardInfo(
    boards: GlobalBoardListState,
    boardInfo: BoardInfo,
): GlobalBoardListState {
    let sHasChanges = false;

    const sNextBoards = boards.map((board) => {
        if (board.id !== boardInfo.id) {
            return board;
        }

        const sNextBoard = createPersistedBoardTabSnapshot(board, boardInfo);
        if (isSameBoardSnapshot(board, sNextBoard)) {
            return board;
        }

        sHasChanges = true;
        return sNextBoard;
    });

    return sHasChanges ? sNextBoards : boards;
}

function updateBoardPanels(
    boards: GlobalBoardListState,
    boardId: string,
    panels: PersistedPanelInfoV201[],
): GlobalBoardListState {
    return boards.map((board) =>
        board.id === boardId
            ? { ...board, version: TAZ_FORMAT_VERSION, panels: panels }
            : board,
    );
}

function findBoardPanels(
    boards: GlobalBoardListState,
    boardId: string,
): PersistedTazPanelInfo[] | undefined {
    return boards.find((board) => board.id === boardId)?.panels as
        | PersistedTazPanelInfo[]
        | undefined;
}

function createPersistedPanelList(panels: PanelInfo[]): PersistedPanelInfoV201[] {
    return panels.map((panelInfo) => mapPanelToPersistedTaz(panelInfo));
}

function replacePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
    panelInfo: PanelInfo,
): PersistedPanelInfoV201[] {
    const sPersistedPanel = mapPanelToPersistedTaz(panelInfo);

    return panels.map((panel) =>
        getPersistedPanelKey(panel) === panelKey
            ? sPersistedPanel
            : (panel as PersistedPanelInfoV201),
    );
}

function removePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
): PersistedPanelInfoV201[] {
    return panels
        .filter((panel) => getPersistedPanelKey(panel) !== panelKey)
        .map((panel) => panel as PersistedPanelInfoV201);
}

function getPersistedPanelKey(panel: PersistedTazPanelInfo): string | undefined {
    if ('index_key' in panel && typeof panel.index_key === 'string') {
        return panel.index_key;
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


