import type { OverlapPanelInfo, PanelInfo } from './common/modelTypes';

/**
 * Returns the next overlap-panel selection list after applying the requested change.
 * @param aPanels The current overlap-panel selection list.
 * @param aStart The selected panel start time.
 * @param aEnd The selected panel end time.
 * @param aBoard The panel info that owns the selection.
 * @param aIsRaw Whether the selected panel is currently in raw mode.
 * @param aChangeType The optional overlap-selection update mode.
 * @returns The next overlap-panel selection list.
 */
export function getNextOverlapPanels(
    aPanels: OverlapPanelInfo[],
    aStart: number,
    aEnd: number,
    aBoard: PanelInfo,
    aIsRaw: boolean,
    aChangeType: ('delete' | 'changed') | undefined,
): OverlapPanelInfo[] {
    const sPanelKey = aBoard.meta.index_key;
    const sDuration = aEnd - aStart;

    if (aChangeType === 'delete') {
        const sNextPanels = aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === aPanels.length ? aPanels : sNextPanels;
    }

    if (aChangeType === 'changed') {
        const sExistingPanel = aPanels.find((aItem) => aItem.board.meta.index_key === sPanelKey);
        if (!sExistingPanel) {
            return aPanels;
        }

        if (
            sExistingPanel.isRaw === aIsRaw &&
            sExistingPanel.start === aStart &&
            sExistingPanel.duration === sDuration
        ) {
            return aPanels;
        }

        return aPanels.map((aItem) =>
            aItem.board.meta.index_key === sPanelKey
                ? { ...aItem, isRaw: aIsRaw, start: aStart, duration: sDuration }
                : aItem,
        );
    }

    if (aPanels.some((aItem) => aItem.board.meta.index_key === sPanelKey)) {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    return [...aPanels, { start: aStart, duration: sDuration, isRaw: aIsRaw, board: aBoard }];
}
