import { useEffect, useMemo, useRef, useState } from 'react';
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

export function useBoardState(boardInfo: BoardInfo) {
    const [state, setState] = useState<BoardRuntimeState>(() =>
        createBoardRuntimeState(boardInfo),
    );
    const sPreviousBoardInfoRef = useRef(boardInfo);

    useEffect(() => {
        if (sPreviousBoardInfoRef.current === boardInfo) return;

        sPreviousBoardInfoRef.current = boardInfo;
        setState((current) => reconcileBoardRuntimeState(current, boardInfo));
    }, [boardInfo]);

    const commands = useMemo(() => ({
        setBoardRange: (
            rangeKind: AxisKind,
            rangeInput: RangeExpressionInput,
        ) => setState((current) => ({
            ...current,
            info: {
                ...current.info,
                [rangeKind === 'numeric'
                    ? 'boardNumericRange'
                    : 'boardTimeRange']: rangeInput,
            },
        })),
        applyPanelInfo: (panelInfo: PanelInfo) =>
            setState((current) => updatePanelInBoardState(
                current,
                panelInfo.key,
                () => panelInfo,
            )),
        appendPanel: (panelInfo: PanelInfo) => setState((current) =>
            createBoardRuntimeState({
                ...current.info,
                panels: [...current.info.panels, panelInfo],
            }, current),
        ),
        removePanel: (panelKey: string) => setState((current) => {
            const sPanelIndex = requirePanelIndex(
                current.info.panels,
                panelKey,
                'delete',
            );
            return createBoardRuntimeState({
                ...current.info,
                panels: current.info.panels.filter(
                    (_, index) => index !== sPanelIndex,
                ),
            }, current);
        }),
        setPanelOverlapSelected: (
            panelKey: string,
            isSelected: boolean,
        ) => setState((current) => updatePanelInBoardState(
            current,
            panelKey,
            (panelInfo) =>
                panelInfo.isOverlapSelected === isSelected
                    ? panelInfo
                    : { ...panelInfo, isOverlapSelected: isSelected },
        )),
        setPanelRange: (
            panelKey: string,
            rangeState: ResolvedRangeState,
        ) => setState((current) => {
            requirePanelIndex(current.info.panels, panelKey);
            return {
                ...current,
                panelRanges: {
                    ...current.panelRanges,
                    [panelKey]: rangeState,
                },
            };
        }),
        applySaveResult: (savedBoardInfo: BoardInfo) =>
            setState((current) =>
                savedBoardInfo.id === current.info.id
                    ? {
                          ...current,
                          info: mergeSavedBoardMetadata(
                              current.info,
                              savedBoardInfo,
                          ),
                      }
                    : current,
            ),
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

function reconcileBoardRuntimeState(
    state: BoardRuntimeState,
    boardInfo: BoardInfo,
): BoardRuntimeState {
    const sIncomingSavedCode = boardInfo.savedCode;
    if (
        boardInfo.id === state.info.id &&
        typeof sIncomingSavedCode === 'string' &&
        sIncomingSavedCode === state.info.savedCode
    ) {
        return {
            ...state,
            info: mergeSavedBoardMetadata(state.info, boardInfo),
        };
    }

    return createBoardRuntimeState(boardInfo, state);
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
