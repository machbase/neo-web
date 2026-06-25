import { useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    isSameTimeRange,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';
import {
    getPanelConfigFromRuntimePanel,
    type PanelRangeState,
    type RuntimePanelInfo,
} from '../../domain/panel/PanelConfig';
import {
    MIXED_X_AXIS_KIND_WARNING,
    getSeriesListKeyAxisKind,
    hasMixedXAxisValueKinds,
} from '../../domain/SeriesDomain';
import type { OverlapPanelInfo } from './OverlapTypes';

const OVERLAP_AXIS_MISMATCH_MESSAGE =
    'Overlap can only compare panels with the same x-axis type.';

type OverlapPanelSelection = {
    panelKey: string;
    runtimeRange: TimeRangeMs;
};

/**
 * Owns overlap-comparison selection ranges and mirrors the selected flag back
 * into RuntimePanelInfo so the panel runtime state remains the board source of
 * truth for display state.
 */
export function useOverlapSelection(
    runtimePanels: RuntimePanelInfo[],
    onPanelOverlapSelectedChange: (
        panelKey: string,
        isOverlapSelected: boolean,
    ) => void,
) {
    const [sOverlapSelections, setOverlapSelections] = useState<
        OverlapPanelSelection[]
    >([]);
    const [sIsOverlapModalOpen, setIsOverlapModalOpen] = useState(false);

    const sSelectedPanelKeys = new Set(
        sOverlapSelections.map((selection) => selection.panelKey),
    );

    function setSelectionsForPanel(
        panelKey: string,
        nextSelections: OverlapPanelSelection[],
    ): void {
        if (nextSelections === sOverlapSelections) {
            return;
        }

        setOverlapSelections(nextSelections);

        const sWasSelected = sOverlapSelections.some(
            (item) => item.panelKey === panelKey,
        );
        const sIsSelected = nextSelections.some(
            (item) => item.panelKey === panelKey,
        );

        if (sWasSelected !== sIsSelected) {
            onPanelOverlapSelectedChange(panelKey, sIsSelected);
        }
    }

    function addPanelToOverlap(
        panel: RuntimePanelInfo,
        runtimeRange: TimeRangeMs,
    ): void {
        if (sSelectedPanelKeys.has(panel.key)) {
            return;
        }

        setSelectionsForPanel(panel.key, [
            ...sOverlapSelections,
            {
                panelKey: panel.key,
                runtimeRange,
            },
        ]);
    }

    function updatePanelOverlapRange(
        panel: RuntimePanelInfo,
        runtimeRange: TimeRangeMs,
    ): void {
        const sSelection = sOverlapSelections.find(
            (selection) => selection.panelKey === panel.key,
        );

        if (!sSelection || isSameTimeRange(sSelection.runtimeRange, runtimeRange)) {
            return;
        }

        setSelectionsForPanel(
            panel.key,
            sOverlapSelections.map((selection) =>
                selection.panelKey === panel.key
                    ? { ...selection, runtimeRange }
                    : selection,
            ),
        );
    }

    function getOverlapAxisKindMismatchMessage(
        panel: RuntimePanelInfo,
    ): string | undefined {
        const sPanelAxisKind = getSeriesListKeyAxisKind(panel.query.tagSet);

        if (!sPanelAxisKind) {
            return 'Overlap requires a panel with one x-axis type.';
        }

        const sSelectedAxisKind = sOverlapSelections
            .map((selection) =>
                runtimePanels.find((runtimePanel) => runtimePanel.key === selection.panelKey),
            )
            .filter((runtimePanel): runtimePanel is RuntimePanelInfo => Boolean(runtimePanel))
            .map((runtimePanel) => getSeriesListKeyAxisKind(runtimePanel.query.tagSet))
            .find((axisKind) => axisKind !== undefined);

        if (sSelectedAxisKind && sSelectedAxisKind !== sPanelAxisKind) {
            return OVERLAP_AXIS_MISMATCH_MESSAGE;
        }

        return undefined;
    }

    function getSelectedOverlapPanels(): OverlapPanelInfo[] {
        return sOverlapSelections.flatMap((selection) => {
            const sPanel = runtimePanels.find(
                (panel) => panel.key === selection.panelKey,
            );

            if (!sPanel || sPanel.query.tagSet.length === 0) {
                return [];
            }

            return [
                {
                    panelKey: selection.panelKey,
                    runtimeRange: selection.runtimeRange,
                    panelInfo: getPanelConfigFromRuntimePanel(sPanel),
                },
            ];
        });
    }

    const sOverlapPanels = getSelectedOverlapPanels();
    const sCompatibilityMessage = getOverlapPanelsCompatibilityMessage(sOverlapPanels);

    function togglePanelOverlap(
        panel: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ): void {
        if (sSelectedPanelKeys.has(panel.key)) {
            removePanelFromOverlap(panel.key);
            return;
        }

        if (!hasConcreteOverlapRangeState(rangeState)) {
            Toast.warning('Overlap requires a loaded chart range.', undefined);
            return;
        }

        if (hasMixedXAxisValueKinds(panel.query.tagSet)) {
            Toast.warning(
                `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`,
                undefined,
            );
            return;
        }

        const sAxisKindMismatchMessage =
            getOverlapAxisKindMismatchMessage(panel);
        if (sAxisKindMismatchMessage) {
            Toast.warning(sAxisKindMismatchMessage, undefined);
            return;
        }

        addPanelToOverlap(panel, rangeState.requestPanelRange);
    }

    function handleAppliedRange(
        panel: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ): void {
        if (
            !sSelectedPanelKeys.has(panel.key) ||
            !hasConcreteOverlapRangeState(rangeState)
        ) {
            return;
        }

        updatePanelOverlapRange(panel, rangeState.requestPanelRange);
    }

    function removePanelFromOverlap(panelKey: string): void {
        const sNextSelections = sOverlapSelections.filter(
            (selection) => selection.panelKey !== panelKey,
        );

        if (sNextSelections.length === sOverlapSelections.length) {
            return;
        }

        setSelectionsForPanel(panelKey, sNextSelections);
    }

    function openOverlapChart(): void {
        if (sCompatibilityMessage) {
            Toast.warning(sCompatibilityMessage, undefined);
            return;
        }

        setIsOverlapModalOpen(true);
    }

    return {
        selectedPanelKeys: sSelectedPanelKeys,
        overlapPanels: sOverlapPanels,
        compatibilityMessage: sCompatibilityMessage,
        isOverlapModalOpen: sIsOverlapModalOpen,
        setOverlapModalOpen: setIsOverlapModalOpen,
        togglePanelOverlap,
        handleAppliedRange,
        removePanelFromOverlap,
        openOverlapChart,
    };
}

function getOverlapPanelsCompatibilityMessage(
    panels: OverlapPanelInfo[],
): string | undefined {
    const sAxisKinds = panels
        .map((panel) => getSeriesListKeyAxisKind(panel.panelInfo.query.tagSet))
        .filter((axisKind) => axisKind !== undefined);

    if (new Set(sAxisKinds).size > 1) {
        return OVERLAP_AXIS_MISMATCH_MESSAGE;
    }

    return undefined;
}

function hasConcreteOverlapRangeState(rangeState: PanelRangeState): boolean {
    return (
        isValidTimeRange(rangeState.requestPanelRange) &&
        isValidTimeRange(rangeState.requestNavigatorRange) &&
        isValidTimeRange(rangeState.fullRange)
    );
}
