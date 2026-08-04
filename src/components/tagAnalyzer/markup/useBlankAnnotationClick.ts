import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventCoordinates,
    type PanelChartClientPosition,
} from '../chart/chartGeometry';
import type {
    PanelChartBlankClickPayload,
    PanelChartInstance,
} from '../chart/chartRuntime';

type OpenCreateAnnotation = (
    position: PanelChartClientPosition,
    seriesIndex: number | undefined,
    timestamp: number,
) => void;

export function useBlankAnnotationClick({
    chartAreaRef,
    isActive,
    isNumericXAxis,
    latestHoverTimestampRef,
    latestChartClickRef,
    onOpenCreateAnnotation,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isActive: boolean;
    isNumericXAxis: boolean;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    latestChartClickRef: MutableRefObject<number>;
    onOpenCreateAnnotation: OpenCreateAnnotation;
}): (instance: PanelChartInstance) => void {
    const sListenerInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const sOpenCreateAnnotationRef = useRef(onOpenCreateAnnotation);
    sOpenCreateAnnotationRef.current = onOpenCreateAnnotation;

    const removeBlankChartClickEvent = useCallback((): void => {
        sListenerCleanupRef.current?.();
        sListenerCleanupRef.current = undefined;
        sListenerInstanceRef.current = undefined;
    }, []);

    const attachBlankChartClickEvent = useCallback((instance: PanelChartInstance): void => {
        if (
            sListenerInstanceRef.current === instance &&
            sListenerCleanupRef.current
        ) {
            return;
        }

        removeBlankChartClickEvent();

        const sZr = instance.getZr?.();
        if (!sZr?.on || !sZr.off) {
            return;
        }

        function handleBlankChartClick(event: PanelChartBlankClickPayload): void {
            if (!isActive) {
                return;
            }

            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const { pixel: sPixel, position: sPosition } =
                getPanelChartEventCoordinates(event, sChartRect);
            const sChartClickSequence = latestChartClickRef.current;

            if (!sPixel || !sPosition) {
                return;
            }

            window.setTimeout(() => {
                if (latestChartClickRef.current !== sChartClickSequence) {
                    return;
                }

                if (
                    instance.containPixel &&
                    !instance.containPixel({ gridIndex: 0 }, sPixel)
                ) {
                    return;
                }

                const sTimestamp =
                    latestHoverTimestampRef.current ??
                    convertPanelChartPixelToTimestamp(
                        instance,
                        sPixel,
                        isNumericXAxis,
                    );

                if (sTimestamp === undefined) {
                    return;
                }

                sOpenCreateAnnotationRef.current(
                    sPosition,
                    undefined,
                    sTimestamp,
                );
            }, 0);
        }

        sZr.on('click', handleBlankChartClick);
        sListenerInstanceRef.current = instance;
        sListenerCleanupRef.current = () =>
            sZr.off?.('click', handleBlankChartClick);
    }, [
        chartAreaRef,
        isActive,
        isNumericXAxis,
        latestChartClickRef,
        latestHoverTimestampRef,
        removeBlankChartClickEvent,
    ]);

    useEffect(() => {
        const sListenerInstance = sListenerInstanceRef.current;
        if (!sListenerInstance) {
            return;
        }

        removeBlankChartClickEvent();
        attachBlankChartClickEvent(sListenerInstance);
    }, [attachBlankChartClickEvent, removeBlankChartClickEvent]);

    useEffect(() => removeBlankChartClickEvent, [removeBlankChartClickEvent]);

    return attachBlankChartClickEvent;
}
