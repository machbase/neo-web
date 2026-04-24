import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import { createPersistedTazBoardInfo } from '../persistence/save/TazBoardSaveMapper';
import { createPersistedPanelInfo } from '../persistence/save/TazPanelSaveMapper';
import type { PersistedPanelInfoV205 } from '../persistence/TazPanelPersistenceTypes';
import type { PersistedTazPanelInfo } from '../persistence/TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../persistence/versionParsing/TazVersionResolver';

/**
 * Replaces one board's panels with the current persisted panel list.
 * Intent: Keep `.taz` board-list mutation logic near workspace state instead of the persistence serializer.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {PanelInfo[]} aPanels The runtime panels to persist.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PanelInfo[],
): GBoardListType[] {
    return updateBoardPanels(aBoards, aBoardId, createPersistedPanelList(aPanels));
}

/**
 * Replaces one persisted panel inside the target board.
 * Intent: Update one saved panel while preserving the rest of the board tab state.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {string} aPanelKey The panel key to replace.
 * @param {PanelInfo} aPanelInfo The runtime panel to persist.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithSavedPanel(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): GBoardListType[] {
    const sPanels = findBoardPanels(aBoards, aBoardId);
    if (!sPanels) {
        return aBoards;
    }

    return updateBoardPanels(
        aBoards,
        aBoardId,
        replacePersistedPanel(sPanels, aPanelKey, aPanelInfo),
    );
}

/**
 * Removes one persisted panel from the target board.
 * Intent: Keep deleted panels out of the saved `.taz` snapshot stored on the board tab.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {string} aBoardId The board id to update.
 * @param {string} aPanelKey The panel key to remove.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithoutPanel(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanelKey: string,
): GBoardListType[] {
    const sPanels = findBoardPanels(aBoards, aBoardId);
    if (!sPanels) {
        return aBoards;
    }

    return updateBoardPanels(aBoards, aBoardId, removePersistedPanel(sPanels, aPanelKey));
}

/**
 * Replaces one board tab with the current `.taz` 2.0.7 board snapshot.
 * Intent: Keep shared tab-only fields out of raw `.taz` saves even when shared save code serializes the tab object.
 * @param {GBoardListType[]} aBoards The current board list.
 * @param {BoardInfo} aBoardInfo The normalized runtime TagAnalyzer board.
 * @returns {GBoardListType[]} The updated board list.
 */
export function getNextBoardListWithPersistedBoardInfo(
    aBoards: GBoardListType[],
    aBoardInfo: BoardInfo,
): GBoardListType[] {
    let sHasChanges = false;

    const sNextBoards = aBoards.map((aBoard) => {
        if (aBoard.id !== aBoardInfo.id) {
            return aBoard;
        }

        const sNextBoard = createPersistedBoardTabSnapshot(aBoard, aBoardInfo);
        if (isSameBoardSnapshot(aBoard, sNextBoard)) {
            return aBoard;
        }

        sHasChanges = true;
        return sNextBoard;
    });

    return sHasChanges ? sNextBoards : aBoards;
}

function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PersistedPanelInfoV205[],
): GBoardListType[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? { ...aBoard, version: TAZ_FORMAT_VERSION, panels: aPanels }
            : aBoard,
    );
}

function findBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
): PersistedTazPanelInfo[] | undefined {
    return aBoards.find((aBoard) => aBoard.id === aBoardId)?.panels as
        | PersistedTazPanelInfo[]
        | undefined;
}

function createPersistedPanelList(aPanels: PanelInfo[]): PersistedPanelInfoV205[] {
    return aPanels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo));
}

function replacePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV205[] {
    const sPersistedPanel = createPersistedPanelInfo(aPanelInfo);

    return aPanels.map((aPanel) =>
        getPersistedPanelKey(aPanel) === aPanelKey
            ? sPersistedPanel
            : (aPanel as PersistedPanelInfoV205),
    );
}

function removePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
): PersistedPanelInfoV205[] {
    return aPanels
        .filter((aPanel) => getPersistedPanelKey(aPanel) !== aPanelKey)
        .map((aPanel) => aPanel as PersistedPanelInfoV205);
}

function getPersistedPanelKey(aPanel: PersistedTazPanelInfo): string | undefined {
    if ('index_key' in aPanel && typeof aPanel.index_key === 'string') {
        return aPanel.index_key;
    }

    if ('meta' in aPanel && aPanel.meta && typeof aPanel.meta === 'object') {
        const sMeta = aPanel.meta as Record<string, unknown>;

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
    aCurrentBoard: GBoardListType,
    aBoardInfo: BoardInfo,
): GBoardListType {
    const sPersistedBoard = createPersistedTazBoardInfo(aBoardInfo);

    return {
        id: sPersistedBoard.id,
        type: sPersistedBoard.type,
        name: aBoardInfo.name,
        path: aCurrentBoard.path,
        code: '',
        panels: sPersistedBoard.panels,
        boardTimeRange: sPersistedBoard.boardTimeRange,
        savedCode: aCurrentBoard.savedCode ?? false,
        version: sPersistedBoard.version,
    } as unknown as GBoardListType;
}

function isSameBoardSnapshot(
    aCurrentBoard: GBoardListType,
    aNextBoard: GBoardListType,
): boolean {
    return JSON.stringify(aCurrentBoard) === JSON.stringify(aNextBoard);
}
