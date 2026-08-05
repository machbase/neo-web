import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { Toast } from '@/design-system/components';
import type { PanelInfo } from '../panel/panelModel';
import {
    isResolvedPanelRangeState,
    type PanelRangeSourceState,
} from '../panel/panelRangeSourceState';
import {
    getSeriesListAxisKind,
    hasMixedXAxisValueKinds,
    MIXED_X_AXIS_KIND_WARNING,
} from '../seriesModel';
import type { AxisKind } from '../range/rangeModel';
import { useStableCallback } from '../hooks/useStableCallback';
import type { OverlapPanelInput } from '../overlap/overlapModel';

const OVERLAP_AXIS_MISMATCH_MESSAGE =
    'Overlap can only compare panels with the same x-axis type.';
const OVERLAP_AXIS_REQUIRED_MESSAGE =
    'Overlap requires a panel with one x-axis type.';

type OpenOverlapSession = {
    panels: OverlapPanelInput[];
    isNumericXAxis: boolean;
    includeZeroInYAxisRange: boolean;
};

export function useBoardOverlapSelection(
    panels: readonly PanelInfo[],
    panelRanges: Readonly<Record<string, PanelRangeSourceState>>,
    onSelectionChange: (panelKey: string, isSelected: boolean) => void,
) {
    const [sOpenSession, setOpenSession] = useState<OpenOverlapSession>();
    const sSelection = deriveOverlapSelection(panels, panelRanges);

    useEffect(() => {
        panels.forEach((panel) => {
            if (
                panel.isOverlapSelected &&
                getOverlapSelectionError(panel, panelRanges[panel.key])
            ) {
                onSelectionChange(panel.key, false);
            }
        });

        if (sSelection.panels.length === 0 || sSelection.compatibilityMessage) {
            setOpenSession(undefined);
        }
    }, [
        onSelectionChange,
        panelRanges,
        panels,
        sSelection.compatibilityMessage,
        sSelection.panels.length,
    ]);

    const togglePanelOverlap = useStableCallback((panelKey: string): void => {
        const sPanel = panels.find((panel) => panel.key === panelKey);
        if (!sPanel) return;

        if (sPanel.isOverlapSelected) {
            onSelectionChange(panelKey, false);
            return;
        }

        const sError = getOverlapSelectionError(
            sPanel,
            panelRanges[panelKey],
            sSelection.axisKind,
        );
        if (sError) {
            Toast.warning(sError, undefined);
            return;
        }

        onSelectionChange(panelKey, true);
    });

    const openOverlapChart = useStableCallback((): void => {
        if (sSelection.compatibilityMessage) {
            Toast.warning(sSelection.compatibilityMessage, undefined);
            return;
        }
        if (!sSelection.axisKind) return;

        setOpenSession({
            panels: sSelection.panels,
            isNumericXAxis: sSelection.axisKind === 'numeric',
            includeZeroInYAxisRange: sSelection.panels.some(
                ({ panelInfo }) => panelInfo.axes.leftY.zeroBase,
            ),
        });
    });

    const closeOverlapChart = useCallback(() => setOpenSession(undefined), []);

    return {
        canOpenOverlapChart: sSelection.axisKind !== undefined,
        openSession: sOpenSession,
        compatibilityMessage: sSelection.compatibilityMessage,
        closeOverlapChart,
        togglePanelOverlap,
        openOverlapChart,
    };
}

function getOverlapSelectionError(
    panel: PanelInfo,
    rangeState: PanelRangeSourceState | undefined,
    selectedAxisKind?: AxisKind,
): string | undefined {
    if (!rangeState || !isResolvedPanelRangeState(rangeState)) {
        return 'Overlap requires a loaded chart range.';
    }
    if (hasMixedXAxisValueKinds(panel.query.tagSet)) {
        return `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`;
    }

    const sPanelAxisKind = getSeriesListAxisKind(panel.query.tagSet);
    if (!sPanelAxisKind) return OVERLAP_AXIS_REQUIRED_MESSAGE;

    return selectedAxisKind && selectedAxisKind !== sPanelAxisKind
        ? OVERLAP_AXIS_MISMATCH_MESSAGE
        : undefined;
}

function deriveOverlapSelection(
    panels: readonly PanelInfo[],
    panelRanges: Readonly<Record<string, PanelRangeSourceState>>,
) {
    const sSelectedPanels = panels.flatMap((panel): OverlapPanelInput[] => {
        if (!panel.isOverlapSelected || panel.query.tagSet.length === 0) {
            return [];
        }

        const sRangeState = panelRanges[panel.key];
        if (!sRangeState || !isResolvedPanelRangeState(sRangeState)) return [];

        return [{
            panelInfo: panel,
            visibleRange: sRangeState.range.panelRange,
        }];
    });
    const sHasMixedAxisKinds = sSelectedPanels.some(({ panelInfo }) =>
        hasMixedXAxisValueKinds(panelInfo.query.tagSet),
    );
    const sSelectedAxisKinds = new Set(
        sSelectedPanels.map(({ panelInfo }) =>
            getSeriesListAxisKind(panelInfo.query.tagSet),
        ),
    );
    const sCompatibilityMessage = sHasMixedAxisKinds
        ? `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled.`
        : sSelectedAxisKinds.has(undefined)
            ? OVERLAP_AXIS_REQUIRED_MESSAGE
            : sSelectedAxisKinds.size > 1
                ? OVERLAP_AXIS_MISMATCH_MESSAGE
                : undefined;

    return {
        panels: sSelectedPanels,
        axisKind: sCompatibilityMessage
            ? undefined
            : sSelectedAxisKinds.values().next().value,
        compatibilityMessage: sCompatibilityMessage,
    };
}
