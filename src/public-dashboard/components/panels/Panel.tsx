import './Panel.scss';
import LineChart from './chart/LineChart';
import VideoPanel from '@/components/dashboard/panels/video/VideoPanel';
import PanelHeader from './PanelHeader';
import { ChartThemeBackgroundColor } from '../../utils/constants';
import { ChartTheme } from '../../type/eChart';

const Panel = ({ pLoopMode, pChartVariableId, pBoardInfo, pPanelInfo, pParentWidth, pIsHeader, pBoardTimeMinMax, pIsActiveTab }: any) => {
    return (
        <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme as ChartTheme] }}>
            <PanelHeader pPanelInfo={pPanelInfo} pIsHeader={pIsHeader} />
            {pPanelInfo ? (
                pPanelInfo?.type === 'Video' ? (
                    <VideoPanel
                        pChartVariableId={pChartVariableId}
                        pPanelInfo={pPanelInfo}
                        pBoardInfo={pBoardInfo}
                        pBoardTimeMinMax={pBoardTimeMinMax}
                        pParentWidth={pParentWidth}
                        pIsHeader={pIsHeader}
                    />
                ) : (
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
                )
            ) : null}
        </div>
    );
};
export default Panel;
