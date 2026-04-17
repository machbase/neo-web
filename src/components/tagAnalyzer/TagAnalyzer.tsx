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
import { formatTimeValue } from '@/utils/dashboardUtil';
import type {
    TagAnalyzerBoardInfo,
    BoardPanelActions,
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
} from './panel/PanelModel';
import { fetchNormalizedTopLevelTimeRange, fetchParsedTables } from './utils/TagAnalyzerFetchUtils';
import {
    normalizeTagAnalyzerBoardInfo,
} from './utils/TagAnalyzerPanelInfoConversion';
import {
    normalizeLegacyTimeRangeBoundary,
} from './utils/legacy/LegacyUtils';
import { toLegacyTimeValue } from './utils/TagAnalyzerTimeRangeConfig';
import type { LegacyTimeValue } from './utils/legacy/LegacyTypes';
import type { TagAnalyzerTimeRangeConfig } from './common/CommonTypes';
import {
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './utils/TagAnalyzerSaveUtils';
import { isSameTimeRange } from './utils/TagAnalyzerDateUtils';

type PersistedPanelStateUpdate = {
    timeInfo: TagAnalyzerPanelTimeKeeper;
    raw: boolean;
};

type PendingPanelStateUpdates = Record<string, PersistedPanelStateUpdate>;

const PANEL_STATE_PERSIST_DEBOUNCE_MS = 150;

/**
 * Returns the next panel list with one panel's persisted time-keeper state applied.
 * @param aPanels The current normalized board panels.
 * @param aTargetPanel The panel key to update.
 * @param aTimeInfo The latest persisted time-keeper payload.
 * @param aRaw Whether the panel is currently in raw mode.
 * @returns The next normalized panel list.
 */
function hasPersistedTimeKeeperStateChanged(
    aPanel: TagAnalyzerPanelInfo,
    aTimeInfo: TagAnalyzerPanelTimeKeeper,
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

function applyPendingPersistedTimeKeeperStateUpdates(
    aPanels: TagAnalyzerPanelInfo[],
    aPendingUpdates: PendingPanelStateUpdates,
): TagAnalyzerPanelInfo[] {
    let sHasChanges = false;

    const sNextPanels = aPanels.map((aPanel) => {
        const sPendingUpdate = aPendingUpdates[aPanel.meta.index_key];
        if (!sPendingUpdate) {
            return aPanel;
        }

        if (
            !hasPersistedTimeKeeperStateChanged(
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
    pInfo: TagAnalyzerBoardSourceInfo;
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
    const [sOverlapPanels, setOverlapPanels] = useState<TagAnalyzerOverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<TagAnalyzerBgnEndTimeRange | undefined>(
        undefined,
    );
    const [sEditingPanel, setEditingPanel] = useState<TagAnalyzerEditRequest | undefined>(undefined);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] =
        useState<TagAnalyzerGlobalTimeRangeState | undefined>(undefined);
    const [sIsNewPanelModal, setIsNewPanelModal] = useState(false);
    const sLatestBoardInfoRef = useRef<TagAnalyzerBoardInfo | undefined>(undefined);
    const sPersistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const sPendingPanelStateUpdatesRef = useRef<PendingPanelStateUpdates>({});

    const newBoardInfo: TagAnalyzerBoardInfo = useMemo(
        () => normalizeTagAnalyzerBoardInfo(pInfo),
        [pInfo],
    );
    sLatestBoardInfoRef.current = newBoardInfo;

    const flushPendingPanelStatePersistence = useCallback(() => {
        const sPendingUpdates = sPendingPanelStateUpdatesRef.current;
        const sPendingKeys = Object.keys(sPendingUpdates);
        const sBoardInfo = sLatestBoardInfoRef.current;

        if (!sBoardInfo || sPendingKeys.length === 0) {
            return;
        }

        sPendingPanelStateUpdatesRef.current = {};
        const sNextPanels = applyPendingPersistedTimeKeeperStateUpdates(
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
        (aTargetPanel: string, aTimeInfo: TagAnalyzerPanelTimeKeeper, aRaw: boolean) => {
            const sBoardInfo = sLatestBoardInfoRef.current;
            const sPanel = sBoardInfo?.panels.find((aItem) => aItem.meta.index_key === aTargetPanel);

            if (sPanel && !hasPersistedTimeKeeperStateChanged(sPanel, aTimeInfo, aRaw)) {
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
            setBgnEndTimeRange(undefined);
            return;
        }

        if (sFirstPanel.data.tag_set) {
            void (async () => {
                const sTimeRange = await fetchNormalizedTopLevelTimeRange(
                    sFirstPanel.data.tag_set,
                    newBoardInfo.range,
                    newBoardInfo.rangeConfig,
                );
                setBgnEndTimeRange(sTimeRange);
            })();
            return;
        }
        setBgnEndTimeRange(undefined);
    }, [
        newBoardInfo.rangeConfig.end,
        newBoardInfo.rangeConfig.start,
        newBoardInfo.panels,
        newBoardInfo.range.max,
        newBoardInfo.range.min,
    ]);
    const refreshTopLevelTimeRange = useCallback(
        async (aStart: LegacyTimeValue | undefined, aEnd: LegacyTimeValue | undefined) => {
            if (!newBoardInfo.panels[0]?.data.tag_set) return;

            const sBoardTime =
                aStart === undefined && aEnd === undefined
                    ? { range: newBoardInfo.range, rangeConfig: newBoardInfo.rangeConfig }
                    : normalizeLegacyTimeRangeBoundary(aStart, aEnd);

            const sTimeRange = await fetchNormalizedTopLevelTimeRange(
                newBoardInfo.panels[0].data.tag_set,
                sBoardTime.range,
                sBoardTime.rangeConfig,
            );
            setBgnEndTimeRange(sTimeRange);
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
    const sPanelBoardState: TagAnalyzerBoardPanelState = useMemo(
        () => ({
            refreshCount: sRefreshCount,
            overlapPanels: sOverlapPanels,
            bgnEndTimeRange: sBgnEndTimeRange,
            globalTimeRange: sGlobalDataAndNavigatorTime,
        }),
        [sBgnEndTimeRange, sGlobalDataAndNavigatorTime, sOverlapPanels, sRefreshCount],
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
                                pRangeText={buildBoardRangeText(
                                    newBoardInfo.range,
                                    newBoardInfo.rangeConfig,
                                )}
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

function buildBoardRangeText(
    _aRange: { min: number; max: number },
    aRangeConfig: TagAnalyzerTimeRangeConfig,
): string {
    const sStart = toLegacyTimeValue(aRangeConfig.start);
    const sEnd = toLegacyTimeValue(aRangeConfig.end);

    if (sStart === '' || sEnd === '') {
        return '';
    }

    return `${formatTimeValue(sStart, undefined)}~${formatTimeValue(sEnd, undefined)}`;
}

function buildPanelBoardActions(
    setOverlapPanels: Dispatch<SetStateAction<TagAnalyzerOverlapPanelInfo[]>>,
    setBoardList: SetterOrUpdater<GBoardListType[]>,
    sBoardInfo: TagAnalyzerBoardInfo,
    onPersistPanelState: (
        aTargetPanel: string,
        aTimeInfo: TagAnalyzerPanelTimeKeeper,
        aRaw: boolean,
    ) => void,
    setGlobalDataAndNavigatorTime: Dispatch<SetStateAction<TagAnalyzerGlobalTimeRangeState | undefined>>,
    setEditingPanel: Dispatch<SetStateAction<TagAnalyzerEditRequest | undefined>>,
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
export function getNextOverlapPanels(
    aPanels: TagAnalyzerOverlapPanelInfo[],
    aStart: number,
    aEnd: number,
    aBoard: TagAnalyzerPanelInfo,
    aIsRaw: boolean,
    aChangeType: ('delete' | 'changed') | undefined,
): TagAnalyzerOverlapPanelInfo[] {
    const sPanelKey = aBoard.meta.index_key;
    const sDuration = aEnd - aStart;

    if (aChangeType === 'delete') {
        const sNextPanels = aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
        return sNextPanels.length === aPanels.length ? aPanels : sNextPanels;
    }

    if (aChangeType === 'changed') {
        const sExistingPanel = aPanels.find((aItem) => aItem.board.meta.index_key === sPanelKey);
        if (!sExistingPanel) {
            return aPanels;
        }

        if (
            sExistingPanel.isRaw === aIsRaw &&
            sExistingPanel.start === aStart &&
            sExistingPanel.duration === sDuration
        ) {
            return aPanels;
        }

        return aPanels.map((aItem) =>
            aItem.board.meta.index_key === sPanelKey
                ? { ...aItem, isRaw: aIsRaw, start: aStart, duration: sDuration }
                : aItem,
        );
    }

    if (aPanels.some((aItem) => aItem.board.meta.index_key === sPanelKey)) {
        return aPanels.filter((aItem) => aItem.board.meta.index_key !== sPanelKey);
    }

    return [...aPanels, { start: aStart, duration: sDuration, isRaw: aIsRaw, board: aBoard }];
}
