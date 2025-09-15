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
    pPanelInfo,
    pParentWidth,
    pIsHeader,
    pBoardTimeMinMax,
    pIsActiveTab,
}: any) => {
    const [sRefreshCount, setRefreshCount] = useState<number>(0);
    return (
        <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme as ChartTheme] }}>
            <PanelHeader
                pPanelInfo={pPanelInfo}
                pIsHeader={pIsHeader}
            />
            {pPanelInfo && (
                <LineChart
                    pLoopMode={pLoopMode}
                    pBoardInfo={pBoardInfo}
                    pPanelInfo={pPanelInfo}
                    pParentWidth={pParentWidth}
                    pIsHeader={pIsHeader}
                    pChartVariableId={pChartVariableId}
                    pBoardTimeMinMax={pBoardTimeMinMax}
                    pIsActiveTab={pIsActiveTab}
                />
            )}
        </div>
    );
};
export default Panel;
