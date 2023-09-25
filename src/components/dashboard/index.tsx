import GridLayout from 'react-grid-layout';
import { useRef, useState } from 'react';

import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId } from '@/utils';
import Panel from './panels/Panel';
import { VscDiffAdded } from 'react-icons/vsc';
import CreatePanel from './createPanel/CreatePanel';
import { IconButton } from '../buttons/IconButton';
import { defaultTimeSeriesData } from '@/utils/dashboardUtil';

const Dashboard = ({ pInfo, pWidth }: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const [sIsDrag, setIsDrag] = useState(false);
    const sBoardRef: Element | any = useRef({});
    const [sCreateModal, setCreateModal] = useState(false);

    const draging = (aValue: any, aEvent: any) => {
        setIsDrag(aValue);
        !aValue && changeLayout(aEvent);
    };
    const changeLayout = (aItem: any) => {
        setBoardList(sBoardList.map((bItem: any) => (bItem.id === pInfo.id ? { ...bItem, dashboard: { ...bItem.dashboard, panels: aItem } } : bItem)));
    };

    return (
        <div ref={sBoardRef} className="dashboard-form">
            <div className="board-header">
                <IconButton pWidth={20} pHeight={20} pIcon={<VscDiffAdded></VscDiffAdded>} onClick={() => setCreateModal(true)}></IconButton>
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
                                        <Panel pPanelInfo={aItem}></Panel>
                                    </div>
                                );
                            })}
                    </GridLayout>
                </div>
            )}
            {sCreateModal && <CreatePanel pType="create" pBoardInfo={pInfo} pSetCreateModal={setCreateModal}></CreatePanel>}
        </div>
    );
};
export default Dashboard;
