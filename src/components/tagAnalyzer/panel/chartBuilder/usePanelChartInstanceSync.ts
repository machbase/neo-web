import {
    useCallback,
    useEffect,
    useRef,
} from 'react';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';

type UsePanelChartInstanceSyncParams = {
    isBrushActive: boolean;
    optionRevision: unknown;
    onChartReady: (instance: PanelChartInstance) => void;
};

type UsePanelChartInstanceSyncResult = {
    getChartInstance: () => PanelChartInstance | undefined;
    handleChartReady: (instance: PanelChartInstance) => void;
};

export function usePanelChartInstanceSync({
    isBrushActive,
    optionRevision,
    onChartReady,
}: UsePanelChartInstanceSyncParams): UsePanelChartInstanceSyncResult {
    const chartInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const onChartReadyRef = useRef(onChartReady);
    onChartReadyRef.current = onChartReady;

    const getChartInstance = useCallback((): PanelChartInstance | undefined =>
        chartInstanceRef.current, []);

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
            instance.hideLoading?.();
            syncBrushInteraction(instance);
    };

    useEffect(() => {
        syncBrushInteraction(undefined);
    }, [optionRevision, syncBrushInteraction]);

    return {
        getChartInstance,
        handleChartReady,
    };
}
