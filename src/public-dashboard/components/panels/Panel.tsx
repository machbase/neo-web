import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState } from 'react';
import { ChartThemeBackgroundColor } from '../../utils/constants';
import { ChartTheme } from '../../type/eChart';

const Panel = ({
    pLoopMode,
    pChartVariableId,
    pBoardInfo,
    pShowEditPanel,
    pType,
    pPanelInfo,
    pInsetDraging,
    pDragStat,
    pIsView,
    pModifyState,
    pSetModifyState,
    pParentWidth,
    pIsHeader,
    pBoardTimeMinMax,
    pIsActiveTab,
}: any) => {
    const [sRefreshCount, setRefreshCount] = useState<number>(0);
    return (
        <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme as ChartTheme] }}>
            <PanelHeader
                pRefreshCount={sRefreshCount}
                pSetRefreshCount={setRefreshCount}
                pShowEditPanel={pShowEditPanel}
                pType={pType}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
                pIsView={pIsView}
                pIsHeader={pIsHeader}
            />
            {pPanelInfo && (
                <LineChart
                    pLoopMode={pLoopMode}
                    pDragStat={pDragStat}
                    pInsetDraging={pInsetDraging}
                    pBoardInfo={pBoardInfo}
                    pType={pType}
                    pPanelInfo={pPanelInfo}
                    pModifyState={pModifyState}
                    pSetModifyState={pSetModifyState}
                    pParentWidth={pParentWidth}
                    pIsHeader={pIsHeader}
                    pChartVariableId={pChartVariableId}
                    pIsView={pIsView}
                    pBoardTimeMinMax={pBoardTimeMinMax}
                    pIsActiveTab={pIsActiveTab}
                />
            )}
        </div>
    );
};
export default Panel;
