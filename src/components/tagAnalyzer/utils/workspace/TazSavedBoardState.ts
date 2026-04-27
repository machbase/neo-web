import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import { createPersistedTazBoardInfo } from '../persistence/save/TazBoardSaveMapper';
import { createPersistedPanelInfo } from '../persistence/save/TazPanelSaveMapper';
import type { PersistedPanelInfoV200 } from '../persistence/TazPanelPersistenceTypes';
import type { PersistedTazPanelInfo } from '../persistence/TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../persistence/versionParsing/TazVersionResolver';

/**
 * Replaces one board's panels with the current persisted panel list.
 * Intent: Keep `.taz` board-list mutation logic near workspace state instead of the persistence serializer.
 * @param {GBoardListType[]} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {PanelInfo[]} panels The runtime panels to persist.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanels(
    boards: GBoardListType[],
    boardId: string,
    panels: PanelInfo[],
): GBoardListType[] {
    return updateBoardPanels(boards, boardId, createPersistedPanelList(panels));
}

/**
 * Replaces one persisted panel inside the target board.
 * Intent: Update one saved panel while preserving the rest of the board tab state.
 * @param {GBoardListType[]} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {string} panelKey The panel key to replace.
 * @param {PanelInfo} panelInfo The runtime panel to persist.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanel(
    boards: GBoardListType[],
    boardId: string,
    panelKey: string,
    panelInfo: PanelInfo,
): GBoardListType[] {
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
 * @param {GBoardListType[]} boards The current board list.
 * @param {string} boardId The board id to update.
 * @param {string} panelKey The panel key to remove.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithoutPanel(
    boards: GBoardListType[],
    boardId: string,
    panelKey: string,
): GBoardListType[] {
    const sPanels = findBoardPanels(boards, boardId);
    if (!sPanels) {
        return boards;
    }

    return updateBoardPanels(boards, boardId, removePersistedPanel(sPanels, panelKey));
}

/**
 * Replaces one board tab with the current `.taz` 2.0.0 board snapshot.
 * Intent: Keep shared tab-only fields out of raw `.taz` saves even when shared save code serializes the tab object.
 * @param {GBoardListType[]} boards The current board list.
 * @param {BoardInfo} boardInfo The normalized runtime TagAnalyzer board.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithPersistedBoardInfo(
    boards: GBoardListType[],
    boardInfo: BoardInfo,
): GBoardListType[] {
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
    boards: GBoardListType[],
    boardId: string,
    panels: PersistedPanelInfoV200[],
): GBoardListType[] {
    return boards.map((board) =>
        board.id === boardId
            ? { ...board, version: TAZ_FORMAT_VERSION, panels: panels }
            : board,
    );
}

function findBoardPanels(
    boards: GBoardListType[],
    boardId: string,
): PersistedTazPanelInfo[] | undefined {
    return boards.find((board) => board.id === boardId)?.panels as
        | PersistedTazPanelInfo[]
        | undefined;
}

function createPersistedPanelList(panels: PanelInfo[]): PersistedPanelInfoV200[] {
    return panels.map((panelInfo) => createPersistedPanelInfo(panelInfo));
}

function replacePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
    panelInfo: PanelInfo,
): PersistedPanelInfoV200[] {
    const sPersistedPanel = createPersistedPanelInfo(panelInfo);

    return panels.map((panel) =>
        getPersistedPanelKey(panel) === panelKey
            ? sPersistedPanel
            : (panel as PersistedPanelInfoV200),
    );
}

function removePersistedPanel(
    panels: PersistedTazPanelInfo[],
    panelKey: string,
): PersistedPanelInfoV200[] {
    return panels
        .filter((panel) => getPersistedPanelKey(panel) !== panelKey)
        .map((panel) => panel as PersistedPanelInfoV200);
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
    const sPersistedBoard = createPersistedTazBoardInfo(boardInfo);

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
