import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState } from 'react';
import { GoGrabber } from '@/assets/icons/Icon';
import { ChartThemeBackgroundColor } from '@/utils/constants';

const Panel = ({ pBoardInfo, pShowEditPanel, pType, pPanelInfo, pInsetDraging, pDragStat, pIsView, pModifyState, pSetModifyState, pParentWidth, pIsHeader }: any) => {
    const [sRefreshCount, setRefreshCount] = useState<number>(0);

    return (
        <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme] }}>
            {pIsHeader ? (
                <PanelHeader
                    pRefreshCount={sRefreshCount}
                    pSetRefreshCount={setRefreshCount}
                    pShowEditPanel={pShowEditPanel}
                    pType={pType}
                    pBoardInfo={pBoardInfo}
                    pPanelInfo={pPanelInfo}
                    pIsView={pIsView}
                ></PanelHeader>
            ) : pType === undefined ? (
                <div className="draggable-panel-header">
                    <GoGrabber size={20} color={pPanelInfo.theme !== 'dark' ? 'black' : ''} />
                </div>
            ) : null}
            {pPanelInfo && (
                <LineChart
                    pDragStat={pDragStat}
                    pInsetDraging={pInsetDraging}
                    pBoardInfo={pBoardInfo}
                    pType={pType}
                    pPanelInfo={pPanelInfo}
                    pModifyState={pModifyState}
                    pSetModifyState={pSetModifyState}
                    pParentWidth={pParentWidth}
                    pIsHeader={pIsHeader}
                ></LineChart>
            )}
        </div>
    );
};
export default Panel;
