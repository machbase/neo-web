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
    type PanelChartInteractionHintMode,
    type UsePanelChartRuntimeParams,
} from './Chart/usePanelChartRuntime';
import { PanelOverlayMode } from '../domain/PanelDomain';

const PANEL_CHART_INTERACTION_HINT_TEXT: Record<
    PanelChartInteractionHintMode,
    string
> = {
    [PanelOverlayMode.HIGHLIGHT]: 'Drag to create highlight',
};

function PanelChartInteractionHint({
    mode,
    position,
}: {
    mode: PanelChartInteractionHintMode | undefined;
    position: { x: number; y: number } | undefined;
}) {
    if (!mode || !position) {
        return null;
    }

    return (
        <span
            className="panel-chart-interaction-hint"
            style={{
                left: position.x + 14,
                top: Math.max(6, position.y - 34),
            }}
        >
            {PANEL_CHART_INTERACTION_HINT_TEXT[mode]}
        </span>
    );
}

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
        hintMode,
        cursorHintPosition,
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
                onClick={handlers.rangeHandlers.onShiftPanelRangeLeft}
            />
            <div
                className="chart-body"
                ref={refs.chartAreaRef}
                {...chartMouseHandlers}
            >
                <PanelChartInteractionHint
                    mode={hintMode}
                    position={cursorHintPosition}
                />
                <ReactECharts
                    option={option}
                    onEvents={onEvents}
                    onChartReady={handleChartReady}
                    replaceMerge={['series']}
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
                onClick={handlers.rangeHandlers.onShiftPanelRangeRight}
            />
        </div>
    );
};

export default PanelBody;
