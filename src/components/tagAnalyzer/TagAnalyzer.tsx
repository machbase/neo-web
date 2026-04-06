import { fetchTablesData, getRollupTableList } from '@/api/repository/machiot';
import { gBoardList, gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSetRecoilState } from 'recoil';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import { parseTables } from '@/utils';
import TagAnalyzerBoardToolbar from './TagAnalyzerBoardToolbar';
import TagAnalyzerNewPanelButton from './TagAnalyzerNewPanelButton';
import TimeRangeModal from '../modal/TimeRangeModal';
import OverlapModal from './modal/OverlapModal';
import PanelEditor from './editor/PanelEditor';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import { Page } from '@/design-system/components';
import {
    flattenTagAnalyzerPanelInfo,
    normalizeTagAnalyzerPanelInfo,
} from './panel/PanelModelUtil';
import type {
    TagAnalyzerBoardPanelActions,
    TagAnalyzerBoardPanelState,
    TagAnalyzerBoardInfo,
    TagAnalyzerBoardSourceInfo,
    TagAnalyzerEditRequest,
} from './TagAnalyzerType';
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

const normalizeBgnEndTimeRange = (aTimeRange: TagAnalyzerLooseBgnEndTimeRange): Partial<TagAnalyzerBgnEndTimeRange> => {
    return {
        ...(typeof aTimeRange.bgn_min === 'number' ? { bgn_min: aTimeRange.bgn_min } : {}),
        ...(typeof aTimeRange.bgn_max === 'number' ? { bgn_max: aTimeRange.bgn_max } : {}),
        ...(typeof aTimeRange.end_min === 'number' ? { end_min: aTimeRange.end_min } : {}),
        ...(typeof aTimeRange.end_max === 'number' ? { end_max: aTimeRange.end_max } : {}),
    };
};

const fetchParsedTables = async () => {
    const sResult: any = await fetchTablesData();
    if (!sResult.success) return undefined;
    return parseTables(sResult.data);
};

const fetchNormalizedTopLevelTimeRange = async (
    aTagSet: TagAnalyzerPanelInfo['data']['tag_set'],
    aStart: TagAnalyzerRangeValue,
    aEnd: TagAnalyzerRangeValue,
) => {
    const sTimeRange = await getBgnEndTimeRange(aTagSet, { bgn: aStart, end: aEnd }, { bgn: '', end: '' });
    return normalizeBgnEndTimeRange(sTimeRange);
};

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

// Loads the table metadata needed by TagAnalyzer and then hands the selected board
// to the main chart workspace once the required rollup data is ready.
const TagAnalyzer = ({
    pInfo,
    pHandleSaveModalOpen: pOnSave,
    pSetIsSaveModal
}: {
    pInfo: TagAnalyzerBoardSourceInfo;
    pHandleSaveModalOpen: () => void;
    pSetIsSaveModal: Dispatch<SetStateAction<boolean>>;
}) => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTables = useSetRecoilState(gRollupTableList);
    const setBoardList = useSetRecoilState(gBoardList);
    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState<boolean>(true);
    const [sIsDisplayTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sIsDisplayOverlapModal, setIsModal] = useState<boolean>(false);
    const [sPanelsInfo, setPanelsInfo] = useState<TagAnalyzerOverlapPanelInfo[]>([]);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<Partial<TagAnalyzerBgnEndTimeRange> | undefined>(undefined);
    const [sEditingPanel, setEditingPanel] = useState<TagAnalyzerEditRequest | null>(null);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] = useState<TagAnalyzerGlobalTimeRangeState | null>(null);
    const sBoardInfo: TagAnalyzerBoardInfo = {
        ...pInfo,
        panels: pInfo.panels.map((aPanel) => normalizeTagAnalyzerPanelInfo(aPanel)),
    };

    const loadTables = async () => {
        const sParsedTables = await fetchParsedTables();
        if (sParsedTables) setTables(sParsedTables);
    };

    const loadRollupTables = async () => {
        const sRollupTables: any = await getRollupTableList();
        setRollupTables(sRollupTables);
        setIsLoadRollupTable(false);
    };

    const handleOverlapSelection = (aStart: number, aEnd: number, aBoard: TagAnalyzerPanelInfo, aIsRaw: boolean, aIsChanged?: 'delete' | 'changed') => {
        setPanelsInfo((aPrev) => updateOverlapPanels(aPrev, aStart, aEnd, aBoard, aIsRaw, aIsChanged));
    };

    const saveKeepData = (aTargetPanel: string, aTimeInfo: TagAnalyzerPanelTimeKeeper, aRaw: boolean) => {
        const sUpdatedPanels = updatePanelTimeKeeperState(sBoardInfo.panels, aTargetPanel, aTimeInfo, aRaw);
        setBoardList((aPrev) => replaceBoardPanels(aPrev, pInfo.id, sUpdatedPanels));
    };

    const handleGlobalTimeRange = (aDataTime: TagAnalyzerTimeRange, aNavigatorTime: TagAnalyzerTimeRange, aInterval: TagAnalyzerGlobalTimeRangeState['interval']) => {
        setGlobalDataAndNavigatorTime({ data: aDataTime, navigator: aNavigatorTime, interval: aInterval });
    };

    const handleRefreshData = () => {
        setRefreshCount((aPrev) => aPrev + 1);
    };

    const handleEditRequest = (data: TagAnalyzerEditRequest) => {
        setEditingPanel(data);
    };

    const handleDeletePanel = (aPanelKey: string) => {
        setBoardList((aPrev) => removeBoardPanel(aPrev, pInfo.id, aPanelKey));
    };

    const updateTopLevelBgnEndTime = async (aStart?: TagAnalyzerRangeValue, aEnd?: TagAnalyzerRangeValue) => {
        if (!sBoardInfo?.panels || sBoardInfo.panels.length <= 0) return;
        const sTimeRange = await fetchNormalizedTopLevelTimeRange(
            sBoardInfo.panels[0].data.tag_set,
            aStart || pInfo.range_bgn,
            aEnd || pInfo.range_end,
        );
        setBgnEndTimeRange(sTimeRange);
    };

    const handleRefreshTime = async () => {
        await updateTopLevelBgnEndTime();
    };

    useEffect(() => {
        setIsLoadRollupTable(true);
        loadTables();
        loadRollupTables();
    }, []);

    useEffect(() => {
        if (sBoardInfo?.panels[0]?.data.tag_set) updateTopLevelBgnEndTime();
        else setBgnEndTimeRange({});
    }, []);

    const sPanelBoardState: TagAnalyzerBoardPanelState = {
        refreshCount: sRefreshCount,
        overlapPanels: sPanelsInfo,
        bgnEndTimeRange: sBgnEndTimeRange,
        globalTimeRange: sGlobalDataAndNavigatorTime,
    };

    const sPanelBoardActions: TagAnalyzerBoardPanelActions = {
        onOverlapSelectionChange: handleOverlapSelection,
        onDeletePanel: handleDeletePanel,
        onPersistPanelState: saveKeepData,
        onSetGlobalTimeRange: handleGlobalTimeRange,
        onOpenEditRequest: handleEditRequest,
    };

    return (
        // Render after rollup info load
        !sIsLoadRollupTable && (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {sEditingPanel ? (
                    <PanelEditor
                        pPanelInfo={sEditingPanel.pPanelInfo}
                        pNavigatorRange={sEditingPanel.pNavigatorRange}
                        pSetEditPanel={() => setEditingPanel(null)}
                        pSetSaveEditedInfo={sEditingPanel.pSetSaveEditedInfo}
                    />
                ) : (
                    <>
                        <Page>
                            <TagAnalyzerBoardToolbar
                                pBoardSource={pInfo}
                                pPanelsInfoCount={sPanelsInfo.length}
                                pActionHandlers={{
                                    onOpenTimeRangeModal: () => setTimeRangeModal(true),
                                    onRefreshData: handleRefreshData,
                                    onRefreshTime: handleRefreshTime,
                                    onSave: pOnSave,
                                    onOpenSaveModal: () => pSetIsSaveModal(true),
                                    onOpenOverlapModal: () => setIsModal(true),
                                }}
                            />
                            <Page.Body>
                                <TagAnalyzerBoard
                                    pInfo={sBoardInfo}
                                    pPanelBoardState={sPanelBoardState}
                                    pPanelBoardActions={sPanelBoardActions}
                                />
                                <Page.ContentBlock pHoverNone style={{ padding: '24px 32px' }}>
                                    <TagAnalyzerNewPanelButton />
                                </Page.ContentBlock>
                            </Page.Body>
                        </Page>
                        {sIsDisplayOverlapModal && <OverlapModal pPanelsInfo={sPanelsInfo} pSetIsModal={setIsModal} />}
                        {sIsDisplayTimeRangeModal && (
                            <TimeRangeModal pUseRecoil={true} pType={'tag'} pSetTimeRangeModal={setTimeRangeModal} pShowRefresh={false} pSaveCallback={updateTopLevelBgnEndTime} />
                        )}
                    </>
                )}
            </div>
        )
    );
};
export default TagAnalyzer;
