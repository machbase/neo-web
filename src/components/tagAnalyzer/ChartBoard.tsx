import CreateChart from './CreateChart';
import Panel from './panel/Panel';
import './ChartBoard.scss';
import { useState } from 'react';
import ModalTimeRange from './ModalTimeRange';
import moment from 'moment';
import { FolderOpen, Calendar, Save, Refresh, SaveAs } from '@/assets/icons/Icon';

const ChartBoard = ({ pInfo, pSetHandleSaveModalOpen, pHandleSaveModalOpen, pHandleOpenModalOpen }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);

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
                <div className="btn-cover">
                    <Refresh />
                </div>
                <div className="border"></div>
                <div className="btn-cover">
                    <Save onClick={pSetHandleSaveModalOpen} />
                </div>
                <div className="btn-cover">
                    <SaveAs onClick={pHandleSaveModalOpen} />
                </div>
                <div className="btn-cover">
                    <FolderOpen onClick={pHandleOpenModalOpen} />
                </div>
            </div>
            <div className="panel-list">
                {pInfo &&
                    pInfo.panels &&
                    pInfo.panels.map((aItem: any) => {
                        return <Panel key={aItem.index_key} pBoardInfo={pInfo} pPanelInfo={aItem}></Panel>;
                    })}
                <CreateChart></CreateChart>
                {sTimeRangeModal && <ModalTimeRange pSetTimeRangeModal={setTimeRangeModal}></ModalTimeRange>}
            </div>
        </div>
    );
};
export default ChartBoard;