import { getRollupTableList } from '@/api/repository/machiot';
import { gBoardList, GBoardListType, gRollupTableList, gTables } from '@/recoil/recoil';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import { SetterOrUpdater, useSetRecoilState } from 'recoil';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import TagAnalyzerBoardToolbar, { type BoardToolbarActions } from './TagAnalyzerBoardToolbar';
import TimeRangeModal from '../modal/TimeRangeModal';
import OverlapModal from './modal/OverlapModal';
import PanelEditor from './editor/PanelEditor';
import CreateChartModal from './modal/CreateChartModal';
import { PlusCircle } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import type {
    BoardInfo,
    BoardPanelActions,
    BoardPanelState,
    BoardSourceInfo,
    EditRequest,
} from './TagAnalyzerTypes';
import { resolveTagAnalyzerTimeBoundaryRanges } from './boundary/getBgnEndTimeRange';
import { getNextOverlapPanels } from './TagAnalyzerOverlapUtils';
import type {
    GlobalTimeRangeState,
    OverlapPanelInfo,
    PanelInfo,
    TimeRangePair,
    ValueRangePair,
} from './common/modelTypes';
import { fetchTopLevelTimeBoundaryRanges, fetchParsedTables } from './utils/TagAnalyzerFetchUtils';
import {
    normalizeBoardInfo,
} from './common/TagAnalyzerPanelInfoConversion';
import {
    normalizeLegacyTimeRangeBoundary,
} from './utils/legacy/LegacyUtils';
import type { LegacyTimeValue } from './utils/legacy/LegacyTypes';
import {
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './utils/TagAnalyzerSaveUtils';
import { isSameTimeRange } from './utils/TagAnalyzerDateUtils';

type PersistedPanelStateUpdate = {
    timeInfo: TimeRangePair;
    raw: boolean;
};

type PendingPanelStateUpdates = Record<string, PersistedPanelStateUpdate>;

const PANEL_STATE_PERSIST_DEBOUNCE_MS = 150;

/**
 * Returns the next panel list with one panel's saved time-range pair applied.
 * @param aPanels The current normalized board panels.
 * @param aTargetPanel The panel key to update.
 * @param aTimeInfo The latest saved time-range pair.
 * @param aRaw Whether the panel is currently in raw mode.
 * @returns The next normalized panel list.
 */
function hasPersistedTimeRangeChanged(
    aPanel: PanelInfo,
    aTimeInfo: TimeRangePair,
    aRaw: boolean,
): boolean {
    const sCurrentTimeKeeper = aPanel.time.time_keeper;

    return (
        aPanel.data.raw_keeper !== aRaw ||
        !sCurrentTimeKeeper?.panelRange ||
        !sCurrentTimeKeeper?.navigatorRange ||
        !isSameTimeRange(sCurrentTimeKeeper.panelRange, aTimeInfo.panelRange) ||
        !isSameTimeRange(sCurrentTimeKeeper.navigatorRange, aTimeInfo.navigatorRange)
    );
}

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
                sPendingUpdate.raw,
            )
        ) {
            return aPanel;
        }

        sHasChanges = true;
        return {
            ...aPanel,
            time: {
                ...aPanel.time,
                time_keeper: {
                    ...sPendingUpdate.timeInfo,
                },
            },
            data: {
                ...aPanel.data,
                raw_keeper: sPendingUpdate.raw,
            },
        };
    });

    return sHasChanges ? sNextPanels : aPanels;
}

/**
 * Renders the TagAnalyzer workspace using a focused controller boundary for top-level orchestration.
 * @param props The board source info and save-modal handlers for the current workspace.
 * @returns The TagAnalyzer workspace view once the controller finishes bootstrapping.
 */
const TagAnalyzer = ({
    pInfo,
    pHandleSaveModalOpen,
    pSetIsSaveModal,
}: {
    pInfo: BoardSourceInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
    pSetIsOpenModal?: Dispatch<SetStateAction<boolean>>;
}) => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setBoardList = useSetRecoilState(gBoardList);

    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState(false);
    const [sIsDisplayOverlapModal, setIsOverlapModalOpen] = useState(false);
    const [sOverlapPanels, setOverlapPanels] = useState<OverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sTimeBoundaryRanges, setTimeBoundaryRanges] = useState<ValueRangePair | undefined>(
        undefined,
    );
    const [sEditingPanel, setEditingPanel] = useState<EditRequest | undefined>(undefined);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<GlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const sLatestBoardInfoRef = useRef<BoardInfo | undefined>(undefined);
    const sPersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const sPendingPanelStateUpdatesRef = useRef<PendingPanelStateUpdates>({});

    const newBoardInfo: BoardInfo = useMemo(
        () => normalizeBoardInfo(pInfo),
        [pInfo],
    );
    sLatestBoardInfoRef.current = newBoardInfo;
    const sBoardRangeMin = newBoardInfo.range.min;
    const sBoardRangeMax = newBoardInfo.range.max;
    const sBoardRangeStart = newBoardInfo.rangeConfig.start;
    const sBoardRangeEnd = newBoardInfo.rangeConfig.end;

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

    const schedulePersistPanelState = useCallback(
        (aTargetPanel: string, aTimeInfo: TimeRangePair, aRaw: boolean) => {
            const sBoardInfo = sLatestBoardInfoRef.current;
            const sPanel = sBoardInfo?.panels.find((aItem) => aItem.meta.index_key === aTargetPanel);

            if (sPanel && !hasPersistedTimeRangeChanged(sPanel, aTimeInfo, aRaw)) {
                return;
            }

            sPendingPanelStateUpdatesRef.current = {
                ...sPendingPanelStateUpdatesRef.current,
                [aTargetPanel]: {
                    timeInfo: aTimeInfo,
                    raw: aRaw,
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

            if (sParsedTables) setTables(sParsedTables);
            setRollupTables(sRollupTables);
            setIsLoadRollupTable(false);
        })();
    }, [setRollupTables, setTables]);

    useEffect(() => {
        const sFirstPanel = newBoardInfo.panels[0];
        if (!sFirstPanel) {
            setTimeBoundaryRanges(undefined);
            return;
        }

        if (sFirstPanel.data.tag_set) {
            const sBoardRange = {
                min: sBoardRangeMin,
                max: sBoardRangeMax,
            };
            const sBoardRangeConfig = {
                start: sBoardRangeStart,
                end: sBoardRangeEnd,
            };
            void (async () => {
                const sTimeRanges = await fetchTopLevelTimeBoundaryRanges(
                    sFirstPanel.data.tag_set,
                    sBoardRange,
                    sBoardRangeConfig,
                );
                setTimeBoundaryRanges(sTimeRanges);
            })();
            return;
        }
        setTimeBoundaryRanges(undefined);
    }, [
        newBoardInfo.panels,
        sBoardRangeEnd,
        sBoardRangeMax,
        sBoardRangeMin,
        sBoardRangeStart,
    ]);
    const refreshTopLevelTimeRange = useCallback(
        async (aStart: LegacyTimeValue | undefined, aEnd: LegacyTimeValue | undefined) => {
            if (!newBoardInfo.panels[0]?.data.tag_set) return;

            const sBoardTime =
                aStart === undefined && aEnd === undefined
                    ? { range: newBoardInfo.range, rangeConfig: newBoardInfo.rangeConfig }
                    : normalizeLegacyTimeRangeBoundary(aStart, aEnd);

            const sTimeRanges = await fetchTopLevelTimeBoundaryRanges(
                newBoardInfo.panels[0].data.tag_set,
                sBoardTime.range,
                sBoardTime.rangeConfig,
            );
            setTimeBoundaryRanges(sTimeRanges);
        },
        [newBoardInfo],
    );

    const boardToolbarActions: BoardToolbarActions = useMemo(
        () =>
            buildToolbarActionHandlers(
                setTimeRangeModal,
                setRefreshCount,
                refreshTopLevelTimeRange,
                pHandleSaveModalOpen,
                pSetIsSaveModal,
                setIsOverlapModalOpen,
            ),
        [
            pHandleSaveModalOpen,
            pSetIsSaveModal,
            refreshTopLevelTimeRange,
            setIsOverlapModalOpen,
            setRefreshCount,
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

    return (
        !sIsLoadRollupTable && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {sEditingPanel ? (
                    <PanelEditor
                        pPanelInfo={sEditingPanel.pPanelInfo}
                        pNavigatorRange={sEditingPanel.pNavigatorRange}
                        pSetEditPanel={() => setEditingPanel(undefined)}
                        pSetSaveEditedInfo={sEditingPanel.pSetSaveEditedInfo}
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
                                    pPanelBoardState={sPanelBoardState}
                                    pPanelBoardActions={sPanelBoardActions}
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
                                    />
                                </Page.ContentBlock>
                            </Page.Body>
                        </Page>
                        {sIsDisplayOverlapModal && (
                            <OverlapModal
                                pPanelsInfo={sOverlapPanels}
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
                    </>
                )}
            </div>
        )
    );
};
export default TagAnalyzer;

function buildToolbarActionHandlers(
    setTimeRangeModal: Dispatch<SetStateAction<boolean>>,
    setRefreshCount: Dispatch<SetStateAction<number>>,
    refreshTopLevelTimeRange: (
        aStart: LegacyTimeValue | undefined,
        aEnd: LegacyTimeValue | undefined,
    ) => Promise<void>,
    pHandleSaveModalOpen: () => void,
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>,
    setIsOverlapModalOpen: Dispatch<SetStateAction<boolean>>,
): BoardToolbarActions {
    return {
        onOpenTimeRangeModal: () => setTimeRangeModal(true),
        onRefreshData: () => setRefreshCount((aPrev) => aPrev + 1),
        onRefreshTime: () => refreshTopLevelTimeRange(undefined, undefined),
        onSave: pHandleSaveModalOpen,
        onOpenSaveModal: () => pSetIsSaveModal(true),
        onOpenOverlapModal: () => setIsOverlapModalOpen(true),
    };
}

function buildPanelBoardActions(
    setOverlapPanels: Dispatch<SetStateAction<OverlapPanelInfo[]>>,
    setBoardList: SetterOrUpdater<GBoardListType[]>,
    sBoardInfo: BoardInfo,
    onPersistPanelState: (
        aTargetPanel: string,
        aTimeInfo: TimeRangePair,
        aRaw: boolean,
    ) => void,
    setGlobalDataAndNavigatorTime: Dispatch<SetStateAction<GlobalTimeRangeState | undefined>>,
    setEditingPanel: Dispatch<SetStateAction<EditRequest | undefined>>,
): BoardPanelActions {
    return {
        onOverlapSelectionChange: (aStart, aEnd, aBoard, aIsRaw, aIsChanged) =>
            setOverlapPanels((aPrev) =>
                getNextOverlapPanels(aPrev, aStart, aEnd, aBoard, aIsRaw, aIsChanged),
            ),
        onDeletePanel: (aPanelKey) =>
            setBoardList((aPrev) => getNextBoardListWithoutPanel(aPrev, sBoardInfo.id, aPanelKey)),
        onPersistPanelState,
        onSetGlobalTimeRange: (aDataTime, aNavigatorTime, aInterval) =>
            setGlobalDataAndNavigatorTime({
                data: aDataTime,
                navigator: aNavigatorTime,
                interval: aInterval,
            }),
        onOpenEditRequest: setEditingPanel,
    };
}
