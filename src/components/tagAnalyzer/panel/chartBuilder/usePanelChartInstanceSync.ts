import {
    useCallback,
    useEffect,
    useRef,
    type MutableRefObject,
} from 'react';
import {
    extractDataZoomOptionRange,
    hasExplicitDataZoomOptionRange,
} from './ChartDataZoomUtils';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';
import { isSameTimeRange } from '../../domain/time/TimeRangeUtils';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';

const TRANSPARENT_LOADING_MASK = 'rgba(0, 0, 0, 0)';

type UsePanelChartInstanceSyncParams = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
    isLoading: boolean;
    isBrushActive: boolean;
    optionRevision: unknown;
    onChartReady: (instance: PanelChartInstance) => void;
};

type UsePanelChartInstanceSyncResult = {
    getChartInstance: () => PanelChartInstance | undefined;
    handleChartReady: (instance: PanelChartInstance) => void;
    lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
};

function setEChartsLoadingState(
    instance: PanelChartInstance | undefined,
    isLoading: boolean,
): void {
    if (!instance) return;

    if (isLoading) {
        instance.showLoading?.('default', {
            text: 'Loading...',
            color: '#4199ff',
            textColor: '#d6d6d6',
            maskColor: TRANSPARENT_LOADING_MASK,
            fontSize: 12,
            showSpinner: true,
            spinnerRadius: 10,
            lineWidth: 3,
        });
        return;
    }

    instance.hideLoading?.();
}

export function usePanelChartInstanceSync({
    panelRange,
    navigatorRange,
    isLoading,
    isBrushActive,
    optionRevision,
    onChartReady,
}: UsePanelChartInstanceSyncParams): UsePanelChartInstanceSyncResult {
    const chartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const panelRangeRef = useRef(panelRange);
    const navigatorRangeRef = useRef(navigatorRange);
    const lastZoomRangeRef = useRef<TimeRangeMs>(panelRange);
    const onChartReadyRef = useRef(onChartReady);
    panelRangeRef.current = panelRange;
    navigatorRangeRef.current = navigatorRange;
    onChartReadyRef.current = onChartReady;

    const getChartInstance = useCallback((): PanelChartInstance | undefined =>
        chartInstanceRef.current, []);

    const getLivePanelRange = useCallback((
        instance: PanelChartInstance | undefined,
    ): TimeRangeMs | undefined => {
            const dataZoomState = instance?.getOption?.()?.dataZoom?.[0];
            if (!dataZoomState || !hasExplicitDataZoomOptionRange(dataZoomState)) {
                return undefined;
            }

            return extractDataZoomOptionRange(
                dataZoomState,
                panelRangeRef.current,
                navigatorRangeRef.current,
            );
        }, []);

    const syncPanelRange = useCallback((
        range: TimeRangeMs,
        instance: PanelChartInstance | undefined,
        force = false,
    ): void => {
            const chartInstance = instance ?? getChartInstance();
            if (!chartInstance) return;

            const liveRange = force ? undefined : getLivePanelRange(chartInstance);
            if (liveRange && isSameTimeRange(liveRange, range)) {
                lastZoomRangeRef.current = range;
                return;
            }

            lastZoomRangeRef.current = range;
            chartInstance.dispatchAction({
                type: 'dataZoom',
                startValue: range.startTime,
                endValue: range.endTime,
            });
    }, [getChartInstance, getLivePanelRange]);

    const syncBrushInteraction = useCallback((
        instance: PanelChartInstance | undefined,
    ): void => {
            const chartInstance = instance ?? getChartInstance();
            if (!chartInstance) return;

            if (isBrushActive) {
                chartInstance.dispatchAction({
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

            chartInstance.dispatchAction({ type: 'brush', areas: [] });
            chartInstance.dispatchAction({
                type: 'takeGlobalCursor',
                key: 'brush',
                brushOption: {
                    brushType: false,
                },
            });
    }, [getChartInstance, isBrushActive]);

    const handleChartReady = (instance: PanelChartInstance): void => {
            chartInstanceRef.current = instance;
            onChartReadyRef.current(instance);
            setEChartsLoadingState(instance, isLoading);
            syncBrushInteraction(instance);
            syncPanelRange(panelRangeRef.current, instance, true);
    };

    useEffect(() => {
        lastZoomRangeRef.current = panelRange;
    }, [panelRange]);

    useEffect(() => {
        setEChartsLoadingState(chartInstanceRef.current, isLoading);
    }, [isLoading]);

    useEffect(() => {
        syncBrushInteraction(undefined);
        syncPanelRange(lastZoomRangeRef.current, undefined, true);
    }, [optionRevision, syncBrushInteraction, syncPanelRange]);

    useEffect(() => {
        syncPanelRange(panelRange, undefined);
    }, [navigatorRange, panelRange, syncPanelRange]);

    return {
        getChartInstance,
        handleChartReady,
        lastZoomRangeRef,
    };
}
