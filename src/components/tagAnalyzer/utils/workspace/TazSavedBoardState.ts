import type { GBoardListType } from '@/recoil/recoil';
import type { PanelInfo } from '../panelModelTypes';
import { createPersistedPanelInfo } from '../persistence/save/TazPanelSaveMapper';
import type { PersistedPanelInfoV204 } from '../persistence/TazPanelPersistenceTypes';
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

function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PersistedPanelInfoV204[],
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

function createPersistedPanelList(aPanels: PanelInfo[]): PersistedPanelInfoV204[] {
    return aPanels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo));
}

function replacePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV204[] {
    const sPersistedPanel = createPersistedPanelInfo(aPanelInfo);

    return aPanels.map((aPanel) =>
        getPersistedPanelKey(aPanel) === aPanelKey
            ? sPersistedPanel
            : (aPanel as PersistedPanelInfoV204),
    );
}

function removePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
): PersistedPanelInfoV204[] {
    return aPanels
        .filter((aPanel) => getPersistedPanelKey(aPanel) !== aPanelKey)
        .map((aPanel) => aPanel as PersistedPanelInfoV204);
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
