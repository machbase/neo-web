import {
    gBoardList,
    GBoardListType,
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
import { SetterOrUpdater, useRecoilValue, useSetRecoilState } from 'recoil';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import TagAnalyzerBoardToolbar, { type BoardToolbarActions } from './TagAnalyzerBoardToolbar';
import TimeRangeModal from '../modal/TimeRangeModal';
import OverlapModal from './boardModal/OverlapModal';
import PanelEditor from './editor/PanelEditor';
import CreateChartModal from './boardModal/CreateChartModal';
import TazSaveModal from './boardModal/TazSaveModal';
import { PlusCircle } from '@/assets/icons/Icon';
import { Button, Page, Toast } from '@/design-system/components';
import { convertPanelInfoToEditorConfig } from './editor/PanelEditorConfigConverter';
import type {
    BoardInfo,
    BoardPanelActions,
    BoardPanelState,
    EditRequest,
    GlobalTimeRangeState,
    OverlapPanelInfo,
    PersistPanelStatePayload,
} from './utils/boardTypes';
import { getNextOverlapPanels } from './boardModal/OverlapComparisonUtils';
import type { PanelInfo } from './utils/panelModelTypes';
import type { TimeRangePair } from './utils/time/types/TimeTypes';
import {
    fetchParsedTables,
    getRollupTableList,
    fetchTopLevelTimeBoundaryRanges,
} from './utils/fetch/TagAnalyzerDataRepository';
import type { TopLevelTimeBoundaryResponse } from './utils/fetch/FetchTypes';
import {
    getNextBoardListWithSavedPanel,
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
    getNextBoardListWithPersistedBoardInfo,
} from './utils/workspace/TazSavedBoardState';
import {
    normalizeLegacyTimeRangeBoundary,
} from './utils/legacy/LegacyTimeAdapter';
import type { LegacyTimeValue } from './utils/legacy/LegacyTypes';
import { postFileList } from '@/api/repository/api';
import { TreeFetchDrilling } from '@/utils/UpdateTree';
import {
    parseReceivedBoardInfo,
} from './utils/persistence/versionParsing/TazBoardVersionParser';
import type { PersistedTazBoardInfo } from './utils/persistence/TazPersistenceTypes';
import type { PersistedPanelInfoV200 } from './utils/persistence/TazPanelPersistenceTypes';
import { isSameTimeRange } from './utils/time/PanelTimeRangeResolver';
import {
    createSavedTazBoardAfterSave,
    createSavedTazBoardAfterSaveAs,
    createTazSavePayload,
    type TazBoardTab,
} from './utils/workspace/TazTabState';

type PersistedPanelStateUpdate = {
    timeInfo: TimeRangePair;
    isRaw: boolean;
};

type PendingPanelStateUpdates = Record<string, PersistedPanelStateUpdate>;

const PANEL_STATE_PERSIST_DEBOUNCE_MS = 150;

/**
 * Checks whether a panel's persisted time state differs from the pending update.
 * Intent: Skip unnecessary board writes when the saved panel state already matches the queued data.
 * @param {PanelInfo} aPanel The panel whose persisted state is being compared.
 * @param {TimeRangePair} aTimeInfo The pending saved time-range pair.
 * @param {boolean} aIsRaw Whether the pending panel state is in raw mode.
 * @returns {boolean} True when the persisted panel state needs to change.
 */
function hasPersistedTimeRangeChanged(
    aPanel: PanelInfo,
    aTimeInfo: TimeRangePair,
    aIsRaw: boolean,
): boolean {
    const sCurrentTimeKeeper = aPanel.time.time_keeper;

    return (
        aPanel.toolbar.isRaw !== aIsRaw ||
        !sCurrentTimeKeeper?.panelRange ||
        !sCurrentTimeKeeper?.navigatorRange ||
        !isSameTimeRange(sCurrentTimeKeeper.panelRange, aTimeInfo.panelRange) ||
        !isSameTimeRange(sCurrentTimeKeeper.navigatorRange, aTimeInfo.navigatorRange)
    );
}

/**
 * Applies queued panel time updates to the current board panel list.
 * Intent: Batch debounced panel persistence changes into a single normalized board update.
 * @param {PanelInfo[]} aPanels The current normalized board panels.
 * @param {PendingPanelStateUpdates} aPendingUpdates The queued panel updates keyed by panel id.
 * @returns {PanelInfo[]} The updated panel list, or the original list when nothing changed.
 */
function applyPendingTimeRangeUpdates(
    aPanels: PanelInfo[],
    aPendingUpdates: PendingPanelStateUpdates,
): PanelInfo[] {
    let sHasChanges = false;

    const sNextPanels = aPanels.map((aPanel) => {
        const sPendingUpdate = aPendingUpdates[aPanel.meta.index_key];
        if (!sPendingUpdate) {
            return aPanel;
        }

        if (
            !hasPersistedTimeRangeChanged(
                aPanel,
                sPendingUpdate.timeInfo,
                sPendingUpdate.isRaw,
            )
        ) {
            return aPanel;
        }

        sHasChanges = true;
        return {
            ...aPanel,
            toolbar: {
                ...aPanel.toolbar,
                isRaw: sPendingUpdate.isRaw,
            },
            time: {
                ...aPanel.time,
                time_keeper: {
                    ...sPendingUpdate.timeInfo,
                },
            },
        };
    });

    return sHasChanges ? sNextPanels : aPanels;
}

/**
 * Checks whether two fetched top-level time-boundary payloads are equivalent.
 * Intent: Avoid reapplying board boundary state when the fetched values did not change.
 * @param {TopLevelTimeBoundaryResponse} aLeft The previous boundary payload.
 * @param {TopLevelTimeBoundaryResponse} aRight The next boundary payload.
 * @returns {boolean} True when both payloads describe the same boundary values.
 */
function isSameTimeBoundaryRanges(
    aLeft: TopLevelTimeBoundaryResponse,
    aRight: TopLevelTimeBoundaryResponse,
): boolean {
    if (aLeft === aRight) {
        return true;
    }

    if (!aLeft || !aRight) {
        return false;
    }

    return (
        aLeft.start.min === aRight.start.min &&
        aLeft.start.max === aRight.start.max &&
        aLeft.end.min === aRight.end.min &&
        aLeft.end.max === aRight.end.max
    );
}

/**
 * Renders the TagAnalyzer workspace and wires the top-level controller state.
 * Intent: Keep the workspace orchestration separate from the board, modal, and editor views.
 * @param {{ pInfo: PersistedTazBoardInfo; pHandleSaveModalOpen: () => void; pSetIsSaveModal: Dispatch<SetStateAction<boolean>>; pSetIsOpenModal?: Dispatch<SetStateAction<boolean>>; }} props The TagAnalyzer props for the current workspace.
 * @returns {JSX.Element} The rendered TagAnalyzer workspace.
 */
const TagAnalyzer = ({
    pInfo,
}: {
    pInfo: PersistedTazBoardInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
    pSetIsOpenModal?: Dispatch<SetStateAction<boolean>>;
}) => {
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sFileTree = useRecoilValue(gFileTree);
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setBoardList = useSetRecoilState(gBoardList);
    const setGlobalFileTree = useSetRecoilState(gFileTree);

    const [sTables, setLoadedTables] = useState<string[]>([]);
    const [sRollupTableList, setLoadedRollupTableList] = useState<string[]>([]);
    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapPanels, setOverlapPanels] = useState<OverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sTimeBoundaryRanges, setTimeBoundaryRanges] =
        useState<TopLevelTimeBoundaryResponse>(null);
    const [sEditingPanel, setEditingPanel] = useState<EditRequest | undefined>(undefined);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const [sIsTazSaveModalOpen, setIsTazSaveModalOpen] = useState(false);
    const sLatestBoardInfoRef = useRef<BoardInfo | undefined>(undefined);
    const sPersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const sPendingPanelStateUpdatesRef = useRef<PendingPanelStateUpdates>({});

    const newBoardInfo: BoardInfo = useMemo(
        () => parseReceivedBoardInfo(pInfo),
        [pInfo],
    );
    const sEditingPanelEditorConfig = useMemo(
        () =>
            sEditingPanel
                ? convertPanelInfoToEditorConfig(sEditingPanel.pPanelInfo)
                : undefined,
        [sEditingPanel],
    );
    const sIsActiveTab = sSelectedTab === newBoardInfo.id;
    sLatestBoardInfoRef.current = newBoardInfo;
    const sBoardRangeMin = newBoardInfo.range.min;
    const sBoardRangeMax = newBoardInfo.range.max;
    const sBoardRangeStart = newBoardInfo.rangeConfig.start;
    const sBoardRangeEnd = newBoardInfo.rangeConfig.end;
    const sBoardRangeConfigKey = JSON.stringify(newBoardInfo.rangeConfig);
    const sFirstPanelTagSetKey = JSON.stringify(newBoardInfo.panels[0]?.data.tag_set ?? []);
    const sTopLevelTimeBoundaryRequest = useMemo(() => {
        const sFirstPanelTagSet = newBoardInfo.panels[0]?.data.tag_set;

        if (!sFirstPanelTagSet) {
            return undefined;
        }

        return {
            tagSet: sFirstPanelTagSet,
            boardTime: {
                range: {
                    min: sBoardRangeMin,
                    max: sBoardRangeMax,
                },
                rangeConfig: {
                    start: sBoardRangeStart,
                    end: sBoardRangeEnd,
                },
            },
        };
    }, [
        sBoardRangeMax,
        sBoardRangeMin,
        sBoardRangeConfigKey,
        sFirstPanelTagSetKey,
    ]);

    useEffect(() => {
        setBoardList((aPrev) => getNextBoardListWithPersistedBoardInfo(aPrev, newBoardInfo));
    }, [newBoardInfo, setBoardList]);

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

        setBoardList((aPrev) => {
            return getNextBoardListWithSavedPanels(aPrev, sBoardInfo.id, sNextPanels);
        });
    }, [setBoardList]);

    /**
     * Queues a panel state update for debounced persistence.
     * Intent: Delay board-list writes until panel edits settle.
     * @param {{ targetPanelKey: string; timeInfo: TimeRangePair; isRaw: boolean; }} aPayload The panel state payload to persist.
     * @returns {void} Nothing.
     */
    const schedulePersistPanelState = useCallback(
        ({ targetPanelKey, timeInfo, isRaw }: PersistPanelStatePayload) => {
            const sBoardInfo = sLatestBoardInfoRef.current;
            const sPanel = sBoardInfo?.panels.find(
                (aItem) => aItem.meta.index_key === targetPanelKey,
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
            setIsLoadRollupTable(true);

            const [sParsedTables, sRollupTables] = await Promise.all([
                fetchParsedTables(),
                getRollupTableList(),
            ]);

            const sResolvedTables = sParsedTables ?? [];
            const sResolvedRollupTableList = sRollupTables as unknown as string[];

            setLoadedTables(sResolvedTables);
            setLoadedRollupTableList(sResolvedRollupTableList);
            setTables(sResolvedTables);
            setRollupTables(sRollupTables);
            setIsLoadRollupTable(false);
        })();
    }, [setRollupTables, setTables]);

    useEffect(() => {
        let sIsActive = true;

        if (!sTopLevelTimeBoundaryRequest) {
            setTimeBoundaryRanges(null);
            return () => {
                sIsActive = false;
            };
        }

        void (async () => {
            const sTimeRanges = await fetchTopLevelTimeBoundaryRanges(
                sTopLevelTimeBoundaryRequest.tagSet,
                sTopLevelTimeBoundaryRequest.boardTime,
            );

            if (!sIsActive) {
                return;
            }

            setTimeBoundaryRanges((aPrev) =>
                isSameTimeBoundaryRanges(aPrev, sTimeRanges) ? aPrev : sTimeRanges,
            );
        })();

        return () => {
            sIsActive = false;
        };
    }, [sTopLevelTimeBoundaryRequest]);
    /**
     * Reloads the top-level time-range boundaries for the first board panel.
     * Intent: Keep the toolbar refresh action aligned with the current board range.
     * @param {LegacyTimeValue | undefined} aStart The optional start boundary override.
     * @param {LegacyTimeValue | undefined} aEnd The optional end boundary override.
     * @returns {Promise<void>} A promise that resolves after the visible time ranges refresh.
     */
    const refreshTopLevelTimeRange = useCallback(
        async (aStart: LegacyTimeValue | undefined, aEnd: LegacyTimeValue | undefined) => {
            if (!newBoardInfo.panels[0]?.data.tag_set) return;

            const sBoardTime =
                aStart === undefined && aEnd === undefined
                    ? { range: newBoardInfo.range, rangeConfig: newBoardInfo.rangeConfig }
                    : normalizeLegacyTimeRangeBoundary(aStart, aEnd);

            const sTimeRanges = await fetchTopLevelTimeBoundaryRanges(
                newBoardInfo.panels[0].data.tag_set,
                sBoardTime,
            );
            setTimeBoundaryRanges((aPrev) =>
                isSameTimeBoundaryRanges(aPrev, sTimeRanges) ? aPrev : sTimeRanges,
            );
        },
        [newBoardInfo],
    );

    /**
     * Saves the current TagAnalyzer board to its existing file path.
     * Intent: Use the TagAnalyzer serializer instead of the shared raw-tab save flow.
     * @returns {Promise<boolean>} True when the save succeeded.
     */
    const saveCurrentTazBoard = useCallback(async (): Promise<boolean> => {
        const sBoardTab = pInfo as TazBoardTab;

        if (!sBoardTab.path) {
            setIsTazSaveModalOpen(true);
            return false;
        }

        const sSavePayload = createTazSavePayload(sBoardTab);

        try {
            const sResult = await postFileList(
                sSavePayload,
                getExistingSaveDirectoryPath(sBoardTab.path),
                sBoardTab.name,
            );
            if (!didFileSaveSucceed(sResult)) {
                Toast.error('save file fail retry please');
                return false;
            }

            const sSavedBoard = createSavedTazBoardAfterSave(sBoardTab);

            setBoardList((aPrev) =>
                aPrev.map((aBoard) =>
                    aBoard.id === sBoardTab.id
                        ? (sSavedBoard as unknown as GBoardListType)
                        : aBoard,
                ),
            );
            return true;
        } catch {
            Toast.error('save file fail retry please');
            return false;
        }
    }, [pInfo, setBoardList]);

    /**
     * Saves the current TagAnalyzer board to a chosen file path.
     * Intent: Keep Save As on the clean TagAnalyzer payload while staying inside the TagAnalyzer folder.
     * @param {string} aDirectoryPath The selected target directory path.
     * @param {string} aFileName The selected target file name.
     * @returns {Promise<boolean>} True when the save succeeded.
     */
    const saveCurrentTazBoardAs = useCallback(
        async (aDirectoryPath: string, aFileName: string): Promise<boolean> => {
            const sBoardTab = pInfo as TazBoardTab;
            const sSavePayload = createTazSavePayload(sBoardTab);

            try {
                const sResult = await postFileList(
                    sSavePayload,
                    aDirectoryPath,
                    aFileName,
                );
                if (!didFileSaveSucceed(sResult)) {
                    Toast.error('save file fail retry please');
                    return false;
                }

                const sSavedBoard = createSavedTazBoardAfterSaveAs({
                    board: sBoardTab,
                    fileName: aFileName,
                    filePath: aDirectoryPath,
                });

                setBoardList((aPrev) =>
                    aPrev.map((aBoard) =>
                        aBoard.id === sBoardTab.id
                            ? (sSavedBoard as unknown as GBoardListType)
                            : aBoard,
                    ),
                );

                const sUpdatedTreeResult = await TreeFetchDrilling(
                    sFileTree,
                    `${aDirectoryPath}${aFileName}`,
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
        [pInfo, sFileTree, setBoardList, setGlobalFileTree],
    );

    useEffect(() => {
        if (!sIsActiveTab) {
            return undefined;
        }

        /**
         * Intercepts the save shortcut for TagAnalyzer tabs.
         * Intent: Prevent the shared raw-tab save handler from running for `.taz` tabs.
         * @param {KeyboardEvent} aEvent The keydown event.
         * @returns {void} Nothing.
         */
        const handleDocumentSaveShortcut = function handleDocumentSaveShortcut(
            aEvent: KeyboardEvent,
        ) {
            const sIsSaveShortcut =
                (aEvent.ctrlKey || aEvent.metaKey) &&
                aEvent.key.toLowerCase() === 's';

            if (!sIsSaveShortcut) {
                return;
            }

            aEvent.preventDefault();
            aEvent.stopPropagation();
            aEvent.stopImmediatePropagation();
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
                refreshTopLevelTimeRange,
                () => void saveCurrentTazBoard(),
                () => setIsTazSaveModalOpen(true),
                setIsOverlapModalOpen,
            ),
        [
            refreshTopLevelTimeRange,
            saveCurrentTazBoard,
            setIsOverlapModalOpen,
            setRefreshCount,
            setIsTazSaveModalOpen,
            setTimeRangeModal,
        ],
    );
    const sPanelBoardState: BoardPanelState = useMemo(
        () => ({
            refreshCount: sRefreshCount,
            overlapPanels: sOverlapPanels,
            timeBoundaryRanges: sTimeBoundaryRanges,
            globalTimeRange: sGlobalDataAndNavigatorTime,
        }),
        [sGlobalDataAndNavigatorTime, sOverlapPanels, sRefreshCount, sTimeBoundaryRanges],
    );

    const sPanelBoardActions: BoardPanelActions = useMemo(
        () =>
            buildPanelBoardActions(
                setOverlapPanels,
                setBoardList,
                newBoardInfo,
                schedulePersistPanelState,
                setGlobalDataAndNavigatorTime,
                setEditingPanel,
            ),
        [
            newBoardInfo,
            schedulePersistPanelState,
            setBoardList,
            setEditingPanel,
            setGlobalDataAndNavigatorTime,
            setOverlapPanels,
        ],
    );
    const appendNewPanelToBoard = useCallback(
        (aPanel: PersistedPanelInfoV200) => {
            setBoardList((aPrev) =>
                aPrev.map((aBoard) =>
                    aBoard.id === newBoardInfo.id
                        ? { ...aBoard, panels: aBoard.panels.concat(aPanel) }
                        : aBoard,
                ),
            );
        },
        [newBoardInfo.id, setBoardList],
    );

    return (
        !sIsLoadRollupTable && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {sEditingPanel && sEditingPanelEditorConfig ? (
                    <PanelEditor
                        pInitialEditorConfig={sEditingPanelEditorConfig}
                        pOnSavePanel={sPanelBoardActions.onSavePanel}
                        pPanelInfo={sEditingPanel.pPanelInfo}
                        pNavigatorRange={sEditingPanel.pNavigatorRange}
                        pRollupTableList={sRollupTableList}
                        pSetEditPanel={() => setEditingPanel(undefined)}
                        pSetSaveEditedInfo={sEditingPanel.pSetSaveEditedInfo}
                        pTables={sTables}
                    />
                ) : (
                    <>
                        <Page pRef={undefined} style={undefined} className={undefined}>
                            <TagAnalyzerBoardToolbar
                                pRange={newBoardInfo.range}
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
                                        pTables={sTables}
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
                            <TimeRangeModal
                                pUseRecoil={true}
                                pType={'tag'}
                                pSetTimeRangeModal={setTimeRangeModal}
                                pShowRefresh={false}
                                pSaveCallback={refreshTopLevelTimeRange}
                                pStartTime={undefined}
                                pEndTime={undefined}
                                pRefresh={undefined}
                                pSetTime={undefined}
                            />
                        )}
                        <TazSaveModal
                            isOpen={sIsTazSaveModalOpen}
                            initialDirectoryPath={newBoardInfo.path}
                            initialFileName={newBoardInfo.name}
                            onClose={() => setIsTazSaveModalOpen(false)}
                            onSave={saveCurrentTazBoardAs}
                        />
                    </>
                )}
            </div>
        )
    );
};
export default TagAnalyzer;

/**
 * Converts one saved board directory into the existing-file path format used by the file API.
 * Intent: Keep the local TagAnalyzer save request aligned with the shared save behavior for already-saved files.
 * @param {string} aDirectoryPath The saved board directory path.
 * @returns {string} The normalized existing-file save directory path.
 */
function getExistingSaveDirectoryPath(aDirectoryPath: string): string {
    return aDirectoryPath.replace('/', '');
}

/**
 * Checks whether one file-save response reports success.
 * Intent: Keep the local TagAnalyzer save flow explicit about the repository response shape.
 * @param {unknown} aResponse The file-save response.
 * @returns {boolean} True when the backend confirmed the save.
 */
function didFileSaveSucceed(aResponse: unknown): boolean {
    if (!aResponse || typeof aResponse !== 'object') {
        return false;
    }

    const sResponse = aResponse as {
        success?: boolean;
        data?: {
            success?: boolean;
        };
    };

    return sResponse.success === true || sResponse.data?.success === true;
}

/**
 * Builds the toolbar action handlers for the TagAnalyzer workspace.
 * Intent: Keep toolbar wiring centralized so the component tree stays easy to follow.
 * @param {Dispatch<SetStateAction<boolean>>} setTimeRangeModal The setter for the time-range modal.
 * @param {Dispatch<SetStateAction<number>>} setRefreshCount The setter for the refresh counter.
 * @param {(aStart: LegacyTimeValue | undefined, aEnd: LegacyTimeValue | undefined) => Promise<void>} refreshTopLevelTimeRange The callback that reloads the top-level time range.
 * @param {() => void} aOnSave The save handler for the current board.
 * @param {() => void} aOnOpenSaveModal The handler that opens the TagAnalyzer-local save-as dialog.
 * @param {Dispatch<SetStateAction<boolean>>} setIsOverlapModalOpen The setter for the overlap modal.
 * @returns {BoardToolbarActions} The toolbar action bundle used by TagAnalyzerBoardToolbar.
 */
function buildToolbarActionHandlers(
    setTimeRangeModal: Dispatch<SetStateAction<boolean>>,
    setRefreshCount: Dispatch<SetStateAction<number>>,
    refreshTopLevelTimeRange: (
        aStart: LegacyTimeValue | undefined,
        aEnd: LegacyTimeValue | undefined,
    ) => Promise<void>,
    aOnSave: () => void,
    aOnOpenSaveModal: () => void,
    setIsOverlapModalOpen: Dispatch<SetStateAction<boolean>>,
): BoardToolbarActions {
    return {
        onOpenTimeRangeModal: () => setTimeRangeModal(true),
        onRefreshData: () => setRefreshCount((aPrev) => aPrev + 1),
        onRefreshTime: () => refreshTopLevelTimeRange(undefined, undefined),
        onSave: aOnSave,
        onOpenSaveModal: aOnOpenSaveModal,
        onOpenOverlapModal: () => setIsOverlapModalOpen(true),
    };
}

/**
 * Builds the board-level action handlers for TagAnalyzer panels.
 * Intent: Keep panel mutation wiring in one place so board events stay predictable.
 * @param {Dispatch<SetStateAction<OverlapPanelInfo[]>>} setOverlapPanels The setter for overlap selection state.
 * @param {SetterOrUpdater<GBoardListType[]>} setBoardList The setter for the global board list.
 * @param {BoardInfo} sBoardInfo The current normalized board info.
 * @param {BoardPanelActions['onPersistPanelState']} onPersistPanelState The persisted panel-state handler to reuse.
 * @param {SetterOrUpdater<GBoardListType[]>} setBoardList The setter for the global board list.
 * @param {Dispatch<SetStateAction<GlobalTimeRangeState | undefined>>} setGlobalDataAndNavigatorTime The setter for the global time range state.
 * @param {Dispatch<SetStateAction<EditRequest | undefined>>} setEditingPanel The setter for the active panel editor request.
 * @returns {BoardPanelActions} The board action bundle consumed by TagAnalyzerBoard.
 */
function buildPanelBoardActions(
    setOverlapPanels: Dispatch<SetStateAction<OverlapPanelInfo[]>>,
    setBoardList: SetterOrUpdater<GBoardListType[]>,
    sBoardInfo: BoardInfo,
    onPersistPanelState: BoardPanelActions['onPersistPanelState'],
    setGlobalDataAndNavigatorTime: Dispatch<SetStateAction<GlobalTimeRangeState | undefined>>,
    setEditingPanel: Dispatch<SetStateAction<EditRequest | undefined>>,
): BoardPanelActions {
    return {
        onOverlapSelectionChange: (aPayload) =>
            setOverlapPanels((aPrev) => getNextOverlapPanels(aPrev, aPayload)),
        onDeletePanel: ({ panelKey }) =>
            setBoardList((aPrev) => getNextBoardListWithoutPanel(aPrev, sBoardInfo.id, panelKey)),
        onPersistPanelState,
        onSavePanel: (aPanelInfo) =>
            setBoardList((aPrev) =>
                getNextBoardListWithSavedPanel(
                    aPrev,
                    sBoardInfo.id,
                    aPanelInfo.meta.index_key,
                    aPanelInfo,
                ),
            ),
        onSetGlobalTimeRange: ({ dataTime, navigatorTime, interval }) =>
            setGlobalDataAndNavigatorTime({
                data: dataTime,
                navigator: navigatorTime,
                interval,
            }),
        onOpenEditRequest: setEditingPanel,
    };
}
