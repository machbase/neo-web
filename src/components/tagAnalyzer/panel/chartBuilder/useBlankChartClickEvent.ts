import {
    useEffect,
    useRef,
    type MutableRefObject,
} from 'react';
import type { PanelMarkupHandlers } from '../../domain/PanelChartModel';
import type {
    PanelChartBlankClickPayload,
    PanelChartInstance,
} from './PanelChartRuntimeTypes';
import {
    convertPanelChartPixelToTimestamp,
    getPanelChartEventClientPosition,
    getPanelChartEventPixel,
    getPanelChartEventPosition,
} from './ChartPointerUtils';

export function useBlankChartClickEvent({
    chartAreaRef,
    isAnnotationActive,
    latestHoverTimestampRef,
    onOpenCreateAnnotation,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isAnnotationActive: boolean;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    onOpenCreateAnnotation: PanelMarkupHandlers['onOpenCreateAnnotation'];
}): (instance: PanelChartInstance) => void {
    const sListenerInstanceRef = useRef<PanelChartInstance | undefined>(undefined);
    const sListenerCleanupRef = useRef<(() => void) | undefined>(undefined);
    const sIsAnnotationActiveRef = useRef(isAnnotationActive);
    const sOpenCreateAnnotationRef = useRef(onOpenCreateAnnotation);

    sIsAnnotationActiveRef.current = isAnnotationActive;
    sOpenCreateAnnotationRef.current = onOpenCreateAnnotation;

    function removeBlankChartClickEvent(): void {
        sListenerCleanupRef.current?.();
        sListenerCleanupRef.current = undefined;
        sListenerInstanceRef.current = undefined;
    }

    function attachBlankChartClickEvent(instance: PanelChartInstance): void {
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
            if (!sIsAnnotationActiveRef.current || event.target) {
                return;
            }

            const sChartRect = chartAreaRef.current?.getBoundingClientRect();
            const sPixel = getPanelChartEventPixel(event, sChartRect);
            const sClientPosition = getPanelChartEventClientPosition(event);

            if (!sPixel) {
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
                convertPanelChartPixelToTimestamp(instance, sPixel).timestamp;

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
        }

        sZr.on('click', handleBlankChartClick);
        sListenerInstanceRef.current = instance;
        sListenerCleanupRef.current = () =>
            sZr.off?.('click', handleBlankChartClick);
    }

    useEffect(() => removeBlankChartClickEvent, []);

    return attachBlankChartClickEvent;
}
