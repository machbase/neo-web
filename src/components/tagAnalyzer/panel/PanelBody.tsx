import ReactECharts from 'echarts-for-react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import { PANEL_GRID_SIDE } from './Chart/layout/PanelChartLayoutMetrics';
import {
    getChartLayoutMetrics,
    PANEL_CHART_HEIGHT,
} from './Chart/layout/PanelChartLayoutMetrics';
import {
    usePanelChartRuntime,
    type UsePanelChartRuntimeParams,
} from './Chart/usePanelChartRuntime';

function PanelMainChartLoadingOverlay({ showLegend }: { showLegend: boolean }) {
    const layout = getChartLayoutMetrics(showLegend);

    return (
        <div
            className="panel-main-chart-loading-overlay"
            style={{
                left: PANEL_GRID_SIDE,
                right: PANEL_GRID_SIDE,
                top: layout.mainGridTop,
                height: layout.mainGridHeight,
            }}
        >
            <span className="panel-main-chart-loading-spinner" />
            <span>Loading...</span>
        </div>
    );
}

const PanelBody = (props: UsePanelChartRuntimeParams) => {
    const { refs, chartState, handlers, isLoading } = props;
    const {
        option,
        onEvents,
        handleChartReady,
        chartMouseHandlers,
    } = usePanelChartRuntime(props);

    return (
        <div className="chart">
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range backward"
                icon={<VscChevronLeft size={16} />}
                onClick={handlers.rangeActions.shiftMainRangeLeft}
            />
            <div
                className="chart-body"
                ref={refs.chartAreaRef}
                {...chartMouseHandlers}
            >
                <ReactECharts
                    option={option}
                    onEvents={onEvents}
                    onChartReady={handleChartReady}
                    replaceMerge={['series', 'xAxis', 'yAxis', 'dataZoom']}
                    lazyUpdate
                    style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
                    opts={{ renderer: 'canvas' }}
                />
                {isLoading && (
                    <PanelMainChartLoadingOverlay
                        showLegend={chartState.display.show_legend}
                    />
                )}
            </div>
            <Button
                size="md"
                variant="secondary"
                isToolTip
                toolTipContent="Move range forward"
                icon={<VscChevronRight size={16} />}
                onClick={handlers.rangeActions.shiftMainRangeRight}
            />
        </div>
    );
};

export default PanelBody;
