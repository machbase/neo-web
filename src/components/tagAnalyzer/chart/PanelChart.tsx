import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import type { PanelInfo } from '../panel/panelModel';
import type { RangeState } from '../range/rangeModel';
import { resolveRuntimePanelChartConfig } from './chartOptions';
import { useChartInteraction, type ChartInteractionInputs } from './chartInteraction';
import { getChartLayoutMetrics, PANEL_CHART_HEIGHT, PANEL_GRID_SIDE } from './chartLayout';

export default function PanelChart({
    panelInfo,
    isLoading,
    rangeState,
    displayNotice,
    ...runtimeProps
}: PanelChartProps) {
    const runtimeConfig = useMemo(
        () => resolveRuntimePanelChartConfig(panelInfo),
        [panelInfo],
    );
    const { refs, handlers } = runtimeProps;
    const rangeReady = rangeState !== undefined;
    const overlayLayout = getChartLayoutMetrics(
        runtimeConfig.display.showLegend,
    );

    return (
        <div className="chart">
            <Button
                data-testid="main-shift-backward"
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                aria-label="Move range backward"
                icon={<VscChevronLeft size={16} />}
                disabled={!rangeReady}
                onClick={handlers.rangeActions.shiftMainRangeLeft}
            />
            <div
                data-testid="chart"
                className="chart-body"
                ref={refs.chartAreaRef}
                style={{ height: PANEL_CHART_HEIGHT }}
                onMouseDownCapture={(event) => {
                    if (event.button === 2) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }}
                role="region"
                aria-label={`${panelInfo.title} chart`}
                aria-busy={isLoading}
            >
                {rangeState && (
                    <ReadyPanelChart
                        {...runtimeProps}
                        runtimeConfig={runtimeConfig}
                        rangeState={rangeState}
                    />
                )}
                {(isLoading || displayNotice) && (
                    <div
                        className={`panel-main-chart-${isLoading ? 'loading' : 'notice'}-overlay`}
                        style={{
                            left: PANEL_GRID_SIDE,
                            right: PANEL_GRID_SIDE,
                            top: overlayLayout.mainGridTop,
                            height: overlayLayout.mainGridHeight,
                        }}
                    >
                        {isLoading && (
                            <span className="panel-main-chart-loading-spinner" />
                        )}
                        <span>{isLoading ? 'Loading...' : displayNotice}</span>
                    </div>
                )}
            </div>
            <Button
                data-testid="main-shift-forward"
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range forward"
                aria-label="Move range forward"
                icon={<VscChevronRight size={16} />}
                disabled={!rangeReady}
                onClick={handlers.rangeActions.shiftMainRangeRight}
            />
        </div>
    );
}

// -------------------- Local --------------------

function ReadyPanelChart(props: ChartInteractionInputs) {
    const { option, onEvents, onChartReady } = useChartInteraction(props);

    return (
        <ReactECharts
            option={option}
            onEvents={onEvents}
            onChartReady={onChartReady}
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
}

type PanelChartProps = Omit<
    ChartInteractionInputs,
    'rangeState' | 'runtimeConfig'
> & {
    panelInfo: PanelInfo;
    isLoading: boolean;
    rangeState: RangeState | undefined;
    displayNotice: string | undefined;
};
