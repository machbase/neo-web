import './Panel.scss';
import { useState, useEffect } from 'react';
import LineChart from './chart/LineChart';
import VideoPanel from '@/components/dashboard/panels/video/VideoPanel';
import PanelHeader from './PanelHeader';
import { ChartThemeBackgroundColor } from '../../utils/constants';
import { ChartTheme } from '../../type/eChart';

const Panel = ({ pLoopMode, pChartVariableId, pBoardInfo, pPanelInfo, pParentWidth, pIsHeader, pBoardTimeMinMax, pIsActiveTab }: any) => {
    // Match panel chrome to the theme the chart actually renders (issue #1435). TQL charts own their
    // theme in the .tql, so seed the chrome as undetermined (never the hardcoded 'dark' default) and
    // let LineChart lift the server-resolved theme. Non-TQL keep their explicit panel theme.
    const sIsTql = pPanelInfo?.type === 'Tql chart';
    const [sResolvedTheme, setResolvedTheme] = useState<string | undefined>(sIsTql ? undefined : pPanelInfo.theme);
    useEffect(() => {
        if (!sIsTql) setResolvedTheme(pPanelInfo.theme);
    }, [pPanelInfo.theme, sIsTql]);
    return (
        <div className="panel-wrap" style={{ backgroundColor: sResolvedTheme ? ChartThemeBackgroundColor[sResolvedTheme as ChartTheme] : 'transparent' }}>
            <PanelHeader pPanelInfo={pPanelInfo} pIsHeader={pIsHeader} pResolvedTheme={sResolvedTheme} />
            {pPanelInfo ? (
                pPanelInfo?.type === 'Video' ? (
                    <VideoPanel
                        pLoopMode={pLoopMode}
                        pIsActiveTab={pIsActiveTab}
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
                        pOnResolveTheme={setResolvedTheme}
                    />
                )
            ) : null}
        </div>
    );
};
export default Panel;
