import { useMemo, useRef, useState } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import {
    PanelOverlayMode,
    type PanelOverlayCursorHintState,
} from '../../chart/chartRuntime';
import type { FFTSelectionPayload } from '../../tools/analysisModel';
import {
    createPanelHighlightDraft,
    type AnnotationEditorSession,
    type HighlightEditorSession,
    type PanelHighlight,
} from '../../markup/markupModel';
import { createNonEmptyAxisRange } from '../../range/rangeBuilder';
import type { AxisRange } from '../../range/rangeModel';
import type { PanelSeriesDefinition } from '../../seriesModel';

type PanelSurfaceContent =
    | { kind: 'contextMenu'; position: ContextMenuPosition }
    | { kind: 'highlightEditor'; session: HighlightEditorSession }
    | { kind: 'annotationEditor'; session: AnnotationEditorSession }
    | { kind: 'deleteConfirm' }
    | { kind: 'exportCsv' };

export type PanelSurface = PanelSurfaceContent & { id: number };

type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: ContextMenuPosition;
};

type PanelInteractionState = {
    overlayMode: PanelOverlayMode;
    activeSurface: PanelSurface | undefined;
    selectionSummary: PanelSelectionSummary | undefined;
    overlayCursorHint: PanelOverlayCursorHintState | undefined;
    hoveredMainSeriesName: string | undefined;
};

const INITIAL_STATE: PanelInteractionState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    activeSurface: undefined,
    selectionSummary: undefined,
    overlayCursorHint: undefined,
    hoveredMainSeriesName: undefined,
};

export function usePanelInteraction(
    seriesList: readonly Pick<PanelSeriesDefinition, 'key'>[],
) {
    const [state, setState] = useState<PanelInteractionState>(INITIAL_STATE);
    const nextSurfaceId = useRef(1);
    const actions = useMemo(() => {
        const setSurface = (
            surface: PanelSurfaceContent | undefined,
            overlayMode?: PanelOverlayMode,
        ) => {
            const activeSurface = surface
                ? { ...surface, id: nextSurfaceId.current++ }
                : undefined;
            setState((current) => ({
                ...current,
                activeSurface,
                ...(overlayMode !== undefined && { overlayMode }),
            }));
        };
        const showSurface = (surface: PanelSurfaceContent) =>
            setSurface(surface);
        const showChartSurface = (surface: PanelSurfaceContent | undefined) =>
            setSurface(surface, PanelOverlayMode.NO_OVERLAY);

        return {
            toggleOverlay: (overlayMode: PanelOverlayMode) =>
                setState((current) => ({
                    ...current,
                    activeSurface: undefined,
                    overlayMode: current.overlayMode === overlayMode
                        ? PanelOverlayMode.NO_OVERLAY
                        : overlayMode,
                    selectionSummary:
                        overlayMode === PanelOverlayMode.ANNOTATION
                            ? current.selectionSummary
                            : undefined,
                })),
            showContextMenu: (position: ContextMenuPosition) =>
                showChartSurface({ kind: 'contextMenu', position }),
            beginHighlightCreate: (
                range: AxisRange,
                position: ContextMenuPosition,
            ) => {
                const timeRange = createNonEmptyAxisRange(range.start, range.end);
                showChartSurface(
                    timeRange && {
                        kind: 'highlightEditor',
                        session: {
                            kind: 'create',
                            position,
                            initialHighlight: createPanelHighlightDraft(timeRange),
                        },
                    },
                );
            },
            beginHighlightEdit: (
                position: ContextMenuPosition,
                highlightIndex: number,
            ) =>
                showChartSurface({
                    kind: 'highlightEditor',
                    session: { kind: 'edit', position, highlightIndex },
                }),
            beginAnnotationCreate: (
                position: ContextMenuPosition,
                seriesIndex: number | undefined,
                timestamp: number,
            ) => {
                if (
                    seriesIndex !== undefined &&
                    (seriesIndex < 0 || seriesIndex >= seriesList.length)
                ) {
                    throw new Error(`Invalid annotation series index: ${seriesIndex}.`);
                }
                showChartSurface({
                    kind: 'annotationEditor',
                    session: {
                        kind: 'create',
                        position,
                        timestamp,
                        seriesKey: seriesIndex === undefined
                            ? undefined
                            : seriesList[seriesIndex].key,
                    },
                });
            },
            beginAnnotationEdit: (
                position: ContextMenuPosition,
                annotationIndex: number,
            ) =>
                showChartSurface({
                    kind: 'annotationEditor',
                    session: { kind: 'edit', position, annotationIndex },
                }),
            requestDelete: () => showSurface({ kind: 'deleteConfirm' }),
            requestExport: () => showSurface({ kind: 'exportCsv' }),
            dismissSurface: (surfaceId: number) =>
                setState((current) => {
                    if (current.activeSurface?.id !== surfaceId) return current;
                    return {
                        ...current,
                        activeSurface: undefined,
                        ...(current.activeSurface.kind === 'annotationEditor' && {
                            overlayMode: PanelOverlayMode.NO_OVERLAY,
                        }),
                    };
                }),
            openSelection: (
                selectionSummary: PanelSelectionSummary,
            ) => setState((current) => ({
                ...current,
                selectionSummary,
                overlayMode: PanelOverlayMode.DRAG_SELECT,
            })),
            closeSelection: () => setState((current) => ({
                ...current,
                overlayMode: PanelOverlayMode.NO_OVERLAY,
                selectionSummary: undefined,
            })),
            showCursorHint: (hint: PanelOverlayCursorHintState) =>
                setState((current) => ({
                    ...current,
                    overlayCursorHint: hint,
                })),
            setHoveredSeries: (seriesName: string | undefined) =>
                setState((current) => ({
                    ...current,
                    hoveredMainSeriesName: seriesName,
                    overlayCursorHint: current.overlayCursorHint && {
                        ...current.overlayCursorHint,
                        hoveredMainSeriesName: seriesName,
                    },
                })),
            clearCursorHint: () => setState((current) => ({
                ...current,
                overlayCursorHint: undefined,
                hoveredMainSeriesName: undefined,
            })),
        };
    }, [seriesList]);
    const draftHighlight: PanelHighlight | undefined =
        state.activeSurface?.kind === 'highlightEditor' &&
        state.activeSurface.session.kind === 'create'
            ? state.activeSurface.session.initialHighlight
            : undefined;

    return { state: { ...state, draftHighlight }, actions };
}
