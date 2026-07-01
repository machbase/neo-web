import { useReducer } from 'react';
import type { PanelMarkupInteractionHintState } from './PanelMarkupInteractionHint';
import { PanelActionKey } from './PanelHeader';
import {
    PanelPopupMode,
    type PanelPopupState,
    type PanelSelectionSummary,
} from './PanelPopups';
import { PanelOverlayMode } from '../domain/panel/PanelActions';

const EMPTY_PANEL_POPUP_STATE: PanelPopupState = { mode: PanelPopupMode.NONE };

export enum PanelRuntimeTimeRangeTarget {
    MAIN_CHART = 'MAIN_CHART',
    NAVIGATOR = 'NAVIGATOR',
}

type PanelTimeRangeModalState =
    | { status: 'closed' }
    | { status: 'open'; target: PanelRuntimeTimeRangeTarget };

type PanelEditorState =
    | { status: 'closed' }
    | { status: 'open' }
    | { status: 'closing' };

type PanelSelectionSummaryState =
    | { status: 'none' }
    | { status: 'open'; summary: PanelSelectionSummary };

type PanelMarkupHintState =
    | { status: 'hidden' }
    | { status: 'visible'; hint: PanelMarkupInteractionHintState };

type PanelHoveredMainSeriesState =
    | { status: 'none' }
    | { status: 'hovered'; seriesName: string };

type PanelMarkupInteractionState = {
    hint: PanelMarkupHintState;
    hoveredMainSeries: PanelHoveredMainSeriesState;
};

export type PanelInteractionState = {
    overlayMode: PanelOverlayMode;
    popupState: PanelPopupState;
    timeRangeModal: PanelTimeRangeModalState;
    editor: PanelEditorState;
    selectionSummary: PanelSelectionSummaryState;
    markupInteraction: PanelMarkupInteractionState;
};

export type PanelInteractionAction =
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
          seriesName: string;
      }
    | { type: 'CLEAR_HOVERED_MAIN_SERIES' }
    | { type: 'CLEAR_MOUSE_MARKUP_STATE' };

const INITIAL_PANEL_INTERACTION_STATE: PanelInteractionState = {
    overlayMode: PanelOverlayMode.NO_OVERLAY,
    popupState: EMPTY_PANEL_POPUP_STATE,
    timeRangeModal: { status: 'closed' },
    editor: { status: 'closed' },
    selectionSummary: { status: 'none' },
    markupInteraction: {
        hint: { status: 'hidden' },
        hoveredMainSeries: { status: 'none' },
    },
};

export function usePanelInteractionState() {
    const [state, dispatch] = useReducer(
        panelInteractionReducer,
        INITIAL_PANEL_INTERACTION_STATE,
    );

    return { state, dispatch };
}

function panelInteractionReducer(
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
                timeRangeModal: { status: 'open', target: action.target },
            };

        case 'CLOSE_TIME_RANGE_MODAL':
            return {
                ...state,
                timeRangeModal: { status: 'closed' },
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
                selectionSummary: {
                    status: 'open' as const,
                    summary: action.selectionSummary,
                },
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
                selectionSummary: { status: 'none' },
            };

        case 'SHOW_MARKUP_INTERACTION_HINT':
            return {
                ...state,
                markupInteraction: {
                    ...state.markupInteraction,
                    hint: { status: 'visible', hint: action.hint },
                },
            };

        case 'SET_HOVERED_MAIN_SERIES':
            return updateHoveredMainSeries(state, {
                status: 'hovered',
                seriesName: action.seriesName,
            });

        case 'CLEAR_HOVERED_MAIN_SERIES':
            return updateHoveredMainSeries(state, { status: 'none' });

        case 'CLEAR_MOUSE_MARKUP_STATE':
            return {
                ...state,
                markupInteraction: {
                    hint: { status: 'hidden' },
                    hoveredMainSeries: { status: 'none' },
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
            ? { status: 'none' }
            : state.selectionSummary,
    };
}

function updateHoveredMainSeries(
    state: PanelInteractionState,
    hoveredMainSeries: PanelHoveredMainSeriesState,
): PanelInteractionState {
    const sHoveredMainSeriesName = getHoveredMainSeriesName(hoveredMainSeries);
    const sCurrentHint = state.markupInteraction.hint;

    return {
        ...state,
        markupInteraction: {
            hoveredMainSeries,
            hint:
                sCurrentHint.status === 'visible'
                    ? {
                          status: 'visible',
                          hint: {
                              ...sCurrentHint.hint,
                              hoveredMainSeriesName: sHoveredMainSeriesName,
                          },
                      }
                    : sCurrentHint,
        },
    };
}

export function getHoveredMainSeriesName(
    hoveredMainSeries: PanelHoveredMainSeriesState,
): string | undefined {
    return hoveredMainSeries.status === 'hovered'
        ? hoveredMainSeries.seriesName
        : undefined;
}

export function getOpenTimeRangeModalTarget(
    timeRangeModal: PanelTimeRangeModalState,
): PanelRuntimeTimeRangeTarget | undefined {
    return timeRangeModal.status === 'open' ? timeRangeModal.target : undefined;
}

export function getOpenSelectionSummary(
    selectionSummary: PanelSelectionSummaryState,
): PanelSelectionSummary | undefined {
    return selectionSummary.status === 'open' ? selectionSummary.summary : undefined;
}

export function getVisibleMarkupInteractionHint(
    markupInteraction: PanelMarkupInteractionState,
): PanelMarkupInteractionHintState | undefined {
    return markupInteraction.hint.status === 'visible'
        ? markupInteraction.hint.hint
        : undefined;
}
