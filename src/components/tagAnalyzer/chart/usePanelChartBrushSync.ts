import { useCallback } from 'react';
import type { ChartInstance } from './ChartRuntimeTypes';

type UsePanelChartBrushSyncParams = {
    getChartInstance: () => ChartInstance | undefined;
    isBrushActive: boolean;
};

/**
 * Synchronizes ECharts brush cursor state with panel interaction mode.
 * Intent: Keep brush command details outside the chart render component.
 * @param aParams The chart instance getter and current brush-active flag.
 * @returns The brush synchronization callback.
 */
export function usePanelChartBrushSync({
    getChartInstance,
    isBrushActive,
}: UsePanelChartBrushSyncParams) {
    return useCallback(
        (aInstance: ChartInstance | undefined) => {
            const sInstance = aInstance ?? getChartInstance();
            if (!sInstance) return;

            if (isBrushActive) {
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
                    brushMode: undefined,
                    xAxisIndex: undefined,
                },
            });
        },
        [getChartInstance, isBrushActive],
    );
}
