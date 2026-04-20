import type {
    OverlapPanelInfo,
    OverlapSelectionChangePayload,
} from '../utils/TagAnalyzerTypes';

/**
 * Returns the next overlap-panel selection list after applying the requested change.
 * @param aPanels The current overlap-panel selection list.
 * @param aPayload The overlap-selection payload that should be applied.
 * @returns The next overlap-panel selection list.
 */
export function getNextOverlapPanels(
    aPanels: OverlapPanelInfo[],
    aPayload: OverlapSelectionChangePayload,
): OverlapPanelInfo[] {
    const { start, end, panel, isRaw, changeType } = aPayload;
    const sPanelKey = panel.meta.index_key;
    const sDuration = end - start;

    if (changeType === 'delete') {
        const sNextPanels = aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === aPanels.length ? aPanels : sNextPanels;
    }

    if (changeType === 'changed') {
        const sExistingPanel = aPanels.find((aItem) => aItem.board.meta.index_key === sPanelKey);
        if (!sExistingPanel) {
            return aPanels;
        }

        if (
            sExistingPanel.isRaw === isRaw &&
            sExistingPanel.start === start &&
            sExistingPanel.duration === sDuration
        ) {
            return aPanels;
        }

        return aPanels.map((aItem) =>
            aItem.board.meta.index_key === sPanelKey
                ? { ...aItem, isRaw, start, duration: sDuration }
                : aItem,
        );
    }

    if (aPanels.some((aItem) => aItem.board.meta.index_key === sPanelKey)) {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    return [...aPanels, { start, duration: sDuration, isRaw, board: panel }];
}
