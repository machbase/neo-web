import {
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

    function getChartInstance(): PanelChartInstance | undefined {
        return chartInstanceRef.current;
    }

    function syncBrushInteraction(instance?: PanelChartInstance): void {
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
    }

    const handleChartReady = (instance: PanelChartInstance): void => {
        chartInstanceRef.current = instance;
        onChartReadyRef.current(instance);
        instance.hideLoading?.();
        syncBrushInteraction(instance);
    };

    useEffect(() => {
        syncBrushInteraction();
    }, [optionRevision, isBrushActive]);

    return {
        getChartInstance,
        handleChartReady,
    };
}
