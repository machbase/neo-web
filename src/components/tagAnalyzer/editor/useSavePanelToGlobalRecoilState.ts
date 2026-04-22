import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useRecoilCallback } from 'recoil';
import type { PanelInfo } from '../utils/panelModelTypes';
import { getNextBoardListWithSavedPanel } from '../utils/persistence/TazBoardStatePersistence';

/**
 * Returns a save handler that persists one normalized panel into the selected board.
 * Intent: Reuse the selected board and save flow from editor components without duplicating Recoil update logic.
 * @returns {(aPanelInfo: PanelInfo) => void} A save function that accepts one panel and writes it into global Recoil state.
 */
export function useSavePanelToGlobalRecoilState(): (aPanelInfo: PanelInfo) => void {
    return useRecoilCallback(
        ({ snapshot, set }) =>
            (aPanelInfo: PanelInfo) => {
                const sSelectedBoardId = snapshot.getLoadable(gSelectedTab).getValue();

                set(gBoardList, (aPrev) =>
                    getNextBoardListWithSavedPanel(
                        aPrev,
                        sSelectedBoardId,
                        aPanelInfo.meta.index_key,
                        aPanelInfo,
                    ),
                );
            },
        [],
    );
}
