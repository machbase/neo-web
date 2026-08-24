import LineChart from './chart/LineChart';
import VideoPanel from './video/VideoPanel';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState, useRef, useEffect } from 'react';
import { ChartThemeBackgroundColor } from '@/utils/constants';
import { ChartTheme } from '@/type/eChart';

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
    // Bumped by the chart every time its own refresh timer fires. The header's countdown ring restarts
    // on it, so the animation is anchored to the real fetch instead of free-running from mount: a CSS
    // animation of exactly N seconds and a timer that re-arms N seconds *after each callback* drift
    // apart by the query duration, every cycle, until the ring is visibly out of step.
    const [sRefreshCycleId, setRefreshCycleId] = useState<number>(0);
    // The theme the chart is actually rendered with, used to paint the panel chrome. For TQL charts
    // the panel theme is vestigial (owned by the .tql), so we seed it as undetermined — never the
    // hardcoded 'dark' default — and let LineChart lift the server-resolved theme (issue #1435).
    // Non-TQL charts keep their explicit panel theme and reflect edits immediately.
    const sIsTql = pPanelInfo?.type === 'Tql chart';
    const [sResolvedTheme, setResolvedTheme] = useState<string | undefined>(sIsTql ? undefined : pPanelInfo.theme);
    useEffect(() => {
        if (!sIsTql) setResolvedTheme(pPanelInfo.theme);
    }, [pPanelInfo.theme, sIsTql]);
    // Ref for VideoPanel to access fullscreen toggle
    const videoPanelRef = useRef<any>(null);

    const handleVideoFullscreen = () => {
        if (videoPanelRef.current && videoPanelRef.current.toggleFullscreen) {
            videoPanelRef.current.toggleFullscreen();
        }
    };

    return (
        <div className="panel-wrap" style={{ backgroundColor: sResolvedTheme ? ChartThemeBackgroundColor[sResolvedTheme as ChartTheme] : 'transparent' }}>
            <PanelHeader
                pRefreshCycleId={sRefreshCycleId}
                pRefreshCount={sRefreshCount}
                pSetRefreshCount={setRefreshCount}
                pShowEditPanel={pShowEditPanel}
                pType={pType}
                pBoardInfo={pBoardInfo}
                pPanelInfo={pPanelInfo}
                pIsView={pIsView}
                pIsHeader={pIsHeader}
                pOnFullscreen={handleVideoFullscreen}
                pResolvedTheme={sResolvedTheme}
            />
            {pPanelInfo ? (
                pPanelInfo?.type === 'Video' ? (
                    <VideoPanel
                        pLoopMode={pLoopMode}
                        pType={pType}
                        pIsActiveTab={pIsActiveTab}
                        pChartVariableId={pChartVariableId}
                        ref={videoPanelRef}
                        pPanelInfo={pPanelInfo}
                        pBoardInfo={pBoardInfo}
                        pBoardTimeMinMax={pBoardTimeMinMax}
                        pParentWidth={pParentWidth}
                        pIsHeader={pIsHeader}
                    />
                ) : (
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
                        pOnResolveTheme={setResolvedTheme}
                        pOnRefreshTick={() => setRefreshCycleId((aId) => aId + 1)}
                    />
                )
            ) : null}
        </div>
    );
};
export default Panel;
