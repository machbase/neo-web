import { fetchTablesData, getRollupTableList } from '@/api/repository/machiot';
import { parseTables } from '@/utils';
import { gBoardList, gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSetRecoilState } from 'recoil';
import { flattenTagAnalyzerPanelInfo, normalizeTagAnalyzerPanelInfo } from './panel/PanelModelUtils';
import { callTagAnalyzerBgnEndTimeRange } from './TagAnalyzerUtilCaller';
import type {
    TagAnalyzerBoardInfo,
    TagAnalyzerBoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardSourceInfo,
    TagAnalyzerEditRequest,
} from './TagAnalyzerTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from './panel/TagAnalyzerPanelModelTypes';

type TagAnalyzerLooseBgnEndTimeRange = {
    bgn_min: string | number;
    bgn_max: string | number;
    end_min: string | number;
    end_max: string | number;
};

type TagAnalyzerToolbarActionHandlers = {
    onOpenTimeRangeModal: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void | Promise<void>;
    onSave: () => void;
    onOpenSaveModal: () => void;
    onOpenOverlapModal: () => void;
};

type UseTagAnalyzerWorkspaceControllerArgs = {
    pInfo: TagAnalyzerBoardSourceInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
};

type UseTagAnalyzerWorkspaceControllerResult = {
    boardInfo: TagAnalyzerBoardInfo;
    isLoadRollupTable: boolean;
    isDisplayTimeRangeModal: boolean;
    setTimeRangeModal: Dispatch<SetStateAction<boolean>>;
    isDisplayOverlapModal: boolean;
    setIsOverlapModal: Dispatch<SetStateAction<boolean>>;
    overlapPanels: TagAnalyzerOverlapPanelInfo[];
    editingPanel: TagAnalyzerEditRequest | null;
    setEditingPanel: Dispatch<SetStateAction<TagAnalyzerEditRequest | null>>;
    panelBoardState: TagAnalyzerBoardPanelState;
    panelBoardActions: TagAnalyzerBoardPanelActions;
    toolbarActionHandlers: TagAnalyzerToolbarActionHandlers;
    updateTopLevelBgnEndTime: (
        aStart?: TagAnalyzerRangeValue,
        aEnd?: TagAnalyzerRangeValue,
    ) => Promise<void>;
};

/**
 * Converts a loose time-range payload into the numeric shape used by TagAnalyzer charts.
 * @param aTimeRange The loose top-level time-range payload returned by the shared helper.
 * @returns A numeric-only time-range object suitable for TagAnalyzer state.
 */
const normalizeBgnEndTimeRange = (
    aTimeRange: TagAnalyzerLooseBgnEndTimeRange,
): Partial<TagAnalyzerBgnEndTimeRange> => {
    return {
        ...(typeof aTimeRange.bgn_min === 'number' ? { bgn_min: aTimeRange.bgn_min } : {}),
        ...(typeof aTimeRange.bgn_max === 'number' ? { bgn_max: aTimeRange.bgn_max } : {}),
        ...(typeof aTimeRange.end_min === 'number' ? { end_min: aTimeRange.end_min } : {}),
        ...(typeof aTimeRange.end_max === 'number' ? { end_max: aTimeRange.end_max } : {}),
    };
};

/**
 * Loads and parses the source-table metadata used by TagAnalyzer.
 * @returns The parsed table list when the fetch succeeds, otherwise `undefined`.
 */
const fetchParsedTables = async () => {
    const sResult: any = await fetchTablesData();
    if (!sResult.success) return undefined;
    return parseTables(sResult.data);
};

/**
 * Resolves the shared top-level tag time bounds for the current board.
 * @param aTagSet The first panel tag set used to seed the top-level range.
 * @param aStart The requested board start value.
 * @param aEnd The requested board end value.
 * @returns A normalized top-level range with numeric values only.
 */
const fetchNormalizedTopLevelTimeRange = async (
    aTagSet: TagAnalyzerPanelInfo['data']['tag_set'],
    aStart: TagAnalyzerRangeValue,
    aEnd: TagAnalyzerRangeValue,
) => {
    const sTimeRange = await callTagAnalyzerBgnEndTimeRange(aTagSet, { bgn: aStart, end: aEnd }, { bgn: '', end: '' });
    return normalizeBgnEndTimeRange(sTimeRange);
};

/**
 * Adds, updates, or removes overlap-panel selections for the overlap modal.
 * @param aPanels The current overlap-panel selection list.
 * @param aStart The selected panel start time.
 * @param aEnd The selected panel end time.
 * @param aBoard The panel info that owns the selection.
 * @param aIsRaw Whether the selected panel is currently in raw mode.
 * @param aChangeType The optional overlap-selection update mode.
 * @returns The next overlap-panel selection list.
 */
const updateOverlapPanels = (
    aPanels: TagAnalyzerOverlapPanelInfo[],
    aStart: number,
    aEnd: number,
    aBoard: TagAnalyzerPanelInfo,
    aIsRaw: boolean,
    aChangeType?: 'delete' | 'changed',
) => {
    const sPanelKey = aBoard.meta.index_key;
    const sDuration = aEnd - aStart;

    if (aChangeType === 'delete') {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    if (aChangeType === 'changed') {
        return aPanels.map((aItem) => {
            return aItem.board.meta.index_key === sPanelKey
                ? { ...aItem, isRaw: aIsRaw, start: aStart, duration: sDuration }
                : aItem;
        });
    }

    if (aPanels.some((aItem) => aItem.board.meta.index_key === sPanelKey)) {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    return [...aPanels, { start: aStart, duration: sDuration, isRaw: aIsRaw, board: aBoard }];
};

/**
 * Persists time-keeper state back onto a single panel.
 * @param aPanels The current normalized board panels.
 * @param aTargetPanel The panel key to update.
 * @param aTimeInfo The latest persisted time-keeper payload.
 * @param aRaw Whether the panel is currently in raw mode.
 * @returns The updated normalized panel list.
 */
const updatePanelTimeKeeperState = (
    aPanels: TagAnalyzerPanelInfo[],
    aTargetPanel: string,
    aTimeInfo: TagAnalyzerPanelTimeKeeper,
    aRaw: boolean,
) => {
    return aPanels.map((aPanel) => {
        if (aPanel.meta.index_key !== aTargetPanel) return aPanel;

        return {
            ...aPanel,
            time: {
                ...aPanel.time,
                time_keeper: {
                    ...aTimeInfo,
                },
            },
            data: {
                ...aPanel.data,
                raw_keeper: aRaw,
            },
        };
    });
};

/**
 * Replaces the current board panel list inside the stored board source list.
 * @param aBoards The stored board source list from Recoil.
 * @param aBoardId The board id to update.
 * @param aPanels The normalized panel list to persist back.
 * @returns The next stored board source list.
 */
const replaceBoardPanels = (
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanels: TagAnalyzerPanelInfo[],
) => {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? { ...aBoard, panels: aPanels.map((aPanel) => flattenTagAnalyzerPanelInfo(aPanel)) }
            : aBoard,
    );
};

/**
 * Removes a single panel from the stored board source list.
 * @param aBoards The stored board source list from Recoil.
 * @param aBoardId The board id to update.
 * @param aPanelKey The panel key to remove.
 * @returns The next stored board source list.
 */
const removeBoardPanel = (
    aBoards: TagAnalyzerBoardSourceInfo[],
    aBoardId: TagAnalyzerBoardSourceInfo['id'],
    aPanelKey: string,
) => {
    return aBoards.map((aBoard) =>
        aBoard.id === aBoardId
            ? {
                  ...aBoard,
                  panels: aBoard.panels.filter((aPanel) => aPanel.index_key !== aPanelKey),
              }
            : aBoard,
    );
};

/**
 * Owns the top-level TagAnalyzer workspace orchestration while keeping child contracts stable.
 * @param pArgs The current board source info and top-level modal handlers.
 * @returns The controller state and actions consumed by the thin TagAnalyzer view shell.
 */
export const useTagAnalyzerWorkspaceController = ({
    pInfo,
    pHandleSaveModalOpen: pOnSave,
    pSetIsSaveModal,
}: UseTagAnalyzerWorkspaceControllerArgs): UseTagAnalyzerWorkspaceControllerResult => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setBoardList = useSetRecoilState(gBoardList);
    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsModal] = useState(false);
    const [sPanelsInfo, setPanelsInfo] = useState<TagAnalyzerOverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<Partial<TagAnalyzerBgnEndTimeRange> | undefined>(undefined);
    const [sEditingPanel, setEditingPanel] = useState<TagAnalyzerEditRequest | null>(null);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] = useState<TagAnalyzerGlobalTimeRangeState | null>(null);
    const sBoardInfo: TagAnalyzerBoardInfo = {
        ...pInfo,
        panels: pInfo.panels.map((aPanel) => normalizeTagAnalyzerPanelInfo(aPanel)),
    };

    /**
     * Refreshes the shared top-level time bounds for the current board.
     * @param aStart The optional replacement board start value.
     * @param aEnd The optional replacement board end value.
     * @returns A promise that resolves once the top-level range state is updated.
     */
    const updateTopLevelBgnEndTime = async (
        aStart?: TagAnalyzerRangeValue,
        aEnd?: TagAnalyzerRangeValue,
    ) => {
        if (!sBoardInfo.panels[0]?.data.tag_set) return;

        const sTimeRange = await fetchNormalizedTopLevelTimeRange(
            sBoardInfo.panels[0].data.tag_set,
            aStart ?? pInfo.range_bgn,
            aEnd ?? pInfo.range_end,
        );
        setBgnEndTimeRange(sTimeRange);
    };

    /**
     * Updates the current overlap selection set for a panel.
     * @param aStart The selected panel start time.
     * @param aEnd The selected panel end time.
     * @param aBoard The panel that owns the overlap selection.
     * @param aIsRaw Whether the selected panel is in raw mode.
     * @param aIsChanged The optional overlap selection change type.
     * @returns Nothing.
     */
    const handleOverlapSelection = (
        aStart: number,
        aEnd: number,
        aBoard: TagAnalyzerPanelInfo,
        aIsRaw: boolean,
        aIsChanged?: 'delete' | 'changed',
    ) => {
        setPanelsInfo((aPrev) => updateOverlapPanels(aPrev, aStart, aEnd, aBoard, aIsRaw, aIsChanged));
    };

    /**
     * Persists panel time-keeper state back to the board list.
     * @param aTargetPanel The panel key to update.
     * @param aTimeInfo The latest panel time-keeper payload.
     * @param aRaw Whether the panel is currently in raw mode.
     * @returns Nothing.
     */
    const saveKeepData = (
        aTargetPanel: string,
        aTimeInfo: TagAnalyzerPanelTimeKeeper,
        aRaw: boolean,
    ) => {
        const sUpdatedPanels = updatePanelTimeKeeperState(sBoardInfo.panels, aTargetPanel, aTimeInfo, aRaw);
        setBoardList((aPrev) => replaceBoardPanels(aPrev, pInfo.id, sUpdatedPanels));
    };

    /**
     * Stores the latest globally shared data and navigator ranges.
     * @param aDataTime The visible panel range.
     * @param aNavigatorTime The navigator range.
     * @param aInterval The active fetch interval info.
     * @returns Nothing.
     */
    const handleGlobalTimeRange = (
        aDataTime: TagAnalyzerTimeRange,
        aNavigatorTime: TagAnalyzerTimeRange,
        aInterval: TagAnalyzerGlobalTimeRangeState['interval'],
    ) => {
        setGlobalDataAndNavigatorTime({ data: aDataTime, navigator: aNavigatorTime, interval: aInterval });
    };

    /**
     * Bumps the refresh counter used by child panels.
     * @returns Nothing.
     */
    const handleRefreshData = () => {
        setRefreshCount((aPrev) => aPrev + 1);
    };

    /**
     * Opens the panel editor for a specific panel request.
     * @param aEditRequest The requested panel editor payload.
     * @returns Nothing.
     */
    const handleEditRequest = (aEditRequest: TagAnalyzerEditRequest) => {
        setEditingPanel(aEditRequest);
    };

    /**
     * Removes a panel from the current board.
     * @param aPanelKey The panel key to delete.
     * @returns Nothing.
     */
    const handleDeletePanel = (aPanelKey: string) => {
        setBoardList((aPrev) => removeBoardPanel(aPrev, pInfo.id, aPanelKey));
    };

    /**
     * Refreshes the top-level time bounds using the current board range.
     * @returns A promise that resolves once the top-level time range refresh finishes.
     */
    const handleRefreshTime = async () => {
        await updateTopLevelBgnEndTime();
    };

    useEffect(() => {
        void (async () => {
            setIsLoadRollupTable(true);

            const [sParsedTables, sRollupTables] = await Promise.all([
                fetchParsedTables(),
                getRollupTableList(),
            ]);

            if (sParsedTables) setTables(sParsedTables);
            setRollupTables(sRollupTables);
            setIsLoadRollupTable(false);
        })();
    }, [setRollupTables, setTables]);

    useEffect(() => {
        const sFirstPanel = pInfo.panels[0];
        if (!sFirstPanel) {
            setBgnEndTimeRange({});
            return;
        }

        const sNormalizedFirstPanel = normalizeTagAnalyzerPanelInfo(sFirstPanel);
        if (sNormalizedFirstPanel.data.tag_set) {
            void (async () => {
                const sTimeRange = await fetchNormalizedTopLevelTimeRange(
                    sNormalizedFirstPanel.data.tag_set,
                    pInfo.range_bgn,
                    pInfo.range_end,
                );
                setBgnEndTimeRange(sTimeRange);
            })();
            return;
        }

        setBgnEndTimeRange({});
    }, [pInfo.range_bgn, pInfo.range_end, pInfo.panels]);

    return {
        boardInfo: sBoardInfo,
        isLoadRollupTable: sIsLoadRollupTable,
        isDisplayTimeRangeModal: sIsDisplayTimeRangeModal,
        setTimeRangeModal,
        isDisplayOverlapModal: sIsDisplayOverlapModal,
        setIsOverlapModal: setIsModal,
        overlapPanels: sPanelsInfo,
        editingPanel: sEditingPanel,
        setEditingPanel,
        panelBoardState: {
            refreshCount: sRefreshCount,
            overlapPanels: sPanelsInfo,
            bgnEndTimeRange: sBgnEndTimeRange,
            globalTimeRange: sGlobalDataAndNavigatorTime,
        },
        panelBoardActions: {
            onOverlapSelectionChange: handleOverlapSelection,
            onDeletePanel: handleDeletePanel,
            onPersistPanelState: saveKeepData,
            onSetGlobalTimeRange: handleGlobalTimeRange,
            onOpenEditRequest: handleEditRequest,
        },
        toolbarActionHandlers: {
            onOpenTimeRangeModal: () => setTimeRangeModal(true),
            onRefreshData: handleRefreshData,
            onRefreshTime: handleRefreshTime,
            onSave: pOnSave,
            onOpenSaveModal: () => pSetIsSaveModal(true),
            onOpenOverlapModal: () => setIsModal(true),
        },
        updateTopLevelBgnEndTime,
    };
};
