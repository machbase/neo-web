import { getRollupTableList } from '@/api/repository/machiot';
import { gBoardList, GBoardListType, gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
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
} from './utils/legacy/LegacyTimeRangeConversion';
import type {
    LegacyTimeValue,
    LegacyTimeRange,
} from './utils/legacy/LegacyTimeRangeTypes';
import {
    getNextBoardListWithSavedPanels,
    getNextBoardListWithoutPanel,
} from './utils/TagAnalyzerSaveUtils';

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
): TagAnalyzerPanelInfo[] => {
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

    const newBoardInfo: TagAnalyzerBoardInfo = normalizeTagAnalyzerBoardInfo(pInfo);

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
                    newBoardInfo.legacyRange,
                );
                setBgnEndTimeRange(sTimeRange);
            })();
            return;
        }
        setBgnEndTimeRange(undefined);
    }, [
        newBoardInfo.legacyRange?.range_bgn,
        newBoardInfo.legacyRange?.range_end,
        newBoardInfo.panels,
        newBoardInfo.range.max,
        newBoardInfo.range.min,
    ]);
    const refreshTopLevelTimeRange = buildRefreshTopLevelTimeRange(
        newBoardInfo,
        setBgnEndTimeRange,
    );

    const boardToolbarActions: BoardToolbarActions = buildToolbarActionHandlers(
        setTimeRangeModal,
        setRefreshCount,
        refreshTopLevelTimeRange,
        pHandleSaveModalOpen,
        pSetIsSaveModal,
        setIsOverlapModalOpen,
    );
    const sPanelBoardState: TagAnalyzerBoardPanelState = {
        refreshCount: sRefreshCount,
        overlapPanels: sOverlapPanels,
        bgnEndTimeRange: sBgnEndTimeRange,
        globalTimeRange: sGlobalDataAndNavigatorTime,
    };

    const sPanelBoardActions: BoardPanelActions = buildPanelBoardActions(
        setOverlapPanels,
        setBoardList,
        newBoardInfo,
        setGlobalDataAndNavigatorTime,
        setEditingPanel,
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
                                    newBoardInfo.legacyRange,
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

function buildRefreshTopLevelTimeRange(
    sBoardInfo: TagAnalyzerBoardInfo,
    setBgnEndTimeRange: Dispatch<SetStateAction<TagAnalyzerBgnEndTimeRange | undefined>>,
): (
    aStart: LegacyTimeValue | undefined,
    aEnd: LegacyTimeValue | undefined,
) => Promise<void> {
    return async (
        aStart: LegacyTimeValue | undefined,
        aEnd: LegacyTimeValue | undefined,
    ): Promise<void> => {
        if (!sBoardInfo.panels[0]?.data.tag_set) return;

        const sBoardTime =
            aStart === undefined && aEnd === undefined
                ? { range: sBoardInfo.range, legacyRange: sBoardInfo.legacyRange }
                : normalizeLegacyTimeRangeBoundary(aStart, aEnd);

        const sTimeRange = await fetchNormalizedTopLevelTimeRange(
            sBoardInfo.panels[0].data.tag_set,
            sBoardTime.range,
            sBoardTime.legacyRange,
        );
        setBgnEndTimeRange(sTimeRange);
    };
}

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
    aRange: { min: number; max: number },
    aLegacyRange: LegacyTimeRange | undefined,
): string {
    const sStart = aLegacyRange?.range_bgn ?? aRange.min;
    const sEnd = aLegacyRange?.range_end ?? aRange.max;

    if (sStart === '' || sEnd === '') {
        return '';
    }

    return `${formatTimeValue(sStart, undefined)}~${formatTimeValue(sEnd, undefined)}`;
}

function buildPanelBoardActions(
    setOverlapPanels: Dispatch<SetStateAction<TagAnalyzerOverlapPanelInfo[]>>,
    setBoardList: SetterOrUpdater<GBoardListType[]>,
    sBoardInfo: TagAnalyzerBoardInfo,
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
        onPersistPanelState: (aTargetPanel, aTimeInfo, aRaw) => {
            const sUpdatedPanels = getNextPanelsWithPersistedTimeKeeperState(
                sBoardInfo.panels,
                aTargetPanel,
                aTimeInfo,
                aRaw,
            );
            setBoardList((aPrev) =>
                getNextBoardListWithSavedPanels(aPrev, sBoardInfo.id, sUpdatedPanels),
            );
        },
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
function getNextOverlapPanels(
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
}
