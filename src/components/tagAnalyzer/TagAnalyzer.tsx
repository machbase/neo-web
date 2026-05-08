import {
    gBoardList,
    gRollupTableList,
    gSelectedTab,
    gTables,
} from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import TagAnalyzerBoardToolbar, { type BoardToolbarActions } from './TagAnalyzerBoardToolbar';
import OverlapModal from './boardModal/OverlapModal';
import type { OverlapPanelInfo } from './domain/OverlapModel';
import BoardTimeRangeModal from './boardModal/BoardTimeRangeModal';
import CreateChartModal from './modal/selectionPanel/CreateChartModal';
import TazSaveModal from './boardModal/TazSaveModal';
import { PlusCircle } from '@/assets/icons/Icon';
import { Button, Page, Toast } from '@/design-system/components';
import type {
    BoardActions,
    BoardInfo,
    BoardState,
    GlobalTimeRangeState,
    PersistPanelStatePayload,
} from './domain/BoardModel';
import { getNextOverlapPanels } from './boardModal/OverlapComparisonUtils';
import type { PanelInfo } from './domain/PanelModel';
import type { PanelNavigatorRangePair, TimeRangeConfig } from './time/TimeTypes';
import { fetchRollupMetadata } from './fetch/RollupMetadataFetcher';
import { fetchAvailableSourceTableNames } from './fetch/SourceTableNameFetcher';
import {
    type GlobalBoardListState,
    getNextBoardListWithAppendedPersistedPanel,
    getNextBoardListWithPersistedBoardInfo,
    getNextBoardListWithSavedBoard,
    getNextBoardListWithSavedPanel,
    getNextBoardListWithSavedPanels,
    getNextBoardListWithBoardTimeRange,
    getNextBoardListWithoutPanel,
} from './globalStateUpdate/gBoardListUpdater';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import { parseLoadedTaz } from './persistence/load/parseLoadedTaz';
import type {
    PersistedPanelInfoV200,
    PersistedTazBoardInfo,
} from './persistence/TazPersistenceTypesV200';
import type { SaveableTazBoard } from './persistence/save/createSavedTazBoard';
import { isSameTimeRange } from './time/TimeRangeUtils';
import { saveTaz, saveAsTaz } from './persistence/save/saveTazFile';

type PersistedPanelStateUpdate = {
    timeInfo: PanelNavigatorRangePair;
    isRaw: boolean;
};

type PendingPanelStateUpdates = Record<string, PersistedPanelStateUpdate>;

const PANEL_STATE_PERSIST_DEBOUNCE_MS = 150;

function hasPersistedTimeRangeChanged(
    panel: PanelInfo,
    timeInfo: PanelNavigatorRangePair,
    isRaw: boolean,
): boolean {
    const sCurrentTimeKeeper = panel.time.timeKeeper;

    return (
        panel.toolbar.isRaw !== isRaw ||
        !sCurrentTimeKeeper?.panelRange ||
        !sCurrentTimeKeeper?.navigatorRange ||
        !isSameTimeRange(sCurrentTimeKeeper.panelRange, timeInfo.panelRange) ||
        !isSameTimeRange(sCurrentTimeKeeper.navigatorRange, timeInfo.navigatorRange)
    );
}

function applyPendingTimeRangeUpdates(
    panels: PanelInfo[],
    pendingUpdates: PendingPanelStateUpdates,
): PanelInfo[] {
    let sHasChanges = false;

    const sNextPanels = panels.map((panel) => {
        const sPendingUpdate = pendingUpdates[panel.meta.index_key];
        if (!sPendingUpdate) {
            return panel;
        }

        if (
            !hasPersistedTimeRangeChanged(
                panel,
                sPendingUpdate.timeInfo,
                sPendingUpdate.isRaw,
            )
        ) {
            return panel;
        }

        sHasChanges = true;
        return {
            ...panel,
            toolbar: {
                ...panel.toolbar,
                isRaw: sPendingUpdate.isRaw,
            },
            time: {
                ...panel.time,
                timeKeeper: {
                    ...sPendingUpdate.timeInfo,
                },
            },
        };
    });

    return sHasChanges ? sNextPanels : panels;
}

const TagAnalyzer = ({
    pInfo,
}: {
    pInfo: PersistedTazBoardInfo;
    pHandleSaveModalOpen?: () => void;
    pSetIsSaveModal?: (isOpen: boolean) => void;
    pSetIsOpenModal?: (isOpen: boolean) => void;
}) => {
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sFileTree = useRecoilValue(gFileTree);
    const updateBoardList = useSetRecoilState<GlobalBoardListState>(gBoardList);
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setGlobalFileTree = useSetRecoilState(gFileTree);

    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);
    const [sRollupTableList, setRollupTableList] = useState<string[]>([]);
    const [sIsLoadingRollupMetadata, setIsLoadingRollupMetadata] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapPanels, setOverlapPanels] = useState<OverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sTimeRefreshCount, setTimeRefreshCount] = useState(0);
    const [sBoardTimeApplyCount, setBoardTimeApplyCount] = useState(0);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const [sIsTazSaveModalOpen, setIsTazSaveModalOpen] = useState(false);
    const sLatestBoardInfoRef = useRef<BoardInfo | undefined>(undefined);
    const sPersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const sPendingPanelStateUpdatesRef = useRef<PendingPanelStateUpdates>({});

    const newBoardInfo: BoardInfo = useMemo(
        () => parseLoadedTaz(pInfo),
        [pInfo],
    );
    const sIsActiveTab = sSelectedTab === newBoardInfo.id;
    sLatestBoardInfoRef.current = newBoardInfo;

    useEffect(() => {
        updateBoardList((prev) => getNextBoardListWithPersistedBoardInfo(prev, newBoardInfo));
    }, [newBoardInfo, updateBoardList]);

    const flushPendingPanelStatePersistence = useCallback(() => {
        const sPendingUpdates = sPendingPanelStateUpdatesRef.current;
        const sPendingKeys = Object.keys(sPendingUpdates);
        const sBoardInfo = sLatestBoardInfoRef.current;

        if (!sBoardInfo || sPendingKeys.length === 0) {
            return;
        }

        sPendingPanelStateUpdatesRef.current = {};
        const sNextPanels = applyPendingTimeRangeUpdates(
            sBoardInfo.panels,
            sPendingUpdates,
        );

        if (sNextPanels === sBoardInfo.panels) {
            return;
        }

        updateBoardList((prev) => {
            return getNextBoardListWithSavedPanels(prev, sBoardInfo.id, sNextPanels);
        });
    }, [updateBoardList]);

    const schedulePersistPanelState = useCallback(
        ({ targetPanelKey, timeInfo, isRaw }: PersistPanelStatePayload) => {
            const sBoardInfo = sLatestBoardInfoRef.current;
            const sPanel = sBoardInfo?.panels.find(
                (item) => item.meta.index_key === targetPanelKey,
            );

            if (sPanel && !hasPersistedTimeRangeChanged(sPanel, timeInfo, isRaw)) {
                return;
            }

            sPendingPanelStateUpdatesRef.current = {
                ...sPendingPanelStateUpdatesRef.current,
                [targetPanelKey]: {
                    timeInfo,
                    isRaw,
                },
            };

            if (sPersistTimerRef.current) {
                clearTimeout(sPersistTimerRef.current);
            }

            sPersistTimerRef.current = setTimeout(() => {
                sPersistTimerRef.current = undefined;
                flushPendingPanelStatePersistence();
            }, PANEL_STATE_PERSIST_DEBOUNCE_MS);
        },
        [flushPendingPanelStatePersistence],
    );

    useEffect(() => {
        return () => {
            if (sPersistTimerRef.current) {
                clearTimeout(sPersistTimerRef.current);
                sPersistTimerRef.current = undefined;
            }

            flushPendingPanelStatePersistence();
        };
    }, [flushPendingPanelStatePersistence]);

    useEffect(() => {
        void (async () => {
            setIsLoadingRollupMetadata(true);

            const [sSourceTableNames, sRollupTables] = await Promise.all([
                fetchAvailableSourceTableNames(),
                fetchRollupMetadata(),
            ]);

            const sResolvedSourceTableNames = sSourceTableNames ?? [];
            const sResolvedRollupTableList = sRollupTables as unknown as string[];

            setAvailableSourceTableNames(sResolvedSourceTableNames);
            setRollupTableList(sResolvedRollupTableList);
            setTables(sResolvedSourceTableNames);
            setRollupTables(sRollupTables);
            setIsLoadingRollupMetadata(false);
        })();
    }, [setRollupTables, setTables]);

    const requestPanelTimeRefresh = useCallback(() => {
        setTimeRefreshCount((prev) => prev + 1);
    }, []);

    const applyBoardTimeRange = useCallback(
        (timeRange: TimeRangeConfig) => {
            updateBoardList((prev) =>
                getNextBoardListWithBoardTimeRange(prev, newBoardInfo.id, timeRange),
            );
            setBoardTimeApplyCount((prev) => prev + 1);
        },
        [newBoardInfo.id, updateBoardList],
    );

    const saveCurrentTazBoard = useCallback(async (): Promise<boolean> => {
        const sBoardTab = pInfo as SaveableTazBoard;

        if (!sBoardTab.path) {
            setIsTazSaveModalOpen(true);
            return false;
        }

        try {
            const sSaveResult = await saveTaz(sBoardTab);
            if (!sSaveResult.success || !sSaveResult.savedBoard) {
                Toast.error('save file fail retry please');
                return false;
            }

            const sSavedBoard = sSaveResult.savedBoard;

            updateBoardList((prev) =>
                getNextBoardListWithSavedBoard(
                    prev,
                    sSavedBoard,
                ),
            );
            return true;
        } catch {
            Toast.error('save file fail retry please');
            return false;
        }
    }, [pInfo, updateBoardList]);

    const saveCurrentTazBoardAs = useCallback(
        async (directoryPath: string, fileName: string): Promise<boolean> => {
            const sBoardTab = pInfo as SaveableTazBoard;

            try {
                const sSaveResult = await saveAsTaz({
                    board: sBoardTab,
                    directoryPath,
                    fileName,
                });
                if (!sSaveResult.success || !sSaveResult.savedBoard) {
                    Toast.error('save file fail retry please');
                    return false;
                }

                const sSavedBoard = sSaveResult.savedBoard;

                updateBoardList((prev) =>
                    getNextBoardListWithSavedBoard(
                        prev,
                        sSavedBoard,
                    ),
                );

                const sUpdatedTreeResult = await TreeFetchDrilling(
                    sFileTree,
                    `${directoryPath}${fileName}`,
                    true,
                );
                if (sUpdatedTreeResult?.tree) {
                    setGlobalFileTree(JSON.parse(JSON.stringify(sUpdatedTreeResult.tree)));
                }
                return true;
            } catch {
                Toast.error('save file fail retry please');
                return false;
            }
        },
        [pInfo, sFileTree, updateBoardList, setGlobalFileTree],
    );

    useEffect(() => {
        if (!sIsActiveTab) {
            return undefined;
        }

        const handleDocumentSaveShortcut = function handleDocumentSaveShortcut(
            event: KeyboardEvent,
        ) {
            const sIsSaveShortcut =
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's';

            if (!sIsSaveShortcut) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            void saveCurrentTazBoard();
        };

        document.addEventListener('keydown', handleDocumentSaveShortcut, true);

        return () => {
            document.removeEventListener('keydown', handleDocumentSaveShortcut, true);
        };
    }, [saveCurrentTazBoard, sIsActiveTab]);

    const boardToolbarActions: BoardToolbarActions = {
        onOpenTimeRangeModal: () => setTimeRangeModal(true),
        onRefreshData: () => setRefreshCount((prev) => prev + 1),
        onRefreshTime: requestPanelTimeRefresh,
        onSave: () => void saveCurrentTazBoard(),
        onOpenSaveModal: () => setIsTazSaveModalOpen(true),
        onOpenOverlapModal: () => setIsOverlapModalOpen(true),
    };
    const sPanelBoardState: BoardState = {
        refreshCount: sRefreshCount,
        timeRefreshCount: sTimeRefreshCount,
        boardTimeApplyCount: sBoardTimeApplyCount,
        overlapPanels: sOverlapPanels,
        globalTimeRange: sGlobalDataAndNavigatorTime,
    };
    const sPanelBoardActions: BoardActions = {
        onOverlapSelectionChange: (payload) =>
            setOverlapPanels((prev) => getNextOverlapPanels(prev, payload)),
        onDeletePanel: ({ panelKey }) =>
            updateBoardList((prev) => getNextBoardListWithoutPanel(prev, newBoardInfo.id, panelKey)),
        onPersistPanelState: schedulePersistPanelState,
        onSavePanel: (panelInfo) =>
            updateBoardList((prev) =>
                getNextBoardListWithSavedPanel(
                    prev,
                    newBoardInfo.id,
                    panelInfo.meta.index_key,
                    panelInfo,
                ),
            ),
        onSetGlobalTimeRange: ({ dataTime, navigatorTime, interval }) =>
            setGlobalDataAndNavigatorTime({
                data: dataTime,
                navigator: navigatorTime,
                interval,
            }),
    };
    const appendNewPanelToBoard = useCallback(
        (panel: PersistedPanelInfoV200) => {
            updateBoardList((prev) =>
                getNextBoardListWithAppendedPersistedPanel(
                    prev,
                    newBoardInfo.id,
                    panel,
                ),
            );
        },
        [newBoardInfo.id, updateBoardList],
    );
    return (
        !sIsLoadingRollupMetadata && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Page>
                    <TagAnalyzerBoardToolbar
                        pTimeRangeConfig={newBoardInfo.boardTimeRange}
                        pPanelsInfoCount={sOverlapPanels.length}
                        pActionHandlers={boardToolbarActions}
                    />
                    <Page.Body>
                        <TagAnalyzerBoard
                            pInfo={newBoardInfo}
                            pIsActiveTab={sIsActiveTab}
                            pPanelBoardState={sPanelBoardState}
                            pPanelBoardActions={sPanelBoardActions}
                            pRollupTableList={sRollupTableList}
                        />
                        <Page.ContentBlock
                            pHoverNone
                            style={{ padding: '24px 32px' }}
                        >
                            <Button
                                variant="secondary"
                                fullWidth
                                shadow
                                icon={<PlusCircle size={16} />}
                                onClick={() => setIsNewPanelModal(true)}
                                style={{ height: '60px' }}
                            />
                            <CreateChartModal
                                isOpen={sIsNewPanelModal}
                                onClose={() => setIsNewPanelModal(false)}
                                pOnAppendPanel={appendNewPanelToBoard}
                                pAvailableSourceTableNames={sAvailableSourceTableNames}
                            />
                        </Page.ContentBlock>
                    </Page.Body>
                </Page>
                {sIsDisplayOverlapModal && (
                    <OverlapModal
                        pPanelsInfo={sOverlapPanels}
                        pRollupTableList={sRollupTableList}
                        pSetIsModal={setIsOverlapModalOpen}
                    />
                )}
                {sIsDisplayTimeRangeModal && (
                    <BoardTimeRangeModal
                        boardTimeRange={newBoardInfo.boardTimeRange}
                        onApply={applyBoardTimeRange}
                        onClose={() => setTimeRangeModal(false)}
                    />
                )}
                <TazSaveModal
                    isOpen={sIsTazSaveModalOpen}
                    initialDirectoryPath={newBoardInfo.path}
                    initialFileName={newBoardInfo.name}
                    onClose={() => setIsTazSaveModalOpen(false)}
                    onSave={saveCurrentTazBoardAs}
                />
            </div>
        )
    );
};
export default TagAnalyzer;
