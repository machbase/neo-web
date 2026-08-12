import { useMemo, useReducer } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import {
    PanelOverlayMode,
    type PanelOverlayCursorHintState,
} from '../../chart/chartRuntime';
import type { FFTSelectionPayload } from '../../tools/analysisModel';
import type {
    AnnotationEditorSession,
    HighlightEditorSession,
} from '../../tools/markupModel';
import { createNonEmptyAxisRange } from '../../range/rangeBuilder';
import type { AxisRange } from '../../range/rangeModel';
import type { PanelSeriesDefinition } from '../../seriesModel';
import {
    createPanelHighlightDraft,
    type PanelHighlight,
} from '../panelModel';

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

type PanelInteractionReducerState = {
    overlayMode: PanelOverlayMode;
    activeSurface: PanelSurface | undefined;
    nextSurfaceId: number;
    selectionSummary: PanelSelectionSummary | undefined;
    overlayCursorHint: PanelOverlayCursorHintState | undefined;
    hoveredMainSeriesName: string | undefined;
};

type PanelInteractionAction =
    | { type: 'TOGGLE_OVERLAY'; overlayMode: PanelOverlayMode }
    | {
          type: 'SHOW_SURFACE';
          surface: PanelSurfaceContent | undefined;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'DISMISS_SURFACE'; surfaceId: number }
    | {
          type: 'OPEN_SELECTION';
          selectionSummary: PanelSelectionSummary;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'CLOSE_SELECTION' }
    | { type: 'SHOW_CURSOR_HINT'; hint: PanelOverlayCursorHintState }
    | { type: 'SET_HOVERED_SERIES'; seriesName: string | undefined }
    | { type: 'CLEAR_CURSOR_HINT' };

export type PanelInteraction = ReturnType<typeof usePanelInteraction>;

const INITIAL_STATE: PanelInteractionReducerState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    activeSurface: undefined,
    nextSurfaceId: 1,
    selectionSummary: undefined,
    overlayCursorHint: undefined,
    hoveredMainSeriesName: undefined,
};

function reduceInteraction(
    state: PanelInteractionReducerState,
    action: PanelInteractionAction,
): PanelInteractionReducerState {
    switch (action.type) {
        case 'TOGGLE_OVERLAY':
            return {
                ...state,
                activeSurface: undefined,
                overlayMode:
                    state.overlayMode === action.overlayMode
                        ? PanelOverlayMode.NO_OVERLAY
                        : action.overlayMode,
                selectionSummary:
                    action.overlayMode === PanelOverlayMode.ANNOTATION
                        ? state.selectionSummary
                        : undefined,
            };
        case 'SHOW_SURFACE':
            return {
                ...state,
                activeSurface: action.surface && {
                    ...action.surface,
                    id: state.nextSurfaceId,
                },
                nextSurfaceId: state.nextSurfaceId + (action.surface ? 1 : 0),
                ...(action.overlayMode !== undefined && {
                    overlayMode: action.overlayMode,
                }),
            };
        case 'DISMISS_SURFACE':
            if (state.activeSurface?.id !== action.surfaceId) return state;
            return {
                ...state,
                activeSurface: undefined,
                ...(state.activeSurface.kind === 'annotationEditor' && {
                    overlayMode: PanelOverlayMode.NO_OVERLAY,
                }),
            };
        case 'OPEN_SELECTION':
            return {
                ...state,
                selectionSummary: action.selectionSummary,
                ...(action.overlayMode !== undefined && {
                    overlayMode: action.overlayMode,
                }),
            };
        case 'CLOSE_SELECTION':
            return {
                ...state,
                overlayMode: PanelOverlayMode.NO_OVERLAY,
                selectionSummary: undefined,
            };
        case 'SHOW_CURSOR_HINT':
            return { ...state, overlayCursorHint: action.hint };
        case 'SET_HOVERED_SERIES':
            return {
                ...state,
                hoveredMainSeriesName: action.seriesName,
                overlayCursorHint: state.overlayCursorHint && {
                    ...state.overlayCursorHint,
                    hoveredMainSeriesName: action.seriesName,
                },
            };
        case 'CLEAR_CURSOR_HINT':
            return {
                ...state,
                overlayCursorHint: undefined,
                hoveredMainSeriesName: undefined,
            };
    }
}

export function usePanelInteraction(
    seriesList: readonly Pick<PanelSeriesDefinition, 'key'>[],
) {
    const [state, dispatch] = useReducer(reduceInteraction, INITIAL_STATE);
    const actions = useMemo(() => {
        // Surfaces opened from the chart replace the active overlay mode;
        // surfaces opened from the header leave it untouched.
        const showSurface = (surface: PanelSurfaceContent) =>
            dispatch({ type: 'SHOW_SURFACE', surface });
        const showChartSurface = (surface: PanelSurfaceContent | undefined) =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface,
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            });

        return {
            toggleOverlay: (overlayMode: PanelOverlayMode) =>
                dispatch({ type: 'TOGGLE_OVERLAY', overlayMode }),
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
                dispatch({ type: 'DISMISS_SURFACE', surfaceId }),
            openSelection: (
                selectionSummary: PanelSelectionSummary,
                overlayMode?: PanelOverlayMode,
            ) => dispatch({ type: 'OPEN_SELECTION', selectionSummary, overlayMode }),
            closeSelection: () => dispatch({ type: 'CLOSE_SELECTION' }),
            showCursorHint: (hint: PanelOverlayCursorHintState) =>
                dispatch({ type: 'SHOW_CURSOR_HINT', hint }),
            setHoveredSeries: (seriesName: string | undefined) =>
                dispatch({ type: 'SET_HOVERED_SERIES', seriesName }),
            clearCursorHint: () => dispatch({ type: 'CLEAR_CURSOR_HINT' }),
        };
    }, [seriesList]);
    const draftHighlight: PanelHighlight | undefined =
        state.activeSurface?.kind === 'highlightEditor' &&
        state.activeSurface.session.kind === 'create'
            ? state.activeSurface.session.initialHighlight
            : undefined;

    return useMemo(
        () => ({ state: { ...state, draftHighlight }, actions }),
        [actions, draftHighlight, state],
    );
}
