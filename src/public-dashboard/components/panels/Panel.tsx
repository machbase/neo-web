import './Panel.scss';
import { useState, useEffect } from 'react';
import LineChart from './chart/LineChart';
import VideoPanel from '@/components/dashboard/panels/video/VideoPanel';
import PanelHeader from './PanelHeader';
import { ChartThemeBackgroundColor, ChartThemeTextColor } from '../../utils/constants';
import { ChartTheme } from '../../type/eChart';
import AutoRefreshControl from '@/components/dashboard/AutoRefreshControl';

const Panel = ({ pLoopMode, pChartVariableId, pBoardInfo, pPanelInfo, pParentWidth, pIsHeader, pBoardTimeMinMax, pIsActiveTab, pOnChangePanelRefresh }: any) => {
    // Match panel chrome to the theme the chart actually renders (issue #1435). TQL charts own their
    // theme in the .tql, so seed the chrome as undetermined (never the hardcoded 'dark' default) and
    // let LineChart lift the server-resolved theme. Non-TQL keep their explicit panel theme.
    const sIsTql = pPanelInfo?.type === 'Tql chart';
    const [sResolvedTheme, setResolvedTheme] = useState<string | undefined>(sIsTql ? undefined : pPanelInfo.theme);
    // Bumped by the chart on each of its own refresh ticks, so the header's countdown ring is anchored
    // to the real fetch rather than free-running from mount (mirrors the editor's Panel).
    const [sRefreshCycleId, setRefreshCycleId] = useState<number>(0);
    useEffect(() => {
        if (!sIsTql) setResolvedTheme(pPanelInfo.theme);
    }, [pPanelInfo.theme, sIsTql]);
    return (
        <div className="panel-wrap" style={{ backgroundColor: sResolvedTheme ? ChartThemeBackgroundColor[sResolvedTheme as ChartTheme] : 'transparent' }}>
            {/* The panel's own refresh interval, in the same countdown ring the board header uses, and
                only on panels that are actually refreshing. It sits in an overlay rather than in
                PanelHeader because this view renders panels with the header off (`pIsHeader={false}`),
                so nothing inside it is ever on screen. A Geomap honours the interval only with its own
                useAutoRefresh on, so there it is not drawn either. */}
            {(pPanelInfo?.timeRange?.refresh ?? 'Off') !== 'Off' && (pPanelInfo?.type !== 'Geomap' || !!pPanelInfo?.chartOptions?.useAutoRefresh) && (
                <div className="public-panel-refresh">
                    <AutoRefreshControl
                        pValue={pPanelInfo?.timeRange?.refresh ?? 'Off'}
                        pOnChange={(aRefresh: string) => pOnChangePanelRefresh?.(pPanelInfo.id, aRefresh)}
                        pCompact
                        pInk={ChartThemeTextColor[(sResolvedTheme ?? pPanelInfo.theme) as ChartTheme]}
                        pCycleId={sRefreshCycleId}
                        pTitle={`Panel auto refresh: ${pPanelInfo?.timeRange?.refresh ?? 'Off'}`}
                    />
                </div>
            )}
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
                        pOnRefreshTick={() => setRefreshCycleId((aId) => aId + 1)}
                    />
                )
            ) : null}
        </div>
    );
};
export default Panel;
