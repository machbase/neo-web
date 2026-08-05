import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ensureUniquePanelKeys,
    type PanelInfo,
} from '../panel/panelModel';
import type { BoardInfo } from './boardModel';
import {
    isResolvedPanelRangeState,
    LOADING_PANEL_RANGE_STATE,
    type PanelRangeSourceState,
} from '../panel/panelRangeSourceState';
import {
    isSameRange,
    isValidPanelRangeState,
} from '../range/rangeArithmetic';
import {
    type AxisKind,
    type RangeExpressionInput,
} from '../range/rangeModel';

type BoardRuntimeState = {
    info: BoardInfo;
    panelRanges: { [panelKey: string]: PanelRangeSourceState };
};

type BoardStateAction =
    | { type: 'RECONCILE_FROM_PROP'; boardInfo: BoardInfo }
    | {
          type: 'APPLY_SAVE_RESULT';
          boardInfo: BoardInfo;
      }
    | {
          type: 'SET_BOARD_RANGE';
          rangeKind: AxisKind;
          rangeInput: RangeExpressionInput;
      }
    | { type: 'APPLY_PANEL_INFO'; panelInfo: PanelInfo }
    | { type: 'APPEND_PANEL_INFO'; panelInfo: PanelInfo }
    | { type: 'REMOVE_PANEL'; panelKey: string }
    | {
          type: 'SET_PANEL_OVERLAP_SELECTED';
          panelKey: string;
          isSelected: boolean;
      }
    | {
          type: 'SET_PANEL_RANGE';
          panelKey: string;
          rangeState: PanelRangeSourceState;
      };

export function useBoardState(boardInfo: BoardInfo) {
    const [state, dispatch] = useReducer(
        boardStateReducer,
        boardInfo,
        createBoardRuntimeState,
    );
    const sPreviousBoardInfoRef = useRef(boardInfo);

    useEffect(() => {
        if (sPreviousBoardInfoRef.current === boardInfo) return;

        sPreviousBoardInfoRef.current = boardInfo;
        dispatch({ type: 'RECONCILE_FROM_PROP', boardInfo });
    }, [boardInfo]);

    const commands = useMemo(() => ({
        setBoardRange: (
            rangeKind: AxisKind,
            rangeInput: RangeExpressionInput,
        ) => dispatch({ type: 'SET_BOARD_RANGE', rangeKind, rangeInput }),
        applyPanelInfo: (panelInfo: PanelInfo) =>
            dispatch({ type: 'APPLY_PANEL_INFO', panelInfo }),
        appendPanel: (panelInfo: PanelInfo) =>
            dispatch({ type: 'APPEND_PANEL_INFO', panelInfo }),
        removePanel: (panelKey: string) =>
            dispatch({ type: 'REMOVE_PANEL', panelKey }),
        setPanelOverlapSelected: (
            panelKey: string,
            isSelected: boolean,
        ) => dispatch({
            type: 'SET_PANEL_OVERLAP_SELECTED',
            panelKey,
            isSelected,
        }),
        setPanelRange: (panelKey: string, rangeState: PanelRangeSourceState) =>
            dispatch({ type: 'SET_PANEL_RANGE', panelKey, rangeState }),
        applySaveResult: (
            savedBoardInfo: BoardInfo,
        ) => dispatch({
            type: 'APPLY_SAVE_RESULT',
            boardInfo: savedBoardInfo,
        }),
    }), []);

    return {
        state,
        infoForSave: getBoardInfoForSave(state),
        commands,
    };
}

function createBoardRuntimeState(
    boardInfo: BoardInfo,
    previousState?: BoardRuntimeState,
): BoardRuntimeState {
    const sPreviousState = previousState?.info.id === boardInfo.id
        ? previousState
        : undefined;
    const sPreviousPanelsByKey = new Map(
        sPreviousState?.info.panels.map((panel) => [panel.key, panel]) ?? [],
    );
    const sPanels = ensureUniquePanelKeys(boardInfo.panels).map((panel) => ({
        ...panel,
        isOverlapSelected:
            sPreviousPanelsByKey.get(panel.key)?.isOverlapSelected ??
            (panel.isOverlapSelected === true),
    }));
    const sPanelRanges = Object.fromEntries(
        sPanels.map((panelInfo) => [
            panelInfo.key,
            sPreviousState?.panelRanges[panelInfo.key] ??
                LOADING_PANEL_RANGE_STATE,
        ]),
    );

    return {
        info: {
            ...boardInfo,
            boardTimeRange: normalizeBoardRangeInput(boardInfo.boardTimeRange),
            boardNumericRange: normalizeBoardRangeInput(
                boardInfo.boardNumericRange,
            ),
            panels: sPanels,
        },
        panelRanges: sPanelRanges,
    };
}

function normalizeBoardRangeInput(value: unknown): RangeExpressionInput {
    if (typeof value !== 'object' || value === null) {
        return { start: '', end: '' };
    }

    const sRangeInput = value as { start?: unknown; end?: unknown };
    return {
        start: typeof sRangeInput.start === 'string' ? sRangeInput.start : '',
        end: typeof sRangeInput.end === 'string' ? sRangeInput.end : '',
    };
}

function getBoardInfoForSave(state: BoardRuntimeState): BoardInfo {
    return {
        ...state.info,
        panels: state.info.panels.map((panelInfo) =>
            getPanelInfoForSave(panelInfo, state.panelRanges[panelInfo.key]),
        ),
    };
}

function boardStateReducer(
    state: BoardRuntimeState,
    action: BoardStateAction,
): BoardRuntimeState {
    switch (action.type) {
        case 'RECONCILE_FROM_PROP': {
            const sIncomingSavedCode = action.boardInfo.savedCode;
            const sIsAlreadyAppliedSavedSnapshot =
                action.boardInfo.id === state.info.id &&
                typeof sIncomingSavedCode === 'string' &&
                sIncomingSavedCode === state.info.savedCode;

            if (sIsAlreadyAppliedSavedSnapshot) {
                return {
                    ...state,
                    info: mergeSavedBoardMetadata(state.info, action.boardInfo),
                };
            }

            return createBoardRuntimeState(
                action.boardInfo,
                state,
            );
        }

        case 'APPLY_SAVE_RESULT':
            if (action.boardInfo.id !== state.info.id) return state;

            return {
                ...state,
                info: mergeSavedBoardMetadata(state.info, action.boardInfo),
            };

        case 'SET_BOARD_RANGE':
            return {
                ...state,
                info: {
                    ...state.info,
                    [action.rangeKind === 'numeric'
                        ? 'boardNumericRange'
                        : 'boardTimeRange']: action.rangeInput,
                },
            };

        case 'APPLY_PANEL_INFO':
            return replacePanelInBoardState(state, action.panelInfo);

        case 'APPEND_PANEL_INFO':
            return createBoardRuntimeState({
                ...state.info,
                panels: [...state.info.panels, action.panelInfo],
            }, state);

        case 'REMOVE_PANEL':
            return createBoardRuntimeState({
                ...state.info,
                panels: removePanel(state.info.panels, action.panelKey),
            }, state);

        case 'SET_PANEL_OVERLAP_SELECTED': {
            const sPanelInfo = state.info.panels.find(
                (panel) => panel.key === action.panelKey,
            );
            if (!sPanelInfo) {
                throw new Error(
                    `Cannot update missing TagAnalyzer panel: ${action.panelKey}`,
                );
            }
            if (sPanelInfo.isOverlapSelected === action.isSelected) {
                return state;
            }

            return replacePanelInBoardState(state, {
                ...sPanelInfo,
                isOverlapSelected: action.isSelected,
            });
        }

        case 'SET_PANEL_RANGE':
            if (!state.info.panels.some((panel) => panel.key === action.panelKey)) {
                throw new Error(
                    `Cannot update missing TagAnalyzer panel: ${action.panelKey}`,
                );
            }

            return {
                ...state,
                panelRanges: {
                    ...state.panelRanges,
                    [action.panelKey]: action.rangeState,
                },
            };
    }
}

function mergeSavedBoardMetadata(
    currentInfo: BoardInfo,
    savedInfo: BoardInfo,
): BoardInfo {
    return {
        ...currentInfo,
        id: savedInfo.id,
        type: savedInfo.type,
        name: savedInfo.name,
        path: savedInfo.path,
        code: savedInfo.code,
        savedCode: savedInfo.savedCode,
        version: savedInfo.version,
        loadWarning: savedInfo.loadWarning,
    };
}

function replacePanelInBoardState(
    state: BoardRuntimeState,
    panelInfo: PanelInfo,
): BoardRuntimeState {
    const sPanelIndex = state.info.panels.findIndex(
        (panel) => panel.key === panelInfo.key,
    );
    if (sPanelIndex < 0) {
        throw new Error(
            `Cannot update missing TagAnalyzer panel: ${panelInfo.key}`,
        );
    }

    const sNextPanels = [...state.info.panels];
    sNextPanels[sPanelIndex] = panelInfo;
    return {
        ...state,
        info: {
            ...state.info,
            panels: sNextPanels,
        },
    };
}

function removePanel(panels: PanelInfo[], panelKey: string): PanelInfo[] {
    const sNextPanels = panels.filter((panel) => panel.key !== panelKey);
    if (sNextPanels.length === panels.length) {
        throw new Error(`Cannot delete missing TagAnalyzer panel: ${panelKey}`);
    }
    return sNextPanels;
}

function getPanelInfoForSave(
    panelInfo: PanelInfo,
    rangeState: PanelRangeSourceState | undefined,
): PanelInfo {
    const sLastViewedRange = panelInfo.time.lastViewedRange;

    if (
        !panelInfo.time.useLastViewedRange ||
        !rangeState ||
        !isResolvedPanelRangeState(rangeState) ||
        (isValidPanelRangeState(sLastViewedRange) &&
            isSameRange(
                sLastViewedRange.panelRange,
                rangeState.range.panelRange,
            ) &&
            isSameRange(
                sLastViewedRange.navigatorRange,
                rangeState.range.navigatorRange,
            ))
    ) {
        return panelInfo;
    }

    return {
        ...panelInfo,
        time: {
            ...panelInfo.time,
            lastViewedRange: rangeState.range,
        },
    };
}
