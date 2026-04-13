import type { TagAnalyzerPanelInfo } from '../panel/PanelModel';
import type { TagAnalyzerBoardSourceInfo } from '../TagAnalyzerTypes';
import { flattenTagAnalyzerPanelInfo } from './TagAnalyzerPanelInfoConversion';

/**
 * Returns the next board list with one board's panel list saved from nested panel info.
 * @param aBoards The stored board list from Recoil.
 * @param aBoardId The target board id.
 * @param aPanels The nested panel list to persist.
 * @returns The next stored board list.
 */
export function getNextBoardListWithSavedPanels(
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanels: TagAnalyzerPanelInfo[],
): TagAnalyzerBoardSourceInfo[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? {
                  ...aBoard,
                  panels: aPanels.map((aPanel) => flattenTagAnalyzerPanelInfo(aPanel)),
              }
            : aBoard,
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
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanelKey: TagAnalyzerPanelInfo['meta']['index_key'],
    aPanelInfo: TagAnalyzerPanelInfo,
): TagAnalyzerBoardSourceInfo[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? {
                  ...aBoard,
                  panels: aBoard.panels.map((aPanel) =>
                      aPanel.index_key === aPanelKey
                          ? flattenTagAnalyzerPanelInfo(aPanelInfo)
                          : aPanel,
                  ),
              }
            : aBoard,
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
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanelKey: string,
): TagAnalyzerBoardSourceInfo[] {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? {
                  ...aBoard,
                  panels: aBoard.panels.filter((aPanel) => aPanel.index_key !== aPanelKey),
              }
            : aBoard,
    );
}
