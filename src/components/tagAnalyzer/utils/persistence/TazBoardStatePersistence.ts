import type { GBoardListType } from '@/recoil/recoil';
import type { BoardInfo } from '../boardTypes';
import type { PanelInfo } from '../panelModelTypes';
import {
    createPersistedPanelInfo,
    type PersistedPanelInfoV201,
} from './TazPanelInfoMapper';
import type {
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from './TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from './TazVersion';
import { toLegacyTimeValue } from '../legacy/LegacyTimeAdapter';

/**
 * Replaces one board's panels with the current persisted panel list.
 * Intent: Persist the current runtime panel set back into the latest `.taz` panel shape.
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
 * Intent: Update a single saved panel while preserving the rest of the stored board payload.
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
 * Intent: Drop deleted panels from the saved `.taz` board payload.
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
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} aBoardInfo The runtime board model.
 * @returns {PersistedTazBoardInfo} The persisted `.taz` board payload.
 */
export function createPersistedTazBoardInfo(aBoardInfo: BoardInfo): PersistedTazBoardInfo {
    return {
        ...aBoardInfo,
        version: TAZ_FORMAT_VERSION,
        panels: createPersistedPanelList(aBoardInfo.panels),
        range_bgn: toLegacyTimeValue(aBoardInfo.rangeConfig.start),
        range_end: toLegacyTimeValue(aBoardInfo.rangeConfig.end),
    };
}

function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PersistedPanelInfoV201[],
): GBoardListType[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? ({ ...aBoard, version: TAZ_FORMAT_VERSION, panels: aPanels } as GBoardListType)
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

function createPersistedPanelList(aPanels: PanelInfo[]): PersistedPanelInfoV201[] {
    return aPanels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo));
}

function replacePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): PersistedPanelInfoV201[] {
    const sPersistedPanel = createPersistedPanelInfo(aPanelInfo);

    return aPanels.map((aPanel) =>
        getPersistedPanelKey(aPanel) === aPanelKey
            ? sPersistedPanel
            : (aPanel as PersistedPanelInfoV201),
    );
}

function removePersistedPanel(
    aPanels: PersistedTazPanelInfo[],
    aPanelKey: string,
): PersistedPanelInfoV201[] {
    return aPanels
        .filter((aPanel) => getPersistedPanelKey(aPanel) !== aPanelKey)
        .map((aPanel) => aPanel as PersistedPanelInfoV201);
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
