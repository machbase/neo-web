import type { PanelInfo } from '../common/modelTypes';
import type { TagAnalyzerBoardSourceInfo } from '../TagAnalyzerTypes';
import type { TagAnalyzerFlatPanelInfo } from './TagAnalyzerPanelInfoConversion';
import { flattenTagAnalyzerPanelInfo } from './TagAnalyzerPanelInfoConversion';

/**
 * Returns a new board list with the target board's panels transformed by the given callback.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aTransform The callback that produces the next panels array for the matched board.
 * @returns The updated board list.
 */
function updateBoardPanels(
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: string,
    aTransform: (aPanels: TagAnalyzerFlatPanelInfo[]) => TagAnalyzerFlatPanelInfo[],
): TagAnalyzerBoardSourceInfo[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId ? { ...aBoard, panels: aTransform(aBoard.panels) } : aBoard,
    );
}

/**
 * Returns the next board list with one board's panel list saved from nested panel info.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanels The nested panel list to persist.
 * @returns The next stored board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: string,
    aPanels: PanelInfo[],
): TagAnalyzerBoardSourceInfo[] {
    return updateBoardPanels(aBoards, aBoardId, () =>
        aPanels.map((aPanel) => flattenTagAnalyzerPanelInfo(aPanel)),
    );
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
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: string,
    aPanelKey: string,
    aPanelInfo: PanelInfo,
): TagAnalyzerBoardSourceInfo[] {
    return updateBoardPanels(aBoards, aBoardId, (aPanels) =>
        aPanels.map((aPanel) =>
            aPanel.index_key === aPanelKey ? flattenTagAnalyzerPanelInfo(aPanelInfo) : aPanel,
        ),
    );
}

/**
 * Returns the next board list with one panel removed from the target board.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanelKey The panel key to remove.
 * @returns The next stored board list.
 */
export function getNextBoardListWithoutPanel(
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: string,
    aPanelKey: string,
): TagAnalyzerBoardSourceInfo[] {
    return updateBoardPanels(aBoards, aBoardId, (aPanels) =>
        aPanels.filter((aPanel) => aPanel.index_key !== aPanelKey),
    );
}
