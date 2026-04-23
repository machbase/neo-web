import type { MutableRefObject } from 'react';
import type { PanelHighlight } from '../utils/panelModelTypes';
import type { PanelChartInstance } from './PanelChartRuntimeTypes';

/**
 * Resolves which saved highlight contains the requested client position.
 * Intent: Keep DOM geometry and ECharts pixel conversion outside the chart render component.
 * @param aParams The chart ref, instance, highlights, and client position to test.
 * @returns The matched highlight index, or undefined when no highlight contains the position.
 */
export function getHighlightIndexAtClientPosition({
    areaChartRef,
    chartInstance,
    highlights,
    clientX,
    clientY,
}: {
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartInstance: PanelChartInstance | undefined;
    highlights: PanelHighlight[];
    clientX: number;
    clientY: number;
}): number | undefined {
    const sChartRect = areaChartRef.current?.getBoundingClientRect();

    if (!sChartRect || !chartInstance?.containPixel || !chartInstance?.convertFromPixel) {
        return undefined;
    }

    const sPixelX = clientX - sChartRect.left;
    const sPixelY = clientY - sChartRect.top;
    if (
        !Number.isFinite(sPixelX) ||
        !Number.isFinite(sPixelY) ||
        !chartInstance.containPixel({ gridIndex: 0 }, [sPixelX, sPixelY])
    ) {
        return undefined;
    }

    const sConvertedValue = chartInstance.convertFromPixel(
        { xAxisIndex: 0 },
        [sPixelX, sPixelY],
    );
    const sTimeValue = Array.isArray(sConvertedValue)
        ? Number(sConvertedValue[0])
        : Number(sConvertedValue);

    if (!Number.isFinite(sTimeValue)) {
        return undefined;
    }

    return highlights.findIndex(
        (aHighlight) =>
            aHighlight.timeRange.startTime <= sTimeValue &&
            sTimeValue <= aHighlight.timeRange.endTime,
    );
}
