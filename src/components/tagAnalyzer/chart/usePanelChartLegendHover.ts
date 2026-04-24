import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { PanelChartState, PanelNavigateState, PanelState } from '../utils/panelRuntimeTypes';
import { buildChartSeriesOption } from './options/ChartOptionBuilder';
import { buildChartYAxisOption } from './options/OptionBuildHelpers/ChartAxisOptionBuilder';
import {
    buildHighlightLabelSeries,
    buildHighlightOverlaySeriesOption,
} from './options/OptionBuildHelpers/HighlightSeriesOptionBuilder';
import { buildMainSeriesOption } from './options/OptionBuildHelpers/MainPanelSeriesOptionBuilder';
import { buildNavigatorSeriesOption } from './options/OptionBuildHelpers/NavigatorSeriesOptionBuilder';
import {
    buildSeriesAnnotationGuideLineSeries,
    buildSeriesAnnotationLabelSeries,
} from './options/OptionBuildHelpers/PanelSeriesAnnotationOptionBuilder';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';

type UsePanelChartLegendHoverParams = {
    getChartInstance: () => PanelChartInstance | undefined;
    chartState: PanelChartState;
    navigateState: PanelNavigateState;
    panelState: Pick<PanelState, 'isRaw'>;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
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
    visibleSeriesRef,
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
            const sAnnotationGuideLineSeries = buildSeriesAnnotationGuideLineSeries(
                chartState.seriesList,
                navigateState.chartData,
                sYAxisOption,
                navigateState.navigatorRange,
                visibleSeriesRef.current,
            );
            const sAnnotationLabelSeries = buildSeriesAnnotationLabelSeries(
                chartState.seriesList,
                navigateState.chartData,
                sYAxisOption,
                navigateState.navigatorRange,
                visibleSeriesRef.current,
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
                    sAnnotationGuideLineSeries,
                    sAnnotationLabelSeries,
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
            chartState.seriesList,
            chartState.useNormalize,
            getChartInstance,
            navigateState.chartData,
            navigateState.navigatorChartData,
            navigateState.navigatorRange,
            panelState.isRaw,
            visibleSeriesRef,
        ],
    );

    return {
        applyLegendHoverState,
        hoveredLegendSeriesRef,
    };
}
