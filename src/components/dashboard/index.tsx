import GridLayout from 'react-grid-layout';
import { useRef, useState } from 'react';

import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import Panel from './panels/Panel';
import CreatePanel from './createPanel/CreatePanel';
import { IconButton } from '../buttons/IconButton';
import { VscChevronLeft, Calendar, TbSquarePlus, VscChevronRight } from '@/assets/icons/Icon';
import ModalTimeRange from '../tagAnalyzer/ModalTimeRange';
import moment from 'moment';
import { setUnitTime } from '@/utils/dashboardUtil';

const Dashboard = ({ pInfo, pWidth }: any) => {
    const [sTimeRangeModal, setTimeRangeModal] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const sBoardRef: Element | any = useRef({});
    const [sCreateModal, setCreateModal] = useState(false);
    const [sPanelId, setPanelId] = useState('');
    const [sCreateOrEditType, setCreateOrEditType] = useState('create');

    const moveTimRange = (aItem: string) => {
        let sStartTimeBeforeStart = pInfo.dashboard.timeRange.start;
        let sStartTimeBeforeEnd = pInfo.dashboard.timeRange.end;

        if (String(sStartTimeBeforeStart).includes('now') || String(sStartTimeBeforeEnd).includes('now')) {
            sStartTimeBeforeStart = setUnitTime(sStartTimeBeforeStart);
            sStartTimeBeforeEnd = setUnitTime(sStartTimeBeforeEnd);
        }

        const sCalcTime = (Number(sStartTimeBeforeEnd) - Number(sStartTimeBeforeStart)) / 2;
        const sStartTime = aItem === 'l' ? Math.round(sStartTimeBeforeStart - sCalcTime) : Math.round(sStartTimeBeforeStart + sCalcTime);
        const sEndTime = aItem === 'l' ? Math.round(sStartTimeBeforeEnd - sCalcTime) : Math.round(sStartTimeBeforeEnd + sCalcTime);

        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === pInfo.id
                    ? {
                          ...aItem,
                          dashboard: { ...aItem.dashboard, timeRange: { ...aItem.dashboard.timeRange, start: sStartTime, end: sEndTime } },
                      }
                    : aItem;
            })
        );
    };
    const showEditPanel = (aType: string, aId?: string) => {
        setCreateOrEditType(aType);
        if (aId) {
            setPanelId(aId);
        }
        setCreateModal(!sCreateModal);
    };

    const draging = (aValue: any, aEvent: any) => {
        !aValue && changeLayout(aEvent);
    };
    const changeLayout = (aLayout: any) => {
        setBoardList(
            sBoardList.map((bItem: any) => {
                return bItem.id === pInfo.id
                    ? {
                          ...bItem,
                          dashboard: {
                              ...bItem.dashboard,
                              panels: bItem.dashboard.panels.map((cItem: any) => {
                                  const sValue = aLayout.find((dItem: any) => dItem.i === cItem.i);
                                  return { ...cItem, h: sValue.h, w: sValue.w, x: sValue.x, y: sValue.y };
                              }),
                          },
                      }
                    : bItem;
            })
        );
    };

    return (
        <div ref={sBoardRef} className="dashboard-form">
            <div className="board-header">
                <IconButton pWidth={24} pHeight={24} pIcon={<TbSquarePlus></TbSquarePlus>} onClick={() => showEditPanel('create')}></IconButton>

                <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronLeft></VscChevronLeft>} onClick={() => moveTimRange('l')}></IconButton>

                <button onClick={() => setTimeRangeModal(true)} className="set-global-option-btn">
                    <Calendar />
                    {pInfo && pInfo.dashboard.timeRange.start ? (
                        <span>
                            {(typeof pInfo.dashboard.timeRange.start === 'string' && pInfo.dashboard.timeRange.start.includes('now')
                                ? pInfo.dashboard.timeRange.start
                                : moment(pInfo.dashboard.timeRange.start).format('yyyy-MM-DD HH:mm:ss')) +
                                '~' +
                                (typeof pInfo.dashboard.timeRange.end === 'string' && pInfo.dashboard.timeRange.end.includes('now')
                                    ? pInfo.dashboard.timeRange.end
                                    : moment(pInfo.dashboard.timeRange.end).format('yyyy-MM-DD HH:mm:ss'))}
                        </span>
                    ) : (
                        <span>Time range not set</span>
                    )}
                    , Refresh : {pInfo.dashboard.timeRange.refresh}
                </button>
                <IconButton pWidth={24} pHeight={24} pIcon={<VscChevronRight></VscChevronRight>} onClick={() => moveTimRange('r')}></IconButton>
            </div>
            {pWidth && (
                <div className="board-body">
                    <GridLayout
                        className="layout"
                        useCSSTransforms={false}
                        layout={pInfo && pInfo.dashboard.panels}
                        cols={36}
                        autoSize={true}
                        rowHeight={30}
                        width={pWidth}
                        onDragStart={(aEvent: any) => draging(true, aEvent)}
                        onDragStop={(aEvent: any) => draging(false, aEvent)}
                        onResizeStop={changeLayout}
                        draggableHandle=".board-panel-header"
                    >
                        {pInfo.dashboard &&
                            pInfo.dashboard.panels &&
                            pInfo.dashboard.panels.map((aItem: any) => {
                                return (
                                    <div key={aItem.i}>
                                        <Panel pShowEditPanel={showEditPanel} pBoardInfo={pInfo} pPanelInfo={aItem}></Panel>
                                    </div>
                                );
                            })}
                    </GridLayout>
                </div>
            )}
            {sTimeRangeModal && <ModalTimeRange pType={'dashboard'} pSetTimeRangeModal={setTimeRangeModal}></ModalTimeRange>}
            {sCreateModal && <CreatePanel pType={sCreateOrEditType} pPanelId={sPanelId} pBoardInfo={pInfo} pSetCreateModal={setCreateModal}></CreatePanel>}
        </div>
    );
};
export default Dashboard;
