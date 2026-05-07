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
    type Dispatch,
    type SetStateAction,
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
    type UpdateGlobalBoardList,
} from './globalStateUpdate/gBoardListUpdater';
import {
    convertTimeRangeConfigToResolvedTimeRangeMs,
} from './time/TimeBoundaryConverters';
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

/**
 * Checks whether a panel's persisted time state differs from the pending update.
 * Intent: Skip unnecessary board writes when the saved panel state already matches the queued data.
 * @param {PanelInfo} panel The panel whose persisted state is being compared.
 * @param {PanelNavigatorRangePair} timeInfo The pending saved time-range pair.
 * @param {boolean} isRaw Whether the pending panel state is in raw mode.
 * @returns {boolean} True when the persisted panel state needs to change.
 */
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

/**
 * Applies queued panel time updates to the current board panel list.
 * Intent: Batch debounced panel persistence changes into a single normalized board update.
 * @param {PanelInfo[]} panels The current normalized board panels.
 * @param {PendingPanelStateUpdates} pendingUpdates The queued panel updates keyed by panel id.
 * @returns {PanelInfo[]} The updated panel list, or the original list when nothing changed.
 */
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

/**
 * Renders the TagAnalyzer workspace and wires the top-level controller state.
 * Intent: Keep the workspace orchestration separate from the board, modal, and editor views.
 * @param {{ pInfo: PersistedTazBoardInfo; pHandleSaveModalOpen?: () => void; pSetIsSaveModal?: Dispatch<SetStateAction<boolean>>; pSetIsOpenModal?: Dispatch<SetStateAction<boolean>>; }} props The TagAnalyzer props for the current workspace.
 * @returns {JSX.Element} The rendered TagAnalyzer workspace.
 */
const TagAnalyzer = ({
    pInfo,
}: {
    pInfo: PersistedTazBoardInfo;
    pHandleSaveModalOpen?: () => void;
    pSetIsSaveModal?: Dispatch<SetStateAction<boolean>>;
    pSetIsOpenModal?: Dispatch<SetStateAction<boolean>>;
}) => {
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sFileTree = useRecoilValue(gFileTree);
    const setBoardList = useSetRecoilState<GlobalBoardListState>(gBoardList);
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setGlobalFileTree = useSetRecoilState(gFileTree);
    const updateBoardList = useCallback<UpdateGlobalBoardList>(
        (updater) => {
            setBoardList(updater);
        },
        [setBoardList],
    );

    const [sAvailableSourceTableNames, setAvailableSourceTableNames] = useState<string[]>([]);
    const [sRollupTableList, setRollupTableList] = useState<string[]>([]);
    const [sIsLoadingRollupMetadata, setIsLoadingRollupMetadata] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapPanels, setOverlapPanels] = useState<OverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sTimeRefreshCount, setTimeRefreshCount] = useState(0);
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
    const sResolvedBoardTime = useMemo(
        () => convertTimeRangeConfigToResolvedTimeRangeMs(newBoardInfo.boardTimeRange),
        [newBoardInfo.boardTimeRange],
    );
    const sIsActiveTab = sSelectedTab === newBoardInfo.id;
    sLatestBoardInfoRef.current = newBoardInfo;

    useEffect(() => {
        updateBoardList((prev) => getNextBoardListWithPersistedBoardInfo(prev, newBoardInfo));
    }, [newBoardInfo, updateBoardList]);

    /**
     * Flushes queued panel persistence updates into the board list.
     * Intent: Coalesce delayed panel saves into one board mutation after the debounce window.
     * @returns {void} Nothing.
     */
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

    /**
     * Queues a panel state update for debounced persistence.
     * Intent: Delay board-list writes until panel edits settle.
     * @param {{ targetPanelKey: string; timeInfo: PanelNavigatorRangePair; isRaw: boolean; }} aPayload The panel state payload to persist.
     * @returns {void} Nothing.
     */
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
            setTimeRefreshCount((prev) => prev + 1);
        },
        [newBoardInfo.id, updateBoardList],
    );

    /**
     * Saves the current TagAnalyzer board to its existing file path.
     * Intent: Use the TagAnalyzer serializer instead of the shared raw-tab save flow.
     * @returns {Promise<boolean>} True when the save succeeded.
     */
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

    /**
     * Saves the current TagAnalyzer board to a chosen file path.
     * Intent: Keep Save As on the clean TagAnalyzer payload while staying inside the TagAnalyzer folder.
     * @param {string} aDirectoryPath The selected target directory path.
     * @param {string} aFileName The selected target file name.
     * @returns {Promise<boolean>} True when the save succeeded.
     */
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

        /**
         * Intercepts the save shortcut for TagAnalyzer tabs.
         * Intent: Prevent the shared raw-tab save handler from running for `.taz` tabs.
         * @param {KeyboardEvent} event The keydown event.
         * @returns {void} Nothing.
         */
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

    const boardToolbarActions: BoardToolbarActions = useMemo(
        () =>
            buildToolbarActionHandlers(
                setTimeRangeModal,
                setRefreshCount,
                requestPanelTimeRefresh,
                () => void saveCurrentTazBoard(),
                () => setIsTazSaveModalOpen(true),
                setIsOverlapModalOpen,
            ),
        [
            requestPanelTimeRefresh,
            saveCurrentTazBoard,
            setIsOverlapModalOpen,
            setRefreshCount,
            setIsTazSaveModalOpen,
            setTimeRangeModal,
        ],
    );
    const sPanelBoardState: BoardState = useMemo(
        () => ({
            refreshCount: sRefreshCount,
            timeRefreshCount: sTimeRefreshCount,
            overlapPanels: sOverlapPanels,
            globalTimeRange: sGlobalDataAndNavigatorTime,
        }),
        [sGlobalDataAndNavigatorTime, sOverlapPanels, sRefreshCount, sTimeRefreshCount],
    );

    const sPanelBoardActions: BoardActions = useMemo(
        () =>
            buildPanelBoardActions(
                setOverlapPanels,
                updateBoardList,
                newBoardInfo,
                schedulePersistPanelState,
                setGlobalDataAndNavigatorTime,
            ),
        [
            newBoardInfo,
            schedulePersistPanelState,
            updateBoardList,
            setGlobalDataAndNavigatorTime,
            setOverlapPanels,
        ],
    );
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
                <Page pRef={undefined} style={undefined} className={undefined}>
                    <TagAnalyzerBoardToolbar
                        pRange={sResolvedBoardTime}
                        pPanelsInfoCount={sOverlapPanels.length}
                        pActionHandlers={boardToolbarActions}
                    />
                    <Page.Body
                        pSpyder={undefined}
                        pSpyderChildren={undefined}
                        fixed={undefined}
                        fullHeight={undefined}
                        style={undefined}
                        className={undefined}
                        scrollButtons={undefined}
                        footer={undefined}
                    >
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
                            pActive={undefined}
                            pSticky={undefined}
                        >
                            <Button
                                variant="secondary"
                                fullWidth
                                shadow
                                icon={<PlusCircle size={16} />}
                                onClick={() => setIsNewPanelModal(true)}
                                style={{ height: '60px' }}
                                size={undefined}
                                loading={undefined}
                                active={undefined}
                                iconPosition={undefined}
                                children={undefined}
                                isToolTip={undefined}
                                toolTipContent={undefined}
                                toolTipPlace={undefined}
                                toolTipMaxWidth={undefined}
                                forceOpacity={undefined}
                                label={undefined}
                                labelPosition={undefined}
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

/**
 * Builds the toolbar action handlers for the TagAnalyzer workspace.
 * Intent: Keep toolbar wiring centralized so the component tree stays easy to follow.
 * @param {Dispatch<SetStateAction<boolean>>} setTimeRangeModal The setter for the time-range modal.
 * @param {Dispatch<SetStateAction<number>>} setRefreshCount The setter for the refresh counter.
 * @param {() => void} onRefreshTime The callback that asks panels to re-resolve their own time ranges.
 * @param {() => void} onSave The save handler for the current board.
 * @param {() => void} onOpenSaveModal The handler that opens the TagAnalyzer-local save-as dialog.
 * @param {Dispatch<SetStateAction<boolean>>} setIsOverlapModalOpen The setter for the overlap modal.
 * @returns {BoardToolbarActions} The toolbar action bundle used by TagAnalyzerBoardToolbar.
 */
function buildToolbarActionHandlers(
    setTimeRangeModal: Dispatch<SetStateAction<boolean>>,
    setRefreshCount: Dispatch<SetStateAction<number>>,
    onRefreshTime: () => void,
    onSave: () => void,
    onOpenSaveModal: () => void,
    setIsOverlapModalOpen: Dispatch<SetStateAction<boolean>>,
): BoardToolbarActions {
    return {
        onOpenTimeRangeModal: () => setTimeRangeModal(true),
        onRefreshData: () => setRefreshCount((prev) => prev + 1),
        onRefreshTime,
        onSave: onSave,
        onOpenSaveModal: onOpenSaveModal,
        onOpenOverlapModal: () => setIsOverlapModalOpen(true),
    };
}

/**
 * Builds the board-level action handlers for TagAnalyzer panels.
 * Intent: Keep panel mutation wiring in one place so board events stay predictable.
 * @param {Dispatch<SetStateAction<OverlapPanelInfo[]>>} setOverlapPanels The setter for overlap selection state.
 * @param {UpdateGlobalBoardList} updateBoardList The callback that updates the global board list.
 * @param {BoardInfo} sBoardInfo The current normalized board info.
 * @param {BoardActions['onPersistPanelState']} onPersistPanelState The persisted panel-state handler to reuse.
 * @param {Dispatch<SetStateAction<GlobalTimeRangeState | undefined>>} setGlobalDataAndNavigatorTime The setter for the global time range state.
 * @returns {BoardActions} The board action bundle consumed by TagAnalyzerBoard.
 */
function buildPanelBoardActions(
    setOverlapPanels: Dispatch<SetStateAction<OverlapPanelInfo[]>>,
    updateBoardList: UpdateGlobalBoardList,
    sBoardInfo: BoardInfo,
    onPersistPanelState: BoardActions['onPersistPanelState'],
    setGlobalDataAndNavigatorTime: Dispatch<SetStateAction<GlobalTimeRangeState | undefined>>,
): BoardActions {
    return {
        onOverlapSelectionChange: (payload) =>
            setOverlapPanels((prev) => getNextOverlapPanels(prev, payload)),
        onDeletePanel: ({ panelKey }) =>
            updateBoardList((prev) => getNextBoardListWithoutPanel(prev, sBoardInfo.id, panelKey)),
        onPersistPanelState,
        onSavePanel: (panelInfo) =>
            updateBoardList((prev) =>
                getNextBoardListWithSavedPanel(
                    prev,
                    sBoardInfo.id,
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
}





