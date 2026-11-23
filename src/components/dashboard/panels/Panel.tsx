import { isBuiltInDashboardPanel } from '@/utils/dashboardPanelSupport';
import { UnsupportedPanel } from './UnsupportedPanel';
import { ExtensionErrorBoundary, ExtensionView } from '../extensions/ExtensionPanels';
import { isExtensionPanel } from '../extensions/types';
import { useHostBoard, useHostBorder } from '../extensions/HostReact';
import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
import { useState, useEffect } from 'react';
import { ChartThemeBackgroundColor } from '@/utils/constants';
import { ChartTheme } from '@/type/eChart';

const BuiltInPanel = ({
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
    pHostBorderColor,
}: any) => {
    const hostBoard = useHostBoard();
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
    return (
        <div className="panel-wrap" style={{ backgroundColor: sResolvedTheme ? ChartThemeBackgroundColor[sResolvedTheme as ChartTheme] : 'transparent', borderColor: pHostBorderColor }}>
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
                pResolvedTheme={sResolvedTheme}
            />
            {pPanelInfo ? (
                <LineChart
                        pHostRuntime={hostBoard?.runtime}
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
            ) : null}
        </div>
    );
};
const Panel = (props: any) => {
    const { pPanelInfo, pBoardInfo, pBoardTimeMinMax } = props;
    const borderColor = useHostBorder(pPanelInfo?.id);
    if (!isExtensionPanel(pPanelInfo) && !isBuiltInDashboardPanel(pPanelInfo)) return (
        <div className="panel-wrap" style={{ borderColor }}>
            <PanelHeader {...props} />
            <UnsupportedPanel />
        </div>
    );
    if (!isExtensionPanel(pPanelInfo)) return <BuiltInPanel {...props} pHostBorderColor={borderColor} />;

    const distance = pBoardInfo.dashboard.distanceRange;
    const time = pBoardTimeMinMax;
    const timeRange = Number.isFinite(time?.min) && Number.isFinite(time?.max) ? { start: time.min, end: time.max } : null;
    return (
        <ExtensionErrorBoundary key={pPanelInfo.id}>
            <div className="panel-wrap" style={{ backgroundColor: ChartThemeBackgroundColor[pPanelInfo.theme as ChartTheme], borderColor }}>
                <PanelHeader {...props} pResolvedTheme={pPanelInfo.theme} />
                <ExtensionView
                    panel={pPanelInfo}
                    data={pPanelInfo.extension}
                    mode={props.pExtensionMode ?? 'dashboard'}
                    timeRange={timeRange}
                    distanceRange={{ start: distance?.start ?? '', end: distance?.end ?? '' }}
                    title={pPanelInfo.title ?? ''}
                    theme={pPanelInfo.theme}
                />
            </div>
        </ExtensionErrorBoundary>
    );
};
export default Panel;
