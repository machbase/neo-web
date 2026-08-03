import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
    ensureUniquePanelKeys,
    type PanelInfo,
} from '../panel/panelModel';
import type { BoardInfo } from './boardModel';
import { isSameRange } from '../range/rangeArithmetic';
import {
    type AxisKind,
    type RangeExpressionInput,
    type ResolvedRangeState,
} from '../range/rangeModel';

type BoardRuntimeState = {
    info: BoardInfo;
    panelRanges: { [panelKey: string]: ResolvedRangeState | undefined };
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
          rangeState: ResolvedRangeState;
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
        setPanelRange: (panelKey: string, rangeState: ResolvedRangeState) =>
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
        infoForSave: {
            ...state.info,
            panels: state.info.panels.map((panelInfo) =>
                getPanelInfoForSave(
                    panelInfo,
                    state.panelRanges[panelInfo.key],
                ),
            ),
        },
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
            sPreviousState?.panelRanges[panelInfo.key],
        ]),
    );

    return {
        info: {
            ...boardInfo,
            panels: sPanels,
        },
        panelRanges: sPanelRanges,
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
            return updatePanelInBoardState(
                state,
                action.panelInfo.key,
                () => action.panelInfo,
            );

        case 'APPEND_PANEL_INFO':
            return createBoardRuntimeState({
                ...state.info,
                panels: [...state.info.panels, action.panelInfo],
            }, state);

        case 'REMOVE_PANEL': {
            const sPanelIndex = requirePanelIndex(
                state.info.panels,
                action.panelKey,
                'delete',
            );
            return createBoardRuntimeState({
                ...state.info,
                panels: state.info.panels.filter(
                    (_, index) => index !== sPanelIndex,
                ),
            }, state);
        }

        case 'SET_PANEL_OVERLAP_SELECTED': {
            return updatePanelInBoardState(
                state,
                action.panelKey,
                (panelInfo) =>
                    panelInfo.isOverlapSelected === action.isSelected
                        ? panelInfo
                        : {
                              ...panelInfo,
                              isOverlapSelected: action.isSelected,
                          },
            );
        }

        case 'SET_PANEL_RANGE':
            requirePanelIndex(state.info.panels, action.panelKey);

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
    const { panels, boardTimeRange, boardNumericRange } = currentInfo;

    return {
        ...savedInfo,
        panels,
        boardTimeRange,
        boardNumericRange,
    };
}

function updatePanelInBoardState(
    state: BoardRuntimeState,
    panelKey: string,
    updatePanel: (panelInfo: PanelInfo) => PanelInfo,
): BoardRuntimeState {
    const sPanelIndex = requirePanelIndex(state.info.panels, panelKey);
    const sPanelInfo = state.info.panels[sPanelIndex];
    const sNextPanelInfo = updatePanel(sPanelInfo);

    if (sNextPanelInfo === sPanelInfo) return state;

    const sNextPanels = [...state.info.panels];
    sNextPanels[sPanelIndex] = sNextPanelInfo;
    return {
        ...state,
        info: {
            ...state.info,
            panels: sNextPanels,
        },
    };
}

function requirePanelIndex(
    panels: readonly PanelInfo[],
    panelKey: string,
    operation: 'update' | 'delete' = 'update',
): number {
    const sPanelIndex = panels.findIndex((panel) => panel.key === panelKey);
    if (sPanelIndex < 0) {
        throw new Error(
            `Cannot ${operation} missing TagAnalyzer panel: ${panelKey}`,
        );
    }
    return sPanelIndex;
}

function getPanelInfoForSave(
    panelInfo: PanelInfo,
    rangeState: ResolvedRangeState | undefined,
): PanelInfo {
    const sLastViewedRange = panelInfo.time.lastViewedRange;

    if (
        !panelInfo.time.useLastViewedRange ||
        !rangeState ||
        (sLastViewedRange !== undefined &&
            isSameRange(
                sLastViewedRange.mainRange,
                rangeState.range.mainRange,
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
