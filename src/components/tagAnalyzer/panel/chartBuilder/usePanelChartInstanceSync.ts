import {
    useCallback,
    useEffect,
    useRef,
    type MutableRefObject,
} from 'react';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';

type UsePanelChartInstanceSyncParams = {
    isBrushActive: boolean;
    optionRevision: unknown;
    onChartReady: (instance: PanelChartInstance) => void;
};

type UsePanelChartInstanceSyncResult = {
    chartInstanceRef: MutableRefObject<PanelChartInstance | undefined>;
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

    const syncBrushInteraction = useCallback((instance?: PanelChartInstance): void => {
        const chartInstance = instance ?? chartInstanceRef.current;
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
    }, [isBrushActive]);

    const handleChartReady = (instance: PanelChartInstance): void => {
        chartInstanceRef.current = instance;
        onChartReadyRef.current(instance);
        instance.hideLoading?.();
        syncBrushInteraction(instance);
    };

    useEffect(() => {
        syncBrushInteraction();
    }, [optionRevision, syncBrushInteraction]);

    return {
        chartInstanceRef,
        handleChartReady,
    };
}
