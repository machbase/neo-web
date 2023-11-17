import CreateChart from './CreateChart';
import Panel from './panel/Panel';
import './ChartBoard.scss';
import { useState } from 'react';
import ModalTimeRange from './ModalTimeRange';
import moment from 'moment';
import { Calendar, Save, Refresh, SaveAs, MdOutlineStackedLineChart, LuTimerReset } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';
import OverlapModal from './OverlapModal';
import { gBoardList } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';

const ChartBoard = ({ pInfo, pSetHandleSaveModalOpen, pHandleSaveModalOpen }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sIsModal, setIsModal] = useState<boolean>(false);
    const [sPanelsInfo, setPanelsInfo] = useState<any>([]);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const [sRefreshCount, setRefreshCount] = useState(0);
    const [sResetCount, setResetCount] = useState(0);

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

    return (
        <div className="board-list">
            <div className="set-global-option">
                <button onClick={() => setTimeRangeModal(true)} className="set-global-option-btn">
                    <Calendar />
                    {pInfo && pInfo.range_bgn ? (
                        <span>
                            {(typeof pInfo.range_bgn === 'string' && pInfo.range_bgn.includes('now') ? pInfo.range_bgn : moment(pInfo.range_bgn).format('yyyy-MM-DD HH:mm:ss')) +
                                '~' +
                                (typeof pInfo.range_end === 'string' && pInfo.range_end.includes('now') ? pInfo.range_end : moment(pInfo.range_end).format('yyyy-MM-DD HH:mm:ss'))}
                        </span>
                    ) : (
                        <span>Time range not set</span>
                    )}
                </button>
                <IconButton pIcon={<Refresh />} onClick={() => setRefreshCount((aPrev: any) => aPrev + 1)} />
                <IconButton pIcon={<LuTimerReset />} onClick={() => setResetCount((aPrev: any) => aPrev + 1)} />
                <div className="border"></div>
                <IconButton pIcon={<Save />} onClick={pSetHandleSaveModalOpen} />
                <IconButton pIcon={<SaveAs />} onClick={pHandleSaveModalOpen} />
                <IconButton pIcon={<MdOutlineStackedLineChart />} pDisabled={sPanelsInfo.length === 0} onClick={sPanelsInfo.length === 0 ? () => {} : () => setIsModal(true)} />
            </div>
            <div className="panel-list">
                {pInfo &&
                    pInfo.panels &&
                    pInfo.panels.map((aItem: any) => {
                        return (
                            <Panel
                                pResetCount={sResetCount}
                                pRefreshCount={sRefreshCount}
                                key={aItem.index_key}
                                pPanelsInfo={sPanelsInfo}
                                pGetChartInfo={getChartInfo}
                                pBoardInfo={pInfo}
                                pPanelInfo={aItem}
                                pSaveKeepData={savekeepData}
                            />
                        );
                    })}
                <CreateChart></CreateChart>
                {sIsModal && <OverlapModal pPanelsInfo={sPanelsInfo} pSetIsModal={setIsModal}></OverlapModal>}
                {sTimeRangeModal && <ModalTimeRange pType={'tagAnalyzer'} pSetTimeRangeModal={setTimeRangeModal}></ModalTimeRange>}
            </div>
        </div>
    );
};
export default ChartBoard;
