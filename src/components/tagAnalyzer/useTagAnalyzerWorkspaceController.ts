import { getRollupTableList } from '@/api/repository/machiot';
import { gBoardList, gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSetRecoilState } from 'recoil';
import { fetchNormalizedTopLevelTimeRange, fetchParsedTables } from './utils/TagAnalyzerFetchUtils';
import {
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './utils/TagAnalyzerSaveUtils';
import type {
    TagAnalyzerBoardInfo,
    BoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerEditRequest,
} from './TagAnalyzerTypes';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
} from './panel/PanelModel';
import {
    normalizeLegacyTimeRangeBoundary,
} from './utils/legacy/LegacyTimeRangeConversion';
import type { LegacyTimeValue } from './utils/legacy/LegacyTimeRangeTypes';

// Used by useTagAnalyzerWorkspaceController to type toolbar action handlers.
type TagAnalyzerToolbarActionHandlers = {
    onOpenTimeRangeModal: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void | Promise<void>;
    onSave: () => void;
    onOpenSaveModal: () => void;
    onOpenOverlapModal: () => void;
};

/**
 * Returns the next overlap-panel selection list after applying the requested change.
 * @param aPanels The current overlap-panel selection list.
 * @param aStart The selected panel start time.
 * @param aEnd The selected panel end time.
 * @param aBoard The panel info that owns the selection.
 * @param aIsRaw Whether the selected panel is currently in raw mode.
 * @param aChangeType The optional overlap-selection update mode.
 * @returns The next overlap-panel selection list.
 */
const getNextOverlapPanels = (
    aPanels: TagAnalyzerOverlapPanelInfo[],
    aStart: number,
    aEnd: number,
    aBoard: TagAnalyzerPanelInfo,
    aIsRaw: boolean,
    aChangeType: ('delete' | 'changed') | undefined,
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
 * Returns the next panel list with one panel's persisted time-keeper state applied.
 * @param aPanels The current normalized board panels.
 * @param aTargetPanel The panel key to update.
 * @param aTimeInfo The latest persisted time-keeper payload.
 * @param aRaw Whether the panel is currently in raw mode.
 * @returns The next normalized panel list.
 */
const getNextPanelsWithPersistedTimeKeeperState = (
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
/**
 * Owns the top-level TagAnalyzer workspace orchestration while keeping child contracts stable.
 * @param pArgs The current normalized board info and top-level modal handlers.
 * @returns The controller state and actions consumed by the thin TagAnalyzer view shell.
 */
export const useTagAnalyzerWorkspaceController = ({
    pInfo,
    pHandleSaveModalOpen,
    pSetIsSaveModal,
}: {
    pInfo: TagAnalyzerBoardInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
}): {
    boardInfo: TagAnalyzerBoardInfo;
    isLoadRollupTable: boolean;
    isDisplayTimeRangeModal: boolean;
    setTimeRangeModal: Dispatch<SetStateAction<boolean>>;
    isDisplayOverlapModal: boolean;
    setIsOverlapModal: Dispatch<SetStateAction<boolean>>;
    overlapPanels: TagAnalyzerOverlapPanelInfo[];
    editingPanel: TagAnalyzerEditRequest | undefined;
    setEditingPanel: Dispatch<SetStateAction<TagAnalyzerEditRequest | undefined>>;
    panelBoardState: TagAnalyzerBoardPanelState;
    panelBoardActions: BoardPanelActions;
    toolbarActionHandlers: TagAnalyzerToolbarActionHandlers;
    refreshTopLevelBgnEndTimeRange: (
        aStart: LegacyTimeValue | undefined,
        aEnd: LegacyTimeValue | undefined,
    ) => Promise<void>;
} => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setBoardList = useSetRecoilState(gBoardList);
    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapPanels, setOverlapPanels] = useState<TagAnalyzerOverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<TagAnalyzerBgnEndTimeRange | undefined>(
        undefined,
    );
    const [sEditingPanel, setEditingPanel] = useState<TagAnalyzerEditRequest | undefined>(undefined);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<TagAnalyzerGlobalTimeRangeState | undefined>(undefined);

    /**
     * Refreshes the shared top-level time bounds for the current board.
     * @param aStart The optional replacement board start value.
     * @param aEnd The optional replacement board end value.
     * @returns A promise that resolves once the top-level range state is updated.
     */
    const refreshTopLevelBgnEndTimeRange = async (
        aStart: LegacyTimeValue | undefined,
        aEnd: LegacyTimeValue | undefined,
    ) => {
        if (!pInfo.panels[0]?.data.tag_set) return;

        const sBoardTime =
            aStart === undefined && aEnd === undefined
                ? { range: pInfo.range, legacyRange: pInfo.legacyRange }
                : normalizeLegacyTimeRangeBoundary(aStart, aEnd);

        const sTimeRange = await fetchNormalizedTopLevelTimeRange(
            pInfo.panels[0].data.tag_set,
            sBoardTime.range,
            sBoardTime.legacyRange,
        );
        setBgnEndTimeRange(sTimeRange);
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
            setBgnEndTimeRange(undefined);
            return;
        }

        if (sFirstPanel.data.tag_set) {
            void (async () => {
                const sBoardTime = {
                    range: pInfo.range,
                    legacyRange: pInfo.legacyRange,
                };
                const sTimeRange = await fetchNormalizedTopLevelTimeRange(
                    sFirstPanel.data.tag_set,
                    sBoardTime.range,
                    sBoardTime.legacyRange,
                );
                setBgnEndTimeRange(sTimeRange);
            })();
            return;
        }

        setBgnEndTimeRange(undefined);
    }, [
        pInfo.legacyRange?.range_bgn,
        pInfo.legacyRange?.range_end,
        pInfo.panels,
        pInfo.range.max,
        pInfo.range.min,
    ]);

    return {
        boardInfo: pInfo,
        isLoadRollupTable: sIsLoadRollupTable,
        isDisplayTimeRangeModal: sIsDisplayTimeRangeModal,
        setTimeRangeModal,
        isDisplayOverlapModal: sIsDisplayOverlapModal,
        setIsOverlapModal: setIsOverlapModalOpen,
        overlapPanels: sOverlapPanels,
        editingPanel: sEditingPanel,
        setEditingPanel,
        panelBoardState: {
            refreshCount: sRefreshCount,
            overlapPanels: sOverlapPanels,
            bgnEndTimeRange: sBgnEndTimeRange,
            globalTimeRange: sGlobalDataAndNavigatorTime,
        },
        panelBoardActions: {
            onOverlapSelectionChange: (aStart, aEnd, aBoard, aIsRaw, aIsChanged) =>
                setOverlapPanels((aPrev) =>
                    getNextOverlapPanels(aPrev, aStart, aEnd, aBoard, aIsRaw, aIsChanged),
                ),
            onDeletePanel: (aPanelKey) =>
                setBoardList((aPrev) => getNextBoardListWithoutPanel(aPrev, pInfo.id, aPanelKey)),
            onPersistPanelState: (aTargetPanel, aTimeInfo, aRaw) => {
                const sUpdatedPanels = getNextPanelsWithPersistedTimeKeeperState(
                    pInfo.panels,
                    aTargetPanel,
                    aTimeInfo,
                    aRaw,
                );
                setBoardList((aPrev) =>
                    getNextBoardListWithSavedPanels(aPrev, pInfo.id, sUpdatedPanels),
                );
            },
            onSetGlobalTimeRange: (aDataTime, aNavigatorTime, aInterval) =>
                setGlobalDataAndNavigatorTime({
                    data: aDataTime,
                    navigator: aNavigatorTime,
                    interval: aInterval,
                }),
            onOpenEditRequest: setEditingPanel,
        },
        toolbarActionHandlers: {
            onOpenTimeRangeModal: () => setTimeRangeModal(true),
            onRefreshData: () => setRefreshCount((aPrev) => aPrev + 1),
            onRefreshTime: () => refreshTopLevelBgnEndTimeRange(undefined, undefined),
            onSave: pHandleSaveModalOpen,
            onOpenSaveModal: () => pSetIsSaveModal(true),
            onOpenOverlapModal: () => setIsOverlapModalOpen(true),
        },
        refreshTopLevelBgnEndTimeRange,
    };
};
