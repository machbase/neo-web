import { useReducer } from 'react';
import type { ContextMenuPosition } from '@/design-system/components';
import type { PanelHighlight } from './panelModel';
import type { AxisRange } from '../range/rangeModel';
import type { PanelSeriesDefinition } from '../seriesModel';

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export enum PanelPopupMode {
    NONE = 'NONE',
    CONTEXT_MENU = 'CONTEXT_MENU',
    HIGHLIGHT_EDITOR = 'HIGHLIGHT_EDITOR',
    ANNOTATION_EDITOR = 'ANNOTATION_EDITOR',
    DELETE_CONFIRM = 'DELETE_CONFIRM',
    EXPORT_CSV = 'EXPORT_CSV',
}

type FFTSeriesSummary = {
    series: PanelSeriesDefinition;
    min: string;
    max: string;
    avg: string;
};

export type FFTSelectionPayload = AxisRange & {
    seriesSummaries: [FFTSeriesSummary, ...FFTSeriesSummary[]];
};

export type AnnotationEditorMetaState = {
    position: ContextMenuPosition;
    seriesKey?: string;
    annotationIndex?: number;
    timestamp?: number;
};

export type HighlightEditorState =
    | { mode: 'create'; position: ContextMenuPosition }
    | { mode: 'edit'; position: ContextMenuPosition; highlightIndex: number };

export type PanelOverlayCursorHintState = {
    x: number;
    y: number;
    isValidTarget: boolean;
    hoveredMainSeriesName: string | undefined;
    overlayMode:
        | PanelOverlayMode.ANNOTATION
        | PanelOverlayMode.HIGHLIGHT
        | PanelOverlayMode.DRAG_SELECT;
};

type PanelPopupState =
    | { mode: PanelPopupMode.NONE }
    | { mode: PanelPopupMode.CONTEXT_MENU; position: ContextMenuPosition }
    | {
          mode: PanelPopupMode.HIGHLIGHT_EDITOR;
          editor: Extract<HighlightEditorState, { mode: 'create' }>;
          draftHighlight: PanelHighlight;
      }
    | {
          mode: PanelPopupMode.HIGHLIGHT_EDITOR;
          editor: Extract<HighlightEditorState, { mode: 'edit' }>;
          draftHighlight?: undefined;
      }
    | {
          mode: PanelPopupMode.ANNOTATION_EDITOR;
          editorMeta: AnnotationEditorMetaState;
      }
    | { mode: PanelPopupMode.DELETE_CONFIRM }
    | { mode: PanelPopupMode.EXPORT_CSV };

type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: ContextMenuPosition;
};

type PanelInteractionState = {
    overlayMode: PanelOverlayMode;
    popupState: PanelPopupState;
    editorStatus: 'closed' | 'open' | 'closing';
    selectionSummary: PanelSelectionSummary | undefined;
    overlayCursorHint: PanelOverlayCursorHintState | undefined;
    hoveredMainSeriesName: string | undefined;
};

type PanelInteractionAction =
    | { type: 'TOGGLE_OVERLAY'; overlayMode: PanelOverlayMode }
    | { type: 'SET_OVERLAY'; overlayMode: PanelOverlayMode }
    | {
          type: 'OPEN_POPUP';
          popupState: PanelPopupState;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'CLOSE_POPUP'; popupMode: PanelPopupMode }
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

const EMPTY_POPUP: PanelPopupState = { mode: PanelPopupMode.NONE };
const INITIAL_STATE: PanelInteractionState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    popupState: EMPTY_POPUP,
    editorStatus: 'closed',
    selectionSummary: undefined,
    overlayCursorHint: undefined,
    hoveredMainSeriesName: undefined,
};

function reduceInteraction(
    state: PanelInteractionState,
    action: PanelInteractionAction,
): PanelInteractionState {
    switch (action.type) {
        case 'TOGGLE_OVERLAY': {
            const overlayMode = state.overlayMode === action.overlayMode
                ? PanelOverlayMode.NO_OVERLAY
                : action.overlayMode;
            return {
                ...state,
                popupState: EMPTY_POPUP,
                overlayMode,
                selectionSummary:
                    action.overlayMode === PanelOverlayMode.ANNOTATION
                        ? state.selectionSummary
                        : undefined,
            };
        }
        case 'SET_OVERLAY':
            return { ...state, overlayMode: action.overlayMode };
        case 'OPEN_POPUP':
            return {
                ...state,
                popupState: action.popupState,
                ...(action.overlayMode !== undefined && {
                    overlayMode: action.overlayMode,
                }),
            };
        case 'CLOSE_POPUP':
            if (state.popupState.mode !== action.popupMode) return state;
            return {
                ...state,
                popupState: EMPTY_POPUP,
                ...(action.popupMode === PanelPopupMode.ANNOTATION_EDITOR && {
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

export function usePanelInteraction() {
    const [state, dispatch] = useReducer(reduceInteraction, INITIAL_STATE);

    return {
        ...state,
        toggleOverlay: (overlayMode: PanelOverlayMode) =>
            dispatch({ type: 'TOGGLE_OVERLAY', overlayMode }),
        setOverlayMode: (overlayMode: PanelOverlayMode) =>
            dispatch({ type: 'SET_OVERLAY', overlayMode }),
        openPopup: (
            popupState: PanelPopupState,
            overlayMode?: PanelOverlayMode,
        ) => dispatch({ type: 'OPEN_POPUP', popupState, overlayMode }),
        closePopup: (popupMode: PanelPopupMode) =>
            dispatch({ type: 'CLOSE_POPUP', popupMode }),
        toggleEditor: () => dispatch({ type: 'TOGGLE_EDITOR' }),
        closeEditor: () => dispatch({ type: 'CLOSE_EDITOR' }),
        finishEditorClose: () => dispatch({ type: 'FINISH_EDITOR_CLOSE' }),
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
}
