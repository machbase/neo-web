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
    editorStatus: 'closed' | 'open' | 'closing';
    selectionSummary: PanelSelectionSummary | undefined;
    overlayCursorHint: PanelOverlayCursorHintState | undefined;
    hoveredMainSeriesName: string | undefined;
};

type PanelInteractionState = PanelInteractionReducerState & {
    draftHighlight: PanelHighlight | undefined;
};

type PanelInteractionAction =
    | { type: 'TOGGLE_OVERLAY'; overlayMode: PanelOverlayMode }
    | {
          type: 'SHOW_SURFACE';
          surface: PanelSurfaceContent;
          overlayMode?: PanelOverlayMode;
      }
    | {
          type: 'BEGIN_HIGHLIGHT_CREATE';
          session: Extract<HighlightEditorSession, { kind: 'create' }> | undefined;
      }
    | { type: 'DISMISS_SURFACE'; surfaceId: number }
    | { type: 'TOGGLE_EDITOR' }
    | { type: 'CLOSE_EDITOR' }
    | { type: 'FINISH_EDITOR_CLOSE' }
    | {
          type: 'OPEN_SELECTION';
          selectionSummary: PanelSelectionSummary;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'CLOSE_SELECTION' }
    | { type: 'SHOW_CURSOR_HINT'; hint: PanelOverlayCursorHintState }
    | { type: 'SET_HOVERED_SERIES'; seriesName: string | undefined }
    | { type: 'CLEAR_CURSOR_HINT' };

type PanelInteraction = {
    state: PanelInteractionState;
    actions: {
        toggleOverlay: (overlayMode: PanelOverlayMode) => void;
        showContextMenu: (position: ContextMenuPosition) => void;
        beginHighlightCreate: (
            range: AxisRange,
            position: ContextMenuPosition,
        ) => void;
        beginHighlightEdit: (
            position: ContextMenuPosition,
            highlightIndex: number,
        ) => void;
        beginAnnotationCreate: (
            position: ContextMenuPosition,
            seriesIndex: number | undefined,
            timestamp: number,
        ) => void;
        beginAnnotationEdit: (
            position: ContextMenuPosition,
            annotationIndex: number,
        ) => void;
        requestDelete: () => void;
        requestExport: () => void;
        dismissSurface: (surfaceId: number) => void;
        toggleEditor: () => void;
        closeEditor: () => void;
        finishEditorClose: () => void;
        openSelection: (
            selectionSummary: PanelSelectionSummary,
            overlayMode?: PanelOverlayMode,
        ) => void;
        closeSelection: () => void;
        showCursorHint: (hint: PanelOverlayCursorHintState) => void;
        setHoveredSeries: (seriesName: string | undefined) => void;
        clearCursorHint: () => void;
    };
};

const INITIAL_STATE: PanelInteractionReducerState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    activeSurface: undefined,
    nextSurfaceId: 1,
    editorStatus: 'closed',
    selectionSummary: undefined,
    overlayCursorHint: undefined,
    hoveredMainSeriesName: undefined,
};

function reduceInteraction(
    state: PanelInteractionReducerState,
    action: PanelInteractionAction,
): PanelInteractionReducerState {
    switch (action.type) {
        case 'TOGGLE_OVERLAY': {
            const overlayMode = state.overlayMode === action.overlayMode
                ? PanelOverlayMode.NO_OVERLAY
                : action.overlayMode;
            return {
                ...state,
                activeSurface: undefined,
                overlayMode,
                selectionSummary:
                    action.overlayMode === PanelOverlayMode.ANNOTATION
                        ? state.selectionSummary
                        : undefined,
            };
        }
        case 'SHOW_SURFACE':
            return {
                ...state,
                activeSurface: {
                    ...action.surface,
                    id: state.nextSurfaceId,
                },
                nextSurfaceId: state.nextSurfaceId + 1,
                ...(action.overlayMode !== undefined && {
                    overlayMode: action.overlayMode,
                }),
            };
        case 'BEGIN_HIGHLIGHT_CREATE':
            return {
                ...state,
                overlayMode: PanelOverlayMode.NO_OVERLAY,
                activeSurface: action.session
                    ? {
                          kind: 'highlightEditor',
                          session: action.session,
                          id: state.nextSurfaceId,
                      }
                    : undefined,
                nextSurfaceId: action.session
                    ? state.nextSurfaceId + 1
                    : state.nextSurfaceId,
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
        case 'TOGGLE_EDITOR':
            return {
                ...state,
                editorStatus: state.editorStatus === 'open' ? 'closing' : 'open',
            };
        case 'CLOSE_EDITOR':
            return state.editorStatus === 'closed'
                ? state
                : { ...state, editorStatus: 'closing' };
        case 'FINISH_EDITOR_CLOSE':
            return state.editorStatus === 'closing'
                ? { ...state, editorStatus: 'closed' }
                : state;
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
): PanelInteraction {
    const [state, dispatch] = useReducer(reduceInteraction, INITIAL_STATE);
    const actions = useMemo<PanelInteraction['actions']>(() => ({
        toggleOverlay: (overlayMode) =>
            dispatch({ type: 'TOGGLE_OVERLAY', overlayMode }),
        showContextMenu: (position) =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface: { kind: 'contextMenu', position },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            }),
        beginHighlightCreate: (range, position) => {
            const timeRange = createNonEmptyAxisRange(range.start, range.end);
            dispatch({
                type: 'BEGIN_HIGHLIGHT_CREATE',
                session: timeRange
                    ? {
                          kind: 'create',
                          position,
                          initialHighlight: createPanelHighlightDraft(timeRange),
                      }
                    : undefined,
            });
        },
        beginHighlightEdit: (position, highlightIndex) =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface: {
                    kind: 'highlightEditor',
                    session: { kind: 'edit', position, highlightIndex },
                },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            }),
        beginAnnotationCreate: (position, seriesIndex, timestamp) => {
            if (
                seriesIndex !== undefined &&
                (seriesIndex < 0 || seriesIndex >= seriesList.length)
            ) {
                throw new Error(`Invalid annotation series index: ${seriesIndex}.`);
            }

            dispatch({
                type: 'SHOW_SURFACE',
                surface: {
                    kind: 'annotationEditor',
                    session: {
                        kind: 'create',
                        position,
                        timestamp,
                        seriesKey: seriesIndex === undefined
                            ? undefined
                            : seriesList[seriesIndex].key,
                    },
                },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            });
        },
        beginAnnotationEdit: (position, annotationIndex) =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface: {
                    kind: 'annotationEditor',
                    session: { kind: 'edit', position, annotationIndex },
                },
                overlayMode: PanelOverlayMode.NO_OVERLAY,
            }),
        requestDelete: () =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface: { kind: 'deleteConfirm' },
            }),
        requestExport: () =>
            dispatch({
                type: 'SHOW_SURFACE',
                surface: { kind: 'exportCsv' },
            }),
        dismissSurface: (surfaceId) =>
            dispatch({ type: 'DISMISS_SURFACE', surfaceId }),
        toggleEditor: () => dispatch({ type: 'TOGGLE_EDITOR' }),
        closeEditor: () => dispatch({ type: 'CLOSE_EDITOR' }),
        finishEditorClose: () => dispatch({ type: 'FINISH_EDITOR_CLOSE' }),
        openSelection: (selectionSummary, overlayMode) =>
            dispatch({ type: 'OPEN_SELECTION', selectionSummary, overlayMode }),
        closeSelection: () => dispatch({ type: 'CLOSE_SELECTION' }),
        showCursorHint: (hint) =>
            dispatch({ type: 'SHOW_CURSOR_HINT', hint }),
        setHoveredSeries: (seriesName) =>
            dispatch({ type: 'SET_HOVERED_SERIES', seriesName }),
        clearCursorHint: () => dispatch({ type: 'CLEAR_CURSOR_HINT' }),
    }), [seriesList]);
    const draftHighlight =
        state.activeSurface?.kind === 'highlightEditor' &&
        state.activeSurface.session.kind === 'create'
            ? state.activeSurface.session.initialHighlight
            : undefined;

    return useMemo(
        () => ({
            state: { ...state, draftHighlight },
            actions,
        }),
        [actions, draftHighlight, state],
    );
}
