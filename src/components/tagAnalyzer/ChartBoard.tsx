import CreateChart from './CreateChart';
import Panel from './panel/Panel';
import { useEffect, useState } from 'react';
import TimeRangeModal from '../modal/TimeRangeModal';
import { formatTimeValue } from '@/utils/dashboardUtil';
import { Calendar, Save, Refresh, SaveAs, MdOutlineStackedLineChart, LuTimerReset } from '@/assets/icons/Icon';
import OverlapModal from './OverlapModal';
import EditPanel from './panel/edit/EditPanel';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import { Button, Page } from '@/design-system/components';

const ChartBoard = ({ pInfo, pSetHandleSaveModalOpen, pHandleSaveModalOpen }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sIsModal, setIsModal] = useState<boolean>(false);
    const [sPanelsInfo, setPanelsInfo] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<any>(undefined);
    const [sEditingPanel, setEditingPanel] = useState<any>(null);
    const [sGlobalDataAndNavigatorTime, setGlobalDataAndNavigatorTime] = useState<{
        data: { startTime: any; endTime: any };
        navigator: { startTime: any; endTime: any };
        interval: {
            IntervalType: any;
            IntervalValue: any;
        };
    }>({
        data: { startTime: undefined, endTime: undefined },
        navigator: { startTime: undefined, endTime: undefined },
        interval: {
            IntervalType: undefined,
            IntervalValue: undefined,
        },
    });

    const getChartInfo = (aStart: any, aEnd: any, aBoard: any, aIsRaw: any, aIsChanged?: string) => {
        if (aIsChanged === 'delete') {
            setPanelsInfo((aPrev: any) => aPrev.filter((aItem: any) => aItem.board.index_key !== aBoard.index_key));
            return;
        }
        if (aIsChanged === 'changed') {
            setPanelsInfo((aPrev: any) =>
                aPrev.map((aItem: any) => {
                    return aItem.board.index_key === aBoard.index_key ? { ...aItem, isRaw: aIsRaw, start: aStart, duration: aEnd - aStart } : aItem;
                })
            );
        } else {
            if (sPanelsInfo.find((aItem: any) => aItem.board.index_key === aBoard.index_key)) {
                setPanelsInfo((aPrev: any) => aPrev.filter((aItem: any) => aItem.board.index_key !== aBoard.index_key));
            } else {
                setPanelsInfo((aPrev: any) => [...aPrev, { start: aStart, duration: aEnd - aStart, isRaw: aIsRaw, board: aBoard }]);
            }
        }
    };
    const savekeepData = (aTargetPanel: string, aTimeInfo: { endNaviTime: number; endPanelTime: number; startNaviTime: number; startPanelTime: number }, aRaw: boolean) => {
        // UPDATE - time (panel & navigator) && raw
        const tmpBoardInfo: any = JSON.parse(JSON.stringify(pInfo));
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
        setBoardList(
            sBoardList.map((aBoard: any) => {
                if (aBoard.id === pInfo.id) return tmpBoardInfo;
                else return aBoard;
            })
        );
    };
    const handleGlobalTimeRange = (aDataTime: any, aNavigatorTime: any, aInterval: any) => {
        setGlobalDataAndNavigatorTime({ data: aDataTime, navigator: aNavigatorTime, interval: aInterval });
    };
    const handleRefreshData = () => {
        setRefreshCount((aPrev: any) => aPrev + 1);
    };
    const handleRefreshTime = async () => {
        await getToplevelBgnEndTime();
    };
    const handleEditRequest = (data: any) => {
        setEditingPanel(data);
    };
    const getToplevelBgnEndTime = async (aStart?: any, aEnd?: any) => {
        if (pInfo?.panels && pInfo?.panels <= 0) return;
        const sTimeRange = await getBgnEndTimeRange(pInfo.panels[0].tag_set, { bgn: aStart || pInfo.range_bgn, end: aEnd || pInfo.range_end }, { bgn: '', end: '' });
        setBgnEndTimeRange(() => sTimeRange);
    };

    useEffect(() => {
        if (pInfo?.panels[0]?.tag_set) getToplevelBgnEndTime();
        else setBgnEndTimeRange({});
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Page>
                <Page.Header>
                    <Page.Space />
                    <Button.Group>
                        <Button size="sm" variant="ghost" onClick={() => setTimeRangeModal(true)}>
                            <Calendar style={{ paddingRight: '8px' }} />
                            {pInfo?.range_bgn ? (
                                <>
                                    {formatTimeValue(pInfo.range_bgn) + '~' + formatTimeValue(pInfo.range_end)}
                                </>
                            ) : (
                                <>Time range not set</>
                            )}
                        </Button>
                        <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh data" icon={<Refresh size={15} />} onClick={handleRefreshData} />
                        <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh time" icon={<LuTimerReset size={16} />} onClick={handleRefreshTime} />
                        <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pSetHandleSaveModalOpen} />
                        <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={pHandleSaveModalOpen} />
                        <Button
                            disabled={sPanelsInfo.length === 0}
                            size="icon"
                            variant="ghost"
                            isToolTip
                            toolTipContent="Overlap chart"
                            icon={<MdOutlineStackedLineChart size={16} />}
                            onClick={sPanelsInfo.length === 0 ? () => {} : () => setIsModal(true)}
                        />
                    </Button.Group>
                </Page.Header>
                <Page.Body>
                    {sBgnEndTimeRange &&
                        pInfo &&
                        pInfo.panels &&
                        pInfo.panels.map((aItem: any) => {
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
                        <CreateChart />
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
export default ChartBoard;
