import type { BoardInfo } from '../domain/BoardDomain';
import {
    createRuntimePanelInfo,
    getPanelConfigFromRuntimePanel,
    type PanelInfo,
    type PanelRangeState,
    type RuntimePanelInfo,
} from '../domain/panel/PanelConfig';
import { ensureUniquePanelIndexKeys } from '../domain/panel/PanelIdentity';
import { createInitialPanelRangeState } from '../domain/panelRange/PanelRangeApply';
import type { TimeRangeInput } from '../domain/time/TimeTypes';
import {
    getPanelConfigForSaveFromRuntimePanel,
    removeRuntimePanel,
    updatePanelByKey,
} from './runtimeBoardPanels';

const EMPTY_BOARD_TIME_RANGE: TimeRangeInput = {
    start: '',
    end: '',
};

export type RuntimeBoardInfo = Omit<BoardInfo, 'panels'> & {
    panels: RuntimePanelInfo[];
};

export type RuntimeBoardAction =
    | { type: 'REPLACE_FROM_SAVED_BOARD'; boardInfo: BoardInfo }
    | { type: 'SET_BOARD_TIME_RANGE'; boardTimeRange: TimeRangeInput }
    | { type: 'APPLY_PANEL_CONFIG'; panelInfo: PanelInfo }
    | { type: 'APPEND_PANEL_CONFIG'; panelInfo: PanelInfo }
    | { type: 'REMOVE_PANEL'; panelKey: string }
    | {
          type: 'SET_PANEL_RANGE';
          panelKey: string;
          rangeState: PanelRangeState;
      }
    | {
          type: 'SET_PANEL_OVERLAP_SELECTED';
          panelKey: string;
          isOverlapSelected: boolean;
      };

export function createRuntimeBoardInfo(
    boardInfo: BoardInfo,
    previousRuntimeBoardInfo?: RuntimeBoardInfo,
): RuntimeBoardInfo {
    const sPreviousPanelsByKey = new Map(
        previousRuntimeBoardInfo?.panels.map((panel) => [panel.key, panel]) ?? [],
    );
    const sPanelsWithUniqueKeys = ensureUniquePanelIndexKeys(boardInfo.panels);

    return {
        ...boardInfo,
        boardTimeRange: normalizeBoardTimeRangeInput(boardInfo.boardTimeRange),
        panels: sPanelsWithUniqueKeys.map((panelInfo) => {
            const sPreviousRuntimePanel = sPreviousPanelsByKey.get(panelInfo.key);

            return sPreviousRuntimePanel
                ? setRuntimePanelConfig(sPreviousRuntimePanel, panelInfo)
                : createRuntimePanelInfo(
                      panelInfo,
                      createInitialPanelRangeState(),
                      false,
                  );
        }),
    };
}

function normalizeBoardTimeRangeInput(value: unknown): TimeRangeInput {
    if (typeof value !== 'object' || value === null) {
        return { ...EMPTY_BOARD_TIME_RANGE };
    }

    const sRangeInput = value as Partial<Record<keyof TimeRangeInput, unknown>>;
    const sStart = sRangeInput.start;
    const sEnd = sRangeInput.end;

    return {
        start: typeof sStart === 'string' ? sStart : '',
        end: typeof sEnd === 'string' ? sEnd : '',
    };
}

export function getBoardInfoForRuntimeBoardSave(
    runtimeBoardInfo: RuntimeBoardInfo,
): BoardInfo {
    return {
        id: runtimeBoardInfo.id,
        type: runtimeBoardInfo.type,
        name: runtimeBoardInfo.name,
        path: runtimeBoardInfo.path,
        code: runtimeBoardInfo.code,
        boardTimeRange: runtimeBoardInfo.boardTimeRange,
        savedCode: runtimeBoardInfo.savedCode,
        version: runtimeBoardInfo.version,
        panels: runtimeBoardInfo.panels.map(getPanelConfigForSaveFromRuntimePanel),
    };
}

export function runtimeBoardReducer(
    state: RuntimeBoardInfo,
    action: RuntimeBoardAction,
): RuntimeBoardInfo {
    switch (action.type) {
        case 'REPLACE_FROM_SAVED_BOARD':
            return createRuntimeBoardInfo(action.boardInfo, state);

        case 'SET_BOARD_TIME_RANGE':
            return {
                ...state,
                boardTimeRange: action.boardTimeRange,
            };

        case 'APPLY_PANEL_CONFIG':
            return {
                ...state,
                panels: updatePanelByKey(
                    state.panels,
                    action.panelInfo.key,
                    (panel) => setRuntimePanelConfig(panel, action.panelInfo),
                ),
            };

        case 'APPEND_PANEL_CONFIG':
            return {
                ...state,
                panels: ensureUniquePanelIndexKeys([
                    ...state.panels,
                    createRuntimePanelInfo(
                        action.panelInfo,
                        createInitialPanelRangeState(),
                        false,
                    ),
                ]),
            };

        case 'REMOVE_PANEL':
            return {
                ...state,
                panels: removeRuntimePanel(state.panels, action.panelKey),
            };

        case 'SET_PANEL_RANGE':
            return {
                ...state,
                panels: updatePanelByKey(state.panels, action.panelKey, (panel) =>
                    setRuntimePanelRange(panel, action.rangeState),
                ),
            };

        case 'SET_PANEL_OVERLAP_SELECTED':
            return {
                ...state,
                panels: updatePanelByKey(state.panels, action.panelKey, (panel) =>
                    setRuntimePanelOverlapSelected(
                        panel,
                        action.isOverlapSelected,
                    ),
                ),
            };
    }
}

export function setRuntimePanelConfig(
    runtimePanelInfo: RuntimePanelInfo,
    panelInfo: PanelInfo,
): RuntimePanelInfo {
    return {
        ...panelInfo,
        time: {
            config: panelInfo.time,
            runtimeRange: runtimePanelInfo.time.runtimeRange,
        },
        isOverlapSelected: runtimePanelInfo.isOverlapSelected,
    };
}

export function getRuntimePanelConfig(
    runtimePanelInfo: RuntimePanelInfo,
): PanelInfo {
    return getPanelConfigFromRuntimePanel(runtimePanelInfo);
}

function setRuntimePanelRange(
    runtimePanelInfo: RuntimePanelInfo,
    rangeState: PanelRangeState,
): RuntimePanelInfo {
    return {
        ...runtimePanelInfo,
        time: {
            ...runtimePanelInfo.time,
            runtimeRange: rangeState,
        },
    };
}

function setRuntimePanelOverlapSelected(
    runtimePanelInfo: RuntimePanelInfo,
    isOverlapSelected: boolean,
): RuntimePanelInfo {
    if (runtimePanelInfo.isOverlapSelected === isOverlapSelected) {
        return runtimePanelInfo;
    }

    return {
        ...runtimePanelInfo,
        isOverlapSelected,
    };
}
