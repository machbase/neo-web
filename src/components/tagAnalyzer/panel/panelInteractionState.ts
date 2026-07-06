import type { ContextMenuPosition } from '@/design-system/components';
import type { PanelMarkupInteractionHintState } from './PanelMarkupInteractionHint';
import { PanelActionKey } from './PanelHeader';
import type { FFTSelectionPayload } from '../domain/ChartDomain';
import type { PanelHighlight } from '../domain/panel/PanelConfig';
import { PanelOverlayMode } from '../domain/panel/PanelActions';
import type { AnnotationEditorMetaState } from './modal/EditAnnotationModal';
import type { HighlightEditorState } from './modal/EditHighlightModal';

export enum PanelPopupMode {
    NONE = 'NONE',
    CONTEXT_MENU = 'CONTEXT_MENU',
    FFT = 'FFT',
    HIGHLIGHT_EDITOR = 'HIGHLIGHT_EDITOR',
    ANNOTATION_EDITOR = 'ANNOTATION_EDITOR',
    DELETE_CONFIRM = 'DELETE_CONFIRM',
    EXPORT_CSV = 'EXPORT_CSV',
}

type CreateHighlightPopupState = {
    mode: PanelPopupMode.HIGHLIGHT_EDITOR;
    editor: Extract<HighlightEditorState, { mode: 'create' }>;
    draftHighlight: PanelHighlight;
};

type EditHighlightPopupState = {
    mode: PanelPopupMode.HIGHLIGHT_EDITOR;
    editor: Extract<HighlightEditorState, { mode: 'edit' }>;
    draftHighlight?: undefined;
};

export type HighlightPopupState =
    | CreateHighlightPopupState
    | EditHighlightPopupState;

export type PanelPopupState =
    | { mode: PanelPopupMode.NONE }
    | { mode: PanelPopupMode.CONTEXT_MENU; position: ContextMenuPosition }
    | { mode: PanelPopupMode.FFT; selection: FFTSelectionPayload }
    | HighlightPopupState
    | {
          mode: PanelPopupMode.ANNOTATION_EDITOR;
          editorMeta: AnnotationEditorMetaState;
      }
    | { mode: PanelPopupMode.DELETE_CONFIRM }
    | { mode: PanelPopupMode.EXPORT_CSV };

export type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: { x: number; y: number };
};

const EMPTY_PANEL_POPUP_STATE: PanelPopupState = { mode: PanelPopupMode.NONE };

export enum PanelRuntimeTimeRangeTarget {
    MAIN_CHART = 'MAIN_CHART',
    NAVIGATOR = 'NAVIGATOR',
}

type PanelEditorState =
    | { status: 'closed' }
    | { status: 'open' }
    | { status: 'closing' };

type PanelMarkupInteractionState = {
    hint: PanelMarkupInteractionHintState | undefined;
    hoveredMainSeriesName: string | undefined;
};

type PanelInteractionState = {
    overlayMode: PanelOverlayMode;
    popupState: PanelPopupState;
    timeRangeModalTarget: PanelRuntimeTimeRangeTarget | undefined;
    editor: PanelEditorState;
    selectionSummary: PanelSelectionSummary | undefined;
    markupInteraction: PanelMarkupInteractionState;
};

type PanelInteractionAction =
    | { type: 'PANEL_ACTION'; actionKey: PanelActionKey }
    | { type: 'SET_OVERLAY_MODE'; overlayMode: PanelOverlayMode }
    | {
          type: 'OPEN_POPUP';
          popupState: PanelPopupState;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'CLOSE_POPUP'; popupMode: PanelPopupMode }
    | {
          type: 'OPEN_TIME_RANGE_MODAL';
          target: PanelRuntimeTimeRangeTarget;
      }
    | { type: 'CLOSE_TIME_RANGE_MODAL' }
    | { type: 'CLOSE_EDITOR' }
    | { type: 'FINISH_EDITOR_CLOSE' }
    | {
          type: 'OPEN_SELECTION_SUMMARY';
          selectionSummary: PanelSelectionSummary;
          overlayMode?: PanelOverlayMode;
      }
    | { type: 'CLOSE_SELECTION_SUMMARY' }
    | {
          type: 'SHOW_MARKUP_INTERACTION_HINT';
          hint: PanelMarkupInteractionHintState;
      }
    | {
          type: 'SET_HOVERED_MAIN_SERIES';
          seriesName: string | undefined;
      }
    | { type: 'CLEAR_MOUSE_MARKUP_STATE' };

export const INITIAL_PANEL_INTERACTION_STATE: PanelInteractionState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    popupState: EMPTY_PANEL_POPUP_STATE,
    timeRangeModalTarget: undefined,
    editor: { status: 'closed' },
    selectionSummary: undefined,
    markupInteraction: {
        hint: undefined,
        hoveredMainSeriesName: undefined,
    },
};

export function panelInteractionReducer(
    state: PanelInteractionState,
    action: PanelInteractionAction,
): PanelInteractionState {
    switch (action.type) {
        case 'PANEL_ACTION':
            return reducePanelAction(state, action.actionKey);

        case 'SET_OVERLAY_MODE':
            return {
                ...state,
                overlayMode: action.overlayMode,
            };

        case 'OPEN_POPUP': {
            const sNextState = {
                ...state,
                popupState: action.popupState,
            };

            if (action.overlayMode === undefined) {
                return sNextState;
            }

            return {
                ...sNextState,
                overlayMode: action.overlayMode,
            };
        }

        case 'CLOSE_POPUP':
            if (action.popupMode === PanelPopupMode.ANNOTATION_EDITOR) {
                return {
                    ...state,
                    popupState: EMPTY_PANEL_POPUP_STATE,
                    overlayMode: PanelOverlayMode.NO_OVERLAY,
                };
            }

            return {
                ...state,
                popupState: EMPTY_PANEL_POPUP_STATE,
            };

        case 'OPEN_TIME_RANGE_MODAL':
            return {
                ...state,
                timeRangeModalTarget: action.target,
            };

        case 'CLOSE_TIME_RANGE_MODAL':
            return {
                ...state,
                timeRangeModalTarget: undefined,
            };

        case 'CLOSE_EDITOR':
            if (state.editor.status === 'closed') {
                return state;
            }

            return {
                ...state,
                editor: { status: 'closing' },
            };

        case 'FINISH_EDITOR_CLOSE':
            if (state.editor.status !== 'closing') {
                return state;
            }

            return {
                ...state,
                editor: { status: 'closed' },
            };

        case 'OPEN_SELECTION_SUMMARY': {
            const sNextState = {
                ...state,
                selectionSummary: action.selectionSummary,
            };

            if (action.overlayMode === undefined) {
                return sNextState;
            }

            return {
                ...sNextState,
                overlayMode: action.overlayMode,
            };
        }

        case 'CLOSE_SELECTION_SUMMARY':
            return {
                ...state,
                overlayMode: PanelOverlayMode.NO_OVERLAY,
                selectionSummary: undefined,
            };

        case 'SHOW_MARKUP_INTERACTION_HINT':
            return {
                ...state,
                markupInteraction: {
                    ...state.markupInteraction,
                    hint: action.hint,
                },
            };

        case 'SET_HOVERED_MAIN_SERIES': {
            const sCurrentHint = state.markupInteraction.hint;

            return {
                ...state,
                markupInteraction: {
                    hoveredMainSeriesName: action.seriesName,
                    hint: sCurrentHint && {
                        ...sCurrentHint,
                        hoveredMainSeriesName: action.seriesName,
                    },
                },
            };
        }

        case 'CLEAR_MOUSE_MARKUP_STATE':
            return {
                ...state,
                markupInteraction: {
                    hint: undefined,
                    hoveredMainSeriesName: undefined,
                },
            };
    }
}

function reducePanelAction(
    state: PanelInteractionState,
    actionKey: PanelActionKey,
): PanelInteractionState {
    switch (actionKey) {
        case PanelActionKey.TOGGLE_HIGHLIGHT:
            return togglePanelOverlay(state, PanelOverlayMode.HIGHLIGHT, true);

        case PanelActionKey.TOGGLE_ANNOTATION:
            return togglePanelOverlay(state, PanelOverlayMode.ANNOTATION, false);

        case PanelActionKey.TOGGLE_DRAG_SELECT:
            return togglePanelOverlay(state, PanelOverlayMode.DRAG_SELECT, true);

        case PanelActionKey.TOGGLE_EDIT:
            if (state.editor.status === 'open') {
                return {
                    ...state,
                    editor: { status: 'closing' },
                };
            }

            return {
                ...state,
                editor: { status: 'open' },
            };

        case PanelActionKey.OPEN_EXPORT_CSV:
            return {
                ...state,
                popupState: { mode: PanelPopupMode.EXPORT_CSV },
            };

        case PanelActionKey.OPEN_DELETE_CONFIRM:
            return {
                ...state,
                popupState: { mode: PanelPopupMode.DELETE_CONFIRM },
            };

        case PanelActionKey.TOGGLE_RAW:
        case PanelActionKey.SET_GLOBAL_TIME:
        case PanelActionKey.REFRESH_DATA:
        case PanelActionKey.REFRESH_TIME:
        case PanelActionKey.EXPAND_FULL_RANGE:
            return state;
    }
}

function togglePanelOverlay(
    state: PanelInteractionState,
    nextOverlayMode: PanelOverlayMode,
    shouldClearSelectionSummary: boolean,
): PanelInteractionState {
    const sNextOverlayMode =
        state.overlayMode === nextOverlayMode
            ? PanelOverlayMode.NO_OVERLAY
            : nextOverlayMode;

    return {
        ...state,
        popupState: EMPTY_PANEL_POPUP_STATE,
        overlayMode: sNextOverlayMode,
        selectionSummary: shouldClearSelectionSummary
            ? undefined
            : state.selectionSummary,
    };
}
