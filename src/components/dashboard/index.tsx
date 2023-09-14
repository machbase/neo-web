import GridLayout from 'react-grid-layout';
import LineChart from './panels/LineChart';
import { useRef, useEffect, useState } from 'react';

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

const Dashboard = ({ pSideSizes, pDraged, pInfo }: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const sBoardRef: Element | any = useRef({});
    const [sBoardSize, setBoardSize] = useState(0);
    const [sDraging, setDraging] = useState(true);
    const [sCreateModal, setCreateModal] = useState(false);

    const changeLayout = (aItem: any) => {
        sDraging;
        setDrag(true);
        const sCopyBoard = JSON.parse(JSON.stringify(pInfo));
        sCopyBoard.panels = aItem;
        setBoardList(sBoardList.map((bItem) => (bItem.id === sCopyBoard.id ? { ...bItem, dashboard: aItem } : bItem)));
    };
    const addItem = () => {
        const sAddItem = { i: getId(), x: 0, y: Infinity, w: 14, h: 10 };
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === pInfo.id ? { ...aItem, dashboard: aItem.panels.concat(sAddItem) } : aItem;
            })
        );
    };

    const setDrag = (aStatus: boolean) => {
        setDraging(aStatus);
    };

    useEffect(() => {
        setBoardSize(typeof pSideSizes[1] !== 'string' ? pSideSizes[1] : sBoardRef?.current?.clientWidth);
    }, [sBoardRef?.current?.clientWidth, pSideSizes[1]]);

    return (
        <div ref={sBoardRef} className="dashboard-form">
            <div className="board-header">
                <IconButton pWidth={20} pHeight={20} pIcon={<VscDiffAdded></VscDiffAdded>} onClick={() => setCreateModal(true)}></IconButton>
            </div>
            <div className="board-body">
                <GridLayout
                    className="layout"
                    useCSSTransforms={false}
                    layout={pInfo && pInfo.panels}
                    cols={36}
                    autoSize={true}
                    rowHeight={30}
                    width={sBoardSize}
                    onDragStart={() => setDrag(false)}
                    onDragStop={() => setDrag(true)}
                    onResizeStop={changeLayout}
                    draggableHandle=".board-panel-header"
                >
                    {pInfo &&
                        pInfo.panels &&
                        pInfo.panels.map((aItem: any) => {
                            return (
                                <div key={aItem.i}>
                                    <Panel pDraging={sDraging} pDraged={pDraged} pValue={aItem}></Panel>
                                </div>
                            );
                        })}
                </GridLayout>
            </div>
            {sCreateModal && (
                <CreatePanel
                    pDraged={pDraged}
                    pAddItem={addItem}
                    pInfo={{ ...pInfo, dashboard: [...pInfo.panels, { i: getId(), x: 0, y: Infinity, w: 14, h: 10 }] }}
                    pSetCreateModal={setCreateModal}
                ></CreatePanel>
            )}
        </div>
    );
};
export default Dashboard;
