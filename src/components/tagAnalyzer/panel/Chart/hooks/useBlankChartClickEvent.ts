import {
    useCallback,
    useEffect,
    useRef,
    type MutableRefObject,
} from 'react';
import type { PanelMarkupHandlers } from '../../../domain/PanelDomain';
import type {
    PanelChartBlankClickPayload,
    PanelChartInstance,
} from '../types/PanelChartRuntimeTypes';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventClientPosition,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
} from '../utils/PanelChartPointerUtils';

export function useBlankChartClickEvent({
    chartAreaRef,
    isAnnotationActive,
    isNumericXAxis,
    latestHoverTimestampRef,
    latestChartClickRef,
    onOpenCreateAnnotation,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isAnnotationActive: boolean;
    isNumericXAxis: boolean;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    latestChartClickRef: MutableRefObject<number>;
    onOpenCreateAnnotation: PanelMarkupHandlers['onOpenCreateAnnotation'];
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
            if (!isAnnotationActive) {
                return;
            }

            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const sPixel = getPanelChartEventPixel(event, sChartRect);
            const sClientPosition = getPanelChartEventClientPosition(event);
            const sChartClickSequence = latestChartClickRef.current;

            if (!sPixel) {
                return;
            }

            window.setTimeout(() => {
                if (latestChartClickRef.current !== sChartClickSequence) {
                    return;
                }

                const sIsInsideMainGrid = instance.containPixel
                    ? instance.containPixel({ gridIndex: 0 }, sPixel)
                    : true;

                if (!sIsInsideMainGrid) {
                    return;
                }

                const sTimestamp =
                    latestHoverTimestampRef.current ??
                    convertPanelChartPixelToTimestamp(
                        instance,
                        sPixel,
                        isNumericXAxis,
                    ).timestamp;

                if (sTimestamp === undefined) {
                    return;
                }

                sOpenCreateAnnotationRef.current(
                    getPanelChartEventPosition(
                        event,
                        sChartRect,
                        sPixel,
                        sClientPosition,
                    ),
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
        isAnnotationActive,
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
