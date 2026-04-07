import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPanelChartOption, buildDefaultVisibleSeriesMap, buildVisibleSeriesList, extractBrushRange, extractDataZoomRange } from './PanelEChartUtil';
import type { PanelChartHandle, PanelChartHandlers, PanelChartRefs, PanelChartState, PanelNavigateState } from './TagAnalyzerPanelTypes';
import type { TagAnalyzerTimeRange } from './TagAnalyzerPanelModelTypes';

const isSameTimeRange = (aLeft: TagAnalyzerTimeRange, aRight: TagAnalyzerTimeRange) => {
    return aLeft.startTime === aRight.startTime && aLeft.endTime === aRight.endTime;
};

// Displays the main panel graph and its navigator/scroll area.
// It assembles the ECharts option tree, keeps the zoom window in sync, and forwards chart interactions back up.
const NewEChart = ({
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

    useEffect(() => {
        const sInstance = sChartRef.current?.getEchartsInstance?.();
        if (!sInstance) return;

        if (pPanelState.isDragSelectActive) {
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
    }, [pPanelState.isDragSelectActive]);

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

    const sOnEvents = useMemo(
        () => ({
            datazoom: (aParams: any) => {
                const sInstance = sChartRef.current?.getEchartsInstance?.();
                const sDataZoomState = sInstance?.getOption?.()?.dataZoom?.[0] ?? {};
                const sRange = extractDataZoomRange({ ...sDataZoomState, ...aParams }, pNavigateState.panelRange);
                if (isSameTimeRange(sRange, sLastZoomRangeRef.current)) {
                    return;
                }

                sLastZoomRangeRef.current = sRange;
                pChartHandlers.onSetExtremes({
                    min: sRange.startTime,
                    max: sRange.endTime,
                    trigger: 'zoom',
                });
            },
            brushSelected: (aParams: any) => {
                const sRange = extractBrushRange(aParams);
                if (!sRange) return;

                pChartHandlers.onSelection({
                    min: sRange.startTime,
                    max: sRange.endTime,
                });

                const sInstance = sChartRef.current?.getEchartsInstance?.();
                sInstance?.dispatchAction({
                    type: 'brush',
                    areas: [],
                });
            },
            legendselectchanged: (aParams: any) => {
                sVisibleSeriesRef.current = aParams.selected ?? {};
                setVisibleSeries(aParams.selected ?? {});
            },
        }),
        [pChartHandlers, pNavigateState.panelRange],
    );

    if (!pNavigateState.navigatorData?.datasets) {
        return null;
    }

    return (
        <ReactECharts
            ref={sChartRef}
            option={sOption}
            onEvents={sOnEvents}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: 300 }}
            opts={{ renderer: 'canvas' }}
        />
    );
};

export default NewEChart;
