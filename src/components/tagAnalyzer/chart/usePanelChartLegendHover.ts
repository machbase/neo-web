import { useCallback, useRef } from 'react';
import type { PanelChartState, PanelNavigateState, PanelState } from '../utils/panelRuntimeTypes';
import { buildChartSeriesOption } from './options/ChartSeriesOptionBuilder';
import type { ChartInstance } from './ChartRuntimeTypes';

type UsePanelChartLegendHoverParams = {
    getChartInstance: () => ChartInstance | undefined;
    chartState: PanelChartState;
    navigateState: PanelNavigateState;
    panelState: Pick<PanelState, 'isRaw'>;
};

/**
 * Applies temporary legend-hover style patches to the live ECharts instance.
 * Intent: Keep hover-only option patching outside the chart render component.
 * @param aParams The chart instance getter and current chart state.
 * @returns The hover state ref and patch callback.
 */
export function usePanelChartLegendHover({
    getChartInstance,
    chartState,
    navigateState,
    panelState,
}: UsePanelChartLegendHoverParams) {
    const hoveredLegendSeriesRef = useRef<string | undefined>(undefined);

    const applyLegendHoverState = useCallback(
        (aHoveredLegendSeries: string | undefined, aForce = false) => {
            const sKnownSeriesNames = new Set(
                [...navigateState.chartData, ...navigateState.navigatorChartData].map(
                    (aSeries) => aSeries.name,
                ),
            );
            const sNextHoveredLegendSeries =
                aHoveredLegendSeries && sKnownSeriesNames.has(aHoveredLegendSeries)
                    ? aHoveredLegendSeries
                    : undefined;

            if (!aForce && hoveredLegendSeriesRef.current === sNextHoveredLegendSeries) {
                return;
            }

            hoveredLegendSeriesRef.current = sNextHoveredLegendSeries;

            const sInstance = getChartInstance();
            if (!sInstance?.setOption) {
                return;
            }

            sInstance.setOption(
                buildChartSeriesOption(
                    navigateState.chartData,
                    chartState.display,
                    chartState.axes,
                    navigateState.navigatorChartData,
                    sNextHoveredLegendSeries,
                    chartState.highlights,
                    navigateState.navigatorRange,
                    panelState.isRaw,
                    chartState.useNormalize,
                ),
                { lazyUpdate: true },
            );
        },
        [
            chartState.axes,
            chartState.display,
            chartState.highlights,
            chartState.useNormalize,
            getChartInstance,
            navigateState.chartData,
            navigateState.navigatorChartData,
            navigateState.navigatorRange,
            panelState.isRaw,
        ],
    );

    return {
        applyLegendHoverState,
        hoveredLegendSeriesRef,
    };
}
