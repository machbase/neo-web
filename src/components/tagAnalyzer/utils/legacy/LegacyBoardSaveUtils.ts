import type { GBoardListType } from '@/recoil/recoil';
import type { PanelInfo } from '../ModelTypes';
import type { LegacyFlatPanelInfo } from './LegacyTypes';
import { toLegacyFlatPanelInfo } from './LegacyPanelInfoConversion';

/**
 * Returns a new board list with the target board's panels replaced by the provided list.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanels The next legacy panel list for the matched board.
 * @returns The updated board list.
 */
function updateBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: LegacyFlatPanelInfo[],
): GBoardListType[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId ? { ...aBoard, panels: aPanels } : aBoard,
    );
}

/**
 * Returns the current legacy panel list for the target board.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @returns The current legacy panel list, or `undefined` when the board is missing.
 */
function findBoardPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
): LegacyFlatPanelInfo[] | undefined {
    return aBoards.find((aBoard) => aBoard.id === aBoardId)?.panels;
}

/**
 * Converts one normalized panel list into the legacy flat storage shape.
 * @param aPanels The normalized panel list to persist.
 * @returns The legacy flat panel list used at the save boundary.
 */
function createLegacyPanelList(aPanels: PanelInfo[]): LegacyFlatPanelInfo[] {
    return aPanels.map((aPanel) => toLegacyFlatPanelInfo(aPanel));
}

/**
 * Replaces one legacy panel with the saved normalized panel data.
 * @param aPanels The current legacy panel list.
 * @param aPanelKey The panel key to replace.
 * @param aPanelInfo The nested panel info to persist.
 * @returns The next legacy panel list.
 */
function replaceLegacyPanel(
    aPanels: LegacyFlatPanelInfo[],
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): LegacyFlatPanelInfo[] {
    const sSavedPanel = toLegacyFlatPanelInfo(aPanelInfo);

    return aPanels.map((aPanel) => (aPanel.index_key === aPanelKey ? sSavedPanel : aPanel));
}

/**
 * Removes one legacy panel from the board panel list.
 * @param aPanels The current legacy panel list.
 * @param aPanelKey The panel key to remove.
 * @returns The next legacy panel list.
 */
function removeLegacyPanel(
    aPanels: LegacyFlatPanelInfo[],
    aPanelKey: string,
): LegacyFlatPanelInfo[] {
    return aPanels.filter((aPanel) => aPanel.index_key !== aPanelKey);
}

/**
 * Returns the next board list with one board's panel list saved from nested panel info.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanels The nested panel list to persist.
 * @returns The next stored board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: GBoardListType[],
    aBoardId: string,
    aPanels: PanelInfo[],
): GBoardListType[] {
    return updateBoardPanels(aBoards, aBoardId, createLegacyPanelList(aPanels));
}

/**
 * Returns the next board list with one nested panel saved into the target board.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanelKey The panel key to replace.
 * @param aPanelInfo The nested panel info to persist.
 * @returns The next stored board list.
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

    return updateBoardPanels(aBoards, aBoardId, replaceLegacyPanel(sPanels, aPanelKey, aPanelInfo));
}

/**
 * Returns the next board list with one panel removed from the target board.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanelKey The panel key to remove.
 * @returns The next stored board list.
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

    return updateBoardPanels(aBoards, aBoardId, removeLegacyPanel(sPanels, aPanelKey));
}
