import GridLayout from 'react-grid-layout';
import LineChart from './panels/LineChart';
import { useRef, useEffect, useState } from 'react';

import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';
import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { getId } from '@/utils';
const Dashboard = ({ pId, pSideSizes, pDraged }: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);

    const sBoardRef: Element | any = useRef({});
    const [sBoardSize, setBoardSize] = useState(0);
    const [sBoard, setBoard] = useState<any>({});
    const [sDraging, setDraging] = useState(true);

    const changeLayout = (aItem: any) => {
        sDraging;
        setDrag(true);
        const sCopyBoard = JSON.parse(JSON.stringify(sBoard));
        sCopyBoard.panels = aItem;
        setBoard(sCopyBoard);
        setBoardList(sBoardList.map((bItem) => (bItem.id === sCopyBoard.id ? { ...bItem, panels: sCopyBoard.panels } : bItem)));
    };
    const addItem = () => {
        const sAddItem = { i: getId(), x: 0, y: Infinity, w: 14, h: 10 };
        setBoard({ ...sBoard, panels: [...sBoard.panels, sAddItem] });
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sBoard.id ? { ...aItem, panels: aItem.panels.concat(sAddItem) } : aItem;
            })
        );
    };

    const setDrag = (aStatus: boolean) => {
        setDraging(aStatus);
    };

    useEffect(() => {
        setBoardSize(typeof pSideSizes[1] !== 'string' ? pSideSizes[1] : sBoardRef?.current?.clientWidth);
        setBoard(sBoardList.find((aItem: any) => aItem.id === pId));
    }, [sBoardRef?.current?.clientWidth, pSideSizes[1]]);

    return (
        <div ref={sBoardRef} className="dashboard-form">
            <button onClick={addItem}>addItem</button>
            <GridLayout
                className="layout"
                useCSSTransforms={false}
                layout={sBoard && sBoard.panels}
                cols={36}
                autoSize={true}
                rowHeight={30}
                width={sBoardSize}
                onDragStart={() => setDrag(false)}
                onResizeStop={changeLayout}
            >
                {sBoard &&
                    sBoard.panels &&
                    sBoard.panels.map((aItem: any) => {
                        return (
                            <div style={{ border: '1px solid #999999', borderRadius: '4px', width: '100%', height: '100%' }} key={aItem.i}>
                                <LineChart pDraged={pDraged} pValue={aItem}></LineChart>
                            </div>
                        );
                    })}
            </GridLayout>
        </div>
    );
};
export default Dashboard;
