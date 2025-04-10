import CreateChart from './CreateChart';
import Panel from './panel/Panel';
import './ChartBoard.scss';
import { useEffect, useState } from 'react';
import ModalTimeRange from './ModalTimeRange';
import moment from 'moment';
import { Calendar, Save, Refresh, SaveAs, MdOutlineStackedLineChart, LuTimerReset } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';
import OverlapModal from './OverlapModal';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';

const ChartBoard = ({ pInfo, pSetHandleSaveModalOpen, pHandleSaveModalOpen }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sIsModal, setIsModal] = useState<boolean>(false);
    const [sPanelsInfo, setPanelsInfo] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sBgnEndTimeRange, setBgnEndTimeRange] = useState<any>(undefined);
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
        <div className="board-list">
            <div className="set-global-option">
                <button onClick={() => setTimeRangeModal(true)} className="set-global-option-btn">
                    <Calendar />
                    {pInfo && pInfo.range_bgn ? (
                        <span>
                            {(typeof pInfo.range_bgn === 'string' && (pInfo?.range_bgn?.includes('now') || pInfo?.range_bgn?.includes('last'))
                                ? pInfo.range_bgn
                                : moment(pInfo.range_bgn).format('yyyy-MM-DD HH:mm:ss')) +
                                '~' +
                                (typeof pInfo.range_end === 'string' && (pInfo?.range_end?.includes('now') || pInfo?.range_bgn?.includes('last'))
                                    ? pInfo.range_end
                                    : moment(pInfo.range_end).format('yyyy-MM-DD HH:mm:ss'))}
                        </span>
                    ) : (
                        <span>Time range not set</span>
                    )}
                </button>
                <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton
                        pWidth={16}
                        pHeight={16}
                        pIsToopTip
                        pPlace={'bottom'}
                        pToolTipContent={'Refresh data'}
                        pToolTipId={'refresh-taz-tab-data'}
                        pIcon={<Refresh />}
                        onClick={handleRefreshData}
                    />
                </div>
                <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton
                        pWidth={16}
                        pHeight={16}
                        pIsToopTip
                        pPlace={'bottom'}
                        pToolTipContent={'Refresh time'}
                        pToolTipId={'refresh-taz-tab-time'}
                        pIcon={<LuTimerReset />}
                        onClick={handleRefreshTime}
                    />
                </div>
                <div className="border"></div>
                <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton
                        pWidth={16}
                        pHeight={16}
                        pIsToopTip
                        pPlace={'bottom'}
                        pToolTipContent={'Save'}
                        pToolTipId={'save-taz-tab-'}
                        pIcon={<Save />}
                        onClick={pSetHandleSaveModalOpen}
                    />
                </div>
                <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton
                        pWidth={16}
                        pHeight={16}
                        pIsToopTip
                        pPlace={'bottom'}
                        pToolTipContent={'Save as'}
                        pToolTipId={'save-as-taz-tab-'}
                        pIcon={<SaveAs />}
                        onClick={pHandleSaveModalOpen}
                    />
                </div>
                <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton
                        pWidth={16}
                        pHeight={16}
                        pIsToopTip
                        pDisabled={sPanelsInfo.length === 0}
                        pPlace={'bottom'}
                        pToolTipContent={'Overlap chart'}
                        pToolTipId={'overlap-taz-tab-'}
                        pIcon={<MdOutlineStackedLineChart />}
                        onClick={sPanelsInfo.length === 0 ? () => {} : () => setIsModal(true)}
                    />
                </div>
            </div>
            <div className="panel-list">
                {sBgnEndTimeRange &&
                    pInfo &&
                    pInfo.panels &&
                    pInfo.panels.map((aItem: any) => {
                        return (
                            <Panel
                                pRefreshCount={sRefreshCount}
                                key={aItem.index_key}
                                pPanelsInfo={sPanelsInfo}
                                pBgnEndTimeRange={sBgnEndTimeRange}
                                pGetChartInfo={getChartInfo}
                                pBoardInfo={pInfo}
                                pPanelInfo={aItem}
                                pSaveKeepData={savekeepData}
                                pGetBgnEndTime={getToplevelBgnEndTime}
                                pGlobalTimeRange={sGlobalDataAndNavigatorTime}
                                pSetGlobalTimeRange={handleGlobalTimeRange}
                            />
                        );
                    })}
                <CreateChart />
                {sIsModal && <OverlapModal pPanelsInfo={sPanelsInfo} pSetIsModal={setIsModal} />}
                {sTimeRangeModal && <ModalTimeRange pType={'tagAnalyzer'} pSetTimeRangeModal={setTimeRangeModal} pSaveCallback={getToplevelBgnEndTime} />}
            </div>
        </div>
    );
};
export default ChartBoard;
