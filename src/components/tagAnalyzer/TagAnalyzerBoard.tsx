import NewChartButton from './TagAnalyzerNewPanelButton';
import TagAnalyzerBoardToolbar from './TagAnalyzerBoardToolbar';
import Panel from './panel/TagAnalyzerPanel';
import { useEffect, useState } from 'react';
import TimeRangeModal from '../modal/TimeRangeModal';
import OverlapModal from './modal/OverlapModal';
import EditPanel from './edit/EditPanel';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import { Page } from '@/design-system/components';
import type {
    TagAnalyzerChartBoardInfoProp as TagAnalyzerBoardInfoProp,
    TagAnalyzerChartBoardOnOpenSaveModalProp as TagAnalyzerBoardOnOpenSaveModalProp,
    TagAnalyzerChartBoardOnSaveProp as TagAnalyzerBoardOnSaveProp,
    TagAnalyzerEditRequest,
    TagAnalyzerGetChartInfoHandler,
    TagAnalyzerRefreshTimeHandler,
    TagAnalyzerSaveKeepDataHandler,
    TagAnalyzerSetGlobalTimeRangeHandler,
} from './TagAnalyzerType';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
} from './TagAnalyzerPanelType';

type TagAnalyzerLooseBgnEndTimeRange = {
    bgn_min: string | number;
    bgn_max: string | number;
    end_min: string | number;
    end_max: string | number;
};

// Hosts the full TagAnalyzer board view, including the toolbar, panel list,
// overlap workflow, global time sync, and the edit-panel entry point.
const TagAnalyzerBoard = ({
    pInfo,
    pOnSave,
    pOnOpenSaveModal,
}: {
    pInfo: TagAnalyzerBoardInfoProp;
    pOnSave: TagAnalyzerBoardOnSaveProp;
    pOnOpenSaveModal: TagAnalyzerBoardOnOpenSaveModalProp;
}) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sIsModal, setIsModal] = useState<boolean>(false);
    const [sPanelsInfo, setPanelsInfo] = useState<TagAnalyzerOverlapPanelInfo[]>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<Partial<TagAnalyzerBgnEndTimeRange> | undefined>(undefined);
    const [sEditingPanel, setEditingPanel] = useState<TagAnalyzerEditRequest | null>(null);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] = useState<TagAnalyzerGlobalTimeRangeState>({
        data: { startTime: undefined, endTime: undefined },
        navigator: { startTime: undefined, endTime: undefined },
        interval: {
            IntervalType: undefined,
            IntervalValue: undefined,
        },
    });

    const normalizeBgnEndTimeRange = (aTimeRange: TagAnalyzerLooseBgnEndTimeRange): Partial<TagAnalyzerBgnEndTimeRange> => {
        return {
            ...(typeof aTimeRange.bgn_min === 'number' ? { bgn_min: aTimeRange.bgn_min } : {}),
            ...(typeof aTimeRange.bgn_max === 'number' ? { bgn_max: aTimeRange.bgn_max } : {}),
            ...(typeof aTimeRange.end_min === 'number' ? { end_min: aTimeRange.end_min } : {}),
            ...(typeof aTimeRange.end_max === 'number' ? { end_max: aTimeRange.end_max } : {}),
        };
    };

    const getChartInfo: TagAnalyzerGetChartInfoHandler = (aStart, aEnd, aBoard, aIsRaw, aIsChanged) => {
        if (aIsChanged === 'delete') {
            setPanelsInfo((aPrev) => aPrev.filter((aItem) => aItem.board.index_key !== aBoard.index_key));
            return;
        }
        if (aIsChanged === 'changed') {
            setPanelsInfo((aPrev) =>
                aPrev.map((aItem) => {
                    return aItem.board.index_key === aBoard.index_key ? { ...aItem, isRaw: aIsRaw, start: aStart, duration: aEnd - aStart } : aItem;
                })
            );
        } else {
            if (sPanelsInfo.find((aItem) => aItem.board.index_key === aBoard.index_key)) {
                setPanelsInfo((aPrev) => aPrev.filter((aItem) => aItem.board.index_key !== aBoard.index_key));
            } else {
                setPanelsInfo((aPrev) => [...aPrev, { start: aStart, duration: aEnd - aStart, isRaw: aIsRaw, board: aBoard }]);
            }
        }
    };
    const savekeepData: TagAnalyzerSaveKeepDataHandler = (aTargetPanel, aTimeInfo, aRaw) => {
        // UPDATE - time (panel & navigator) && raw
        const tmpBoardInfo = JSON.parse(JSON.stringify(pInfo)) as typeof pInfo;
        tmpBoardInfo.panels = tmpBoardInfo.panels.map((aPanel: any) => {
            if (aPanel.index_key === aTargetPanel) {
                return {
                    ...aPanel,
                    time_keeper: {
                        ...aTimeInfo,
                    },
                    raw_keeper: aRaw,
                };
            } else return aPanel;
        });
        setBoardList(sBoardList.map((aBoard) => (aBoard.id === pInfo.id ? tmpBoardInfo : aBoard)));
    };
    const handleGlobalTimeRange: TagAnalyzerSetGlobalTimeRangeHandler = (aDataTime, aNavigatorTime, aInterval) => {
        setGlobalDataAndNavigatorTime({ data: aDataTime, navigator: aNavigatorTime, interval: aInterval });
    };
    const handleRefreshData = () => {
        setRefreshCount((aPrev) => aPrev + 1);
    };
    const handleRefreshTime = async () => {
        await getToplevelBgnEndTime();
    };
    const handleEditRequest = (data: TagAnalyzerEditRequest) => {
        setEditingPanel(data);
    };
    const getToplevelBgnEndTime: TagAnalyzerRefreshTimeHandler = async (aStart, aEnd) => {
        if (!pInfo?.panels || pInfo.panels.length <= 0) return;
        const sTimeRange = await getBgnEndTimeRange(pInfo.panels[0].tag_set, { bgn: aStart || pInfo.range_bgn, end: aEnd || pInfo.range_end }, { bgn: '', end: '' });
        setBgnEndTimeRange(normalizeBgnEndTimeRange(sTimeRange));
    };

    useEffect(() => {
        if (pInfo?.panels[0]?.tag_set) getToplevelBgnEndTime();
        else setBgnEndTimeRange({});
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Page>
                <TagAnalyzerBoardToolbar
                    pToolbarInfo={pInfo}
                    pPanelsInfoCount={sPanelsInfo.length}
                    pToolbarActions={{
                        onOpenTimeRangeModal: () => setTimeRangeModal(true),
                        onRefreshData: handleRefreshData,
                        onRefreshTime: handleRefreshTime,
                        onSave: pOnSave,
                        onOpenSaveModal: pOnOpenSaveModal,
                        onOpenOverlapModal: () => setIsModal(true),
                    }}
                />
                <Page.Body>
                    {sBgnEndTimeRange &&
                        pInfo &&
                        pInfo.panels &&
                        pInfo.panels.map((aItem: TagAnalyzerPanelInfo) => {
                            return (
                                <Page.ContentBlock key={aItem.index_key} pHoverNone style={{ padding: '24px 32px' }}>
                                    <Panel
                                        pRefreshCount={sRefreshCount}
                                        pPanelsInfo={sPanelsInfo}
                                        pBgnEndTimeRange={sBgnEndTimeRange}
                                        pGetChartInfo={getChartInfo}
                                        pBoardInfo={pInfo}
                                        pPanelInfo={aItem}
                                        pSaveKeepData={savekeepData}
                                        pGetBgnEndTime={getToplevelBgnEndTime}
                                        pGlobalTimeRange={sGlobalDataAndNavigatorTime}
                                        pSetGlobalTimeRange={handleGlobalTimeRange}
                                        pOnEditRequest={handleEditRequest}
                                    />
                                </Page.ContentBlock>
                            );
                        })}
                    <Page.ContentBlock pHoverNone style={{ padding: '24px 32px' }}>
                        <NewChartButton />
                    </Page.ContentBlock>
                </Page.Body>
                {sIsModal && <OverlapModal pPanelsInfo={sPanelsInfo} pSetIsModal={setIsModal} />}
                {sTimeRangeModal && (
                    <TimeRangeModal pUseRecoil={true} pType={'tag'} pSetTimeRangeModal={setTimeRangeModal} pShowRefresh={false} pSaveCallback={getToplevelBgnEndTime} />
                )}
            </Page>
            {sEditingPanel && (
                <EditPanel
                    pPanelInfo={sEditingPanel.pPanelInfo}
                    pBoardInfo={sEditingPanel.pBoardInfo}
                    pNavigatorRange={sEditingPanel.pNavigatorRange}
                    pSetEditPanel={() => setEditingPanel(null)}
                    pSetSaveEditedInfo={sEditingPanel.pSetSaveEditedInfo}
                />
            )}
        </div>
    );
};
export default TagAnalyzerBoard;
