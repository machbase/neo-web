import type { ResolvedRangeState } from '../panel/rangeControl/rangeControlModel';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { Toast } from '@/design-system/components';
import type { PanelInfo } from '../panel/panelModel';
import { buildPanelSeriesQuery } from '../panel/series/panelSeriesRequest';
import {
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
} from '../seriesModel';
import {
    type AxisKind,
    type AxisRange,
} from '../rangeExpression/rangeModel';
import { useStableCallback } from '../hooks/useStableCallback';
import type { OverlapPanelInput } from '../overlap/overlapModel';

export function useBoardOverlapSelection(
    panels: readonly PanelInfo[],
    panelRanges: Readonly<
        Record<string, ResolvedRangeState | undefined>
    >,
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
            panels: sSelection.panels.map(prepareOverlapPanel),
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

// -------------------- Local --------------------

const OVERLAP_AXIS_MISMATCH_MESSAGE =
    'Overlap can only compare panels with the same x-axis type.';
const OVERLAP_AXIS_REQUIRED_MESSAGE =
    'Overlap requires a panel with one x-axis type.';
const OVERLAP_CHART_FETCH_WIDTH_PX = 1000;

type SelectedOverlapPanel = {
    panelInfo: PanelInfo;
    visibleRange: AxisRange;
};

type OpenOverlapSession = {
    panels: OverlapPanelInput[];
    isNumericXAxis: boolean;
    includeZeroInYAxisRange: boolean;
};

function prepareOverlapPanel({
    panelInfo,
    visibleRange,
}: SelectedOverlapPanel): OverlapPanelInput {
    const panel = { key: panelInfo.key, title: panelInfo.title, visibleRange };
    try {
        return {
            ...panel,
            query: buildPanelSeriesQuery(
                'main',
                panelInfo,
                visibleRange,
                OVERLAP_CHART_FETCH_WIDTH_PX,
                {},
            ),
        };
    } catch (error) {
        // Keep preparation errors in the dialog's existing async error flow.
        return {
            ...panel,
            error: error instanceof Error && error.message
                ? error.message
                : 'Failed to load overlap data.',
        };
    }
}

function getOverlapSelectionError(
    panel: PanelInfo,
    rangeState: ResolvedRangeState | undefined,
    selectedAxisKind?: AxisKind,
): string | undefined {
    if (!rangeState) {
        return 'Overlap requires a loaded chart range.';
    }
    const sPanelAxisKind = getSeriesListAxisKind(panel.query.tagSet);
    if (!sPanelAxisKind) {
        return panel.query.tagSet.length === 0
            ? OVERLAP_AXIS_REQUIRED_MESSAGE
            : `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled for this panel.`;
    }

    return selectedAxisKind && selectedAxisKind !== sPanelAxisKind
        ? OVERLAP_AXIS_MISMATCH_MESSAGE
        : undefined;
}

function deriveOverlapSelection(
    panels: readonly PanelInfo[],
    panelRanges: Readonly<
        Record<string, ResolvedRangeState | undefined>
    >,
) {
    const sSelectedPanels = panels.flatMap((panel): SelectedOverlapPanel[] => {
        if (!panel.isOverlapSelected || panel.query.tagSet.length === 0) {
            return [];
        }

        const sRangeState = panelRanges[panel.key];
        if (!sRangeState) return [];

        return [{
            panelInfo: panel,
            visibleRange: sRangeState.range.mainRange,
        }];
    });
    const sSelectedAxisKinds = new Set(
        sSelectedPanels.map(({ panelInfo }) =>
            getSeriesListAxisKind(panelInfo.query.tagSet),
        ),
    );
    let sCompatibilityMessage: string | undefined;
    if (sSelectedAxisKinds.has(undefined)) {
        sCompatibilityMessage = `${MIXED_X_AXIS_KIND_WARNING} Overlap is disabled.`;
    } else if (sSelectedAxisKinds.size > 1) {
        sCompatibilityMessage = OVERLAP_AXIS_MISMATCH_MESSAGE;
    }

    return {
        panels: sSelectedPanels,
        axisKind: sCompatibilityMessage
            ? undefined
            : sSelectedAxisKinds.values().next().value,
        compatibilityMessage: sCompatibilityMessage,
    };
}
