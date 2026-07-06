import {
    useCallback,
    useEffect,
    type MutableRefObject,
} from 'react';
import type { PanelRangeActions } from '../../../domain/panel/PanelActions';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import {
    getTimeRangeWidth,
    isValidTimeRange,
} from '../../../domain/time/TimeRangeUtils';
import type { PanelChartInstance } from '../types/PanelChartRuntimeTypes';
import { convertPanelChartPixelToTimestamp } from '../utils/PanelChartPointerUtils';

const PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR = 0.82;
const PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR = 1.22;

export function usePanelChartWheelZoom({
    chartAreaRef,
    chartInstanceRef,
    isWheelZoomEnabled,
    isNumericXAxis,
    displayPanelRange,
    applyMainZoomRange,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartInstanceRef: MutableRefObject<PanelChartInstance | undefined>;
    isWheelZoomEnabled: boolean;
    isNumericXAxis: boolean;
    displayPanelRange: TimeRangeMs;
    applyMainZoomRange: PanelRangeActions['applyMainZoomRange'];
}): void {
    const handleMouseWheelZoom = useCallback((event: WheelEvent): void => {
        if (
            event.deltaY === 0 ||
            !isWheelZoomEnabled ||
            !isValidTimeRange(displayPanelRange)
        ) {
            return;
        }

        const chartInstance = chartInstanceRef.current;
        const chartRect = chartAreaRef.current?.getBoundingClientRect();
        if (!chartInstance?.containPixel || !chartRect) {
            return;
        }

        const sPixel: [number, number] = [
            event.clientX - chartRect.left,
            event.clientY - chartRect.top,
        ];
        if (!chartInstance.containPixel({ gridIndex: 0 }, sPixel)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const sCurrentWidth = getTimeRangeWidth(displayPanelRange);
        if (sCurrentWidth <= 0) {
            return;
        }

        const sAnchorTime =
            convertPanelChartPixelToTimestamp(
                chartInstance,
                sPixel,
                isNumericXAxis,
            ).timestamp ??
            displayPanelRange.startTime + sCurrentWidth / 2;
        const sAnchorRatio =
            (sAnchorTime - displayPanelRange.startTime) / sCurrentWidth;
        const sZoomFactor = event.deltaY < 0
            ? PANEL_MOUSE_WHEEL_ZOOM_IN_FACTOR
            : PANEL_MOUSE_WHEEL_ZOOM_OUT_FACTOR;
        const sNextWidth = sCurrentWidth * sZoomFactor;
        const sNextStart = sAnchorTime - sNextWidth * sAnchorRatio;

        applyMainZoomRange({
            min: sNextStart,
            max: sNextStart + sNextWidth,
        });
    }, [
        applyMainZoomRange,
        chartAreaRef,
        chartInstanceRef,
        isWheelZoomEnabled,
        isNumericXAxis,
        displayPanelRange,
    ]);

    useEffect(() => {
        const chartArea = chartAreaRef.current;
        if (!chartArea) {
            return;
        }

        chartArea.addEventListener('wheel', handleMouseWheelZoom, {
            passive: false,
        });

        return () => {
            chartArea.removeEventListener('wheel', handleMouseWheelZoom);
        };
    }, [chartAreaRef, handleMouseWheelZoom]);
}
