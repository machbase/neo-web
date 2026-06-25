import {
    isSameTimeRange,
    isValidTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    getPanelConfigFromRuntimePanel,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelInfo,
} from '../domain/panel/PanelConfig';

/**
 * Pure helpers for editing the board's runtime panel list and capturing the
 * current visible range into a panel before it is persisted. No React, no IO.
 */
export function assertPanelKey(panelKey: string): void {
    if (panelKey.length === 0) {
        throw new Error('TagAnalyzer panel is missing an index key.');
    }
}

export function updatePanelByKey<T extends { key: string }>(
    panels: T[],
    panelKey: string,
    updatePanel: (panel: T) => T,
): T[] {
    assertPanelKey(panelKey);

    let sWasMatched = false;
    let sHasChanges = false;
    const sNextPanels = panels.map((panel) => {
        if (panel.key !== panelKey) {
            return panel;
        }

        sWasMatched = true;
        const sUpdatedPanel = updatePanel(panel);
        if (sUpdatedPanel !== panel) {
            sHasChanges = true;
        }

        return sUpdatedPanel;
    });

    if (!sWasMatched) {
        throw new Error(`Cannot update missing TagAnalyzer panel: ${panelKey}`);
    }

    if (sHasChanges) {
        return sNextPanels;
    }

    return panels;
}

export function removeRuntimePanel<T extends { key: string }>(
    panels: T[],
    panelKey: string,
): T[] {
    assertPanelKey(panelKey);

    const sNextPanels = panels.filter((panel) => panel.key !== panelKey);
    if (sNextPanels.length === panels.length) {
        throw new Error(`Cannot delete missing TagAnalyzer panel: ${panelKey}`);
    }

    return sNextPanels;
}

export function getPanelConfigForSaveFromRuntimePanel(
    runtimePanelInfo: RuntimePanelInfo,
): PanelInfo {
    return getPanelWithCurrentVisibleRangeForSave(
        getPanelConfigFromRuntimePanel(runtimePanelInfo),
        runtimePanelInfo.time.runtimeRange,
    );
}

export function getPanelWithCurrentVisibleRangeForSave(
    panel: PanelInfo,
    rangeState: PanelRangeState,
): PanelInfo {
    if (
        !panel.time.useLastViewedRange ||
        !isValidTimeRange(rangeState.requestPanelRange) ||
        !isValidTimeRange(rangeState.requestNavigatorRange)
    ) {
        return panel;
    }

    const sCurrentLastViewedRange = panel.time.lastViewedRange;
    const sCurrentPanelRange = sCurrentLastViewedRange?.panelRange;
    const sCurrentNavigatorRange = sCurrentLastViewedRange?.navigatorRange;
    const sHasSamePanelRange =
        isValidTimeRange(sCurrentPanelRange) &&
        isSameTimeRange(sCurrentPanelRange, rangeState.requestPanelRange);
    const sHasSameNavigatorRange =
        isValidTimeRange(sCurrentNavigatorRange) &&
        isSameTimeRange(sCurrentNavigatorRange, rangeState.requestNavigatorRange);

    if (sHasSamePanelRange && sHasSameNavigatorRange) {
        return panel;
    }

    return {
        ...panel,
        time: {
            ...panel.time,
            lastViewedRange: {
                panelRange: rangeState.requestPanelRange,
                navigatorRange: rangeState.requestNavigatorRange,
            },
        },
    };
}