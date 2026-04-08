import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    PANEL_CHART_HEIGHT,
    buildPanelChartOption,
    buildDefaultVisibleSeriesMap,
    buildVisibleSeriesList,
    extractBrushRange,
    extractDataZoomRange,
} from './PanelEChartUtil';
import type { PanelChartHandle, PanelChartHandlers, PanelChartRefs, PanelChartState, PanelNavigateState } from './TagAnalyzerPanelTypes';
import type { TagAnalyzerTimeRange } from './TagAnalyzerPanelModelTypes';

const isSameTimeRange = (aLeft: TagAnalyzerTimeRange, aRight: TagAnalyzerTimeRange) => {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
};

// Displays the main panel graph and its navigator/scroll area.
// It assembles the ECharts option tree, keeps the zoom window in sync, and forwards chart interactions back up.
const PanelChart = ({
    pChartRefs,
    pChartState,
    pPanelState,
    pNavigateState,
    pChartHandlers,
}: {
    pChartRefs: PanelChartRefs;
    pChartState: PanelChartState;
    pPanelState: { isRaw: boolean; isDragSelectActive: boolean };
    pNavigateState: PanelNavigateState;
    pChartHandlers: PanelChartHandlers;
}) => {
    const sChartRef = useRef<any>(null);
    const sVisibleSeriesRef = useRef<Record<string, boolean>>({});
    const [sVisibleSeries, setVisibleSeries] = useState<Record<string, boolean>>({});
    const sLastZoomRangeRef = useRef<TagAnalyzerTimeRange>(pNavigateState.panelRange);
    const sIsSelectionMode = pPanelState.isDragSelectActive;
    const sIsDragZoomEnabled = pChartState.display.use_zoom === 'Y' && !sIsSelectionMode;
    const sIsBrushActive = sIsSelectionMode || sIsDragZoomEnabled;

    useEffect(() => {
        const sNextVisibleSeries = {
            ...buildDefaultVisibleSeriesMap(pNavigateState.chartData),
            ...sVisibleSeriesRef.current,
        };

        sVisibleSeriesRef.current = sNextVisibleSeries;
        setVisibleSeries(sNextVisibleSeries);
    }, [pNavigateState.chartData]);

    useEffect(() => {
        sLastZoomRangeRef.current = pNavigateState.panelRange;
    }, [pNavigateState.panelRange]);

    const syncBrushInteraction = useCallback((aInstance?: any) => {
        const sInstance = aInstance ?? sChartRef.current?.getEchartsInstance?.();
        if (!sInstance) return;

        if (sIsBrushActive) {
            sInstance.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                    brushType: 'lineX',
                    brushMode: 'single',
                    xAxisIndex: 0,
                },
            });
            return;
        }

        sInstance.dispatchAction({
            type: 'brush',
            areas: [],
        });
        sInstance.dispatchAction({
            type: 'takeGlobalCursor',
            key: 'brush',
            brushOption: {
                brushType: false,
            },
        });
    }, [sIsBrushActive]);

    useEffect(() => {
        const sHandle: PanelChartHandle = {
            setPanelRange: (aRange) => {
                const sInstance = sChartRef.current?.getEchartsInstance?.();
                if (!sInstance) return;

                sInstance.dispatchAction({
                    type: 'dataZoom',
                    startValue: aRange.startTime,
                    endValue: aRange.endTime,
                });
            },
            getVisibleSeries: () => buildVisibleSeriesList(pNavigateState.chartData, sVisibleSeriesRef.current),
        };

        if (pChartRefs.chartWrap) {
            (pChartRefs.chartWrap as any).current = sHandle;
        }
    }, [pChartRefs.chartWrap, pNavigateState.chartData]);

    const sOption = useMemo(
        () =>
            buildPanelChartOption({
                chartData: pNavigateState.chartData,
                navigatorData: pNavigateState.navigatorData,
                panelRange: pNavigateState.panelRange,
                navigatorRange: pNavigateState.navigatorRange,
                axes: pChartState.axes,
                display: pChartState.display,
                isRaw: pPanelState.isRaw,
                useNormalize: pChartState.useNormalize,
                visibleSeries: sVisibleSeries,
            }),
        [pNavigateState, pChartState, pPanelState.isRaw, sVisibleSeries],
    );

    useEffect(() => {
        // `notMerge` replaces the option tree, so re-apply the brush cursor after chart option updates.
        syncBrushInteraction();
    }, [sOption, syncBrushInteraction]);

    const sOnEvents = useMemo(
        () => ({
            datazoom: (aParams: any) => {
                const sInstance = sChartRef.current?.getEchartsInstance?.();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0] ?? {};
                // ECharts can report percent-based `start/end` while the live option still keeps absolute values.
                // Merge both so the controller always receives a concrete time range.
                const sRange = extractDataZoomRange(
                    { ...sDataZoomState, ...aParams },
                    pNavigateState.panelRange,
                    pNavigateState.navigatorRange,
                );
                if (isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                pChartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'dataZoom',
                });
            },
            brushEnd: (aParams: any) => {
                const sRange = extractBrushRange(aParams);
                if (!sRange) return;

                const sInstance = sChartRef.current?.getEchartsInstance?.();
                sInstance?.dispatchAction({
                    type: 'brush',
                    areas: [],
                });

                if (sRange.endTime <= sRange.startTime) {
                    return;
                }

                // Brush drives two paths here: selection mode opens stats/FFT, otherwise it becomes drag-zoom.
                if (sIsSelectionMode) {
                    pChartHandlers.onSelection({
                        min: sRange.startTime,
                        max: sRange.endTime,
                    });
                    return;
                }

                if (!sIsDragZoomEnabled || isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                pChartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'brushZoom',
                });
            },
            legendselectchanged: (aParams: any) => {
                sVisibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
        }),
        [pChartHandlers, pNavigateState.navigatorRange, pNavigateState.panelRange, sIsDragZoomEnabled, sIsSelectionMode],
    );

    if (!pNavigateState.navigatorData?.datasets) {
        return null;
    }

    return (
        <ReactECharts
            ref={sChartRef}
            option={sOption}
            onEvents={sOnEvents}
            onChartReady={syncBrushInteraction}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: PANEL_CHART_HEIGHT }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default PanelChart;
