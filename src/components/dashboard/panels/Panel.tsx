import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState } from 'react';

const Panel = ({ pBoardInfo, pShowEditPanel, pType, pPanelInfo, pInsetDraging, pDragStat }: any) => {
    const [sRefreshCount, setRefreshCount] = useState<number>(0);

    return (
        <div className="panel-wrap">
            <PanelHeader
                pRefreshCount={sRefreshCount}
                pSetRefreshCount={setRefreshCount}
                pShowEditPanel={pShowEditPanel}
                pType={pType}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
            ></PanelHeader>
            {pPanelInfo && (
                <LineChart
                    pRefreshCount={sRefreshCount}
                    pDragStat={pDragStat}
                    pInsetDraging={pInsetDraging}
                    pBoardInfo={pBoardInfo}
                    pType={pType}
                    pPanelInfo={pPanelInfo}
                ></LineChart>
            )}
        </div>
    );
};
export default Panel;
