import { useCallback, useRef } from 'react';
import type { PanelChartState, PanelNavigateState, PanelState } from '../utils/panelRuntimeTypes';
import { buildChartSeriesOption } from './options/ChartOptionBuilder';
import { buildChartYAxisOption } from './options/OptionBuildHelpers/ChartAxisOptionBuilder';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
} from './options/OptionBuildHelpers/ChartHighlightSeriesOptions';
import { buildMainSeriesOption } from './options/OptionBuildHelpers/ChartMainSeriesOptions';
import { buildNavigatorSeriesOption } from './options/OptionBuildHelpers/ChartNavigatorSeriesOptions';
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

            const sYAxisOption = buildChartYAxisOption(
                chartState.axes,
                navigateState.chartData,
                panelState.isRaw,
                chartState.useNormalize,
            );
            const sHighlightOverlaySeries = buildHighlightOverlaySeriesOption(
                chartState.highlights,
            );
            const sHighlightLabelSeries = buildHighlightLabelSeries(
                chartState.highlights,
                sYAxisOption[0],
            );
            const sMainSeries = buildMainSeriesOption(
                navigateState.chartData,
                chartState.display,
                chartState.axes,
                sNextHoveredLegendSeries,
            );
            const sNavigatorSeries = buildNavigatorSeriesOption(
                navigateState.navigatorChartData,
                sNextHoveredLegendSeries,
            );

            sInstance.setOption(
                buildChartSeriesOption(
                    sHighlightOverlaySeries,
                    sHighlightLabelSeries,
                    sMainSeries,
                    sNavigatorSeries,
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
            panelState.isRaw,
        ],
    );

    return {
        applyLegendHoverState,
        hoveredLegendSeriesRef,
    };
}
