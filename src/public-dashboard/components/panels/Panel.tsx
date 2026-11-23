import { isBuiltInDashboardPanel } from '@/utils/dashboardPanelSupport';
import { UnsupportedPanel } from '@/components/dashboard/panels/UnsupportedPanel';
import './Panel.scss';
import { ExtensionView } from '@/components/dashboard/extensions/ExtensionPanels';
import { isExtensionPanel } from '@/components/dashboard/extensions/types';
import { useHostBoard, useHostBorder } from '@/components/dashboard/extensions/HostReact';
import { useState, useEffect } from 'react';
import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import { ChartThemeBackgroundColor, ChartThemeTextColor } from '../../utils/constants';
import { ChartTheme } from '../../type/eChart';
import AutoRefreshControl from '@/components/dashboard/AutoRefreshControl';

const Panel = ({ pLoopMode, pChartVariableId, pBoardInfo, pPanelInfo, pParentWidth, pIsHeader, pBoardTimeMinMax, pIsActiveTab, pOnChangePanelRefresh }: any) => {
    const hostBoard = useHostBoard();
    const borderColor = useHostBorder(pPanelInfo?.id);
    const extension = isExtensionPanel(pPanelInfo);
    const sIsBuiltIn = isBuiltInDashboardPanel(pPanelInfo);
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
        <div className="panel-wrap" style={{ backgroundColor: sResolvedTheme ? ChartThemeBackgroundColor[sResolvedTheme as ChartTheme] : 'transparent', borderColor }}>
            {/* The panel's own refresh interval, in the same countdown ring the board header uses, and
                only on panels that are actually refreshing. It sits in an overlay rather than in
                PanelHeader because this view renders panels with the header off (`pIsHeader={false}`),
                so nothing inside it is ever on screen. A Geomap honours the interval only with its own
                useAutoRefresh on, so there it is not drawn either. */}
            {sIsBuiltIn && (pPanelInfo?.timeRange?.refresh ?? 'Off') !== 'Off' && (pPanelInfo?.type !== 'Geomap' || !!pPanelInfo?.chartOptions?.useAutoRefresh) && (
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
            <PanelHeader pPanelInfo={pPanelInfo} pIsHeader={pIsHeader} pShowActions={extension} pResolvedTheme={sResolvedTheme} />
            {pPanelInfo ? (
                extension ? <ExtensionView
                    data={pPanelInfo.extension} panel={pPanelInfo} mode="dashboard"
                    title={pPanelInfo.title ?? ''} theme={pPanelInfo.theme}
                    timeRange={Number.isFinite(pBoardTimeMinMax?.min) && Number.isFinite(pBoardTimeMinMax?.max) ? { start: pBoardTimeMinMax.min, end: pBoardTimeMinMax.max } : null}
                    distanceRange={{ start: pBoardInfo?.dashboard?.distanceRange?.start ?? '', end: pBoardInfo?.dashboard?.distanceRange?.end ?? '' }}
                /> : !sIsBuiltIn ? <UnsupportedPanel /> : (
                    <LineChart
                        pHostRuntime={hostBoard?.runtime}
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
