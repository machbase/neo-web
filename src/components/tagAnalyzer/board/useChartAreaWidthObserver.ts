import {
    useEffect,
    type MutableRefObject,
} from 'react';

export function useChartAreaWidthObserver(
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    onWidthChange: (width: number | undefined) => void,
): void {
    useEffect(() => {
        const sChartArea = chartAreaRef.current;
        if (!sChartArea) {
            onWidthChange(undefined);
            return undefined;
        }

        let sLastWidth: number | undefined;
        const updateChartAreaWidth = (): void => {
            const sWidth = sChartArea.clientWidth;
            const sNextWidth = sWidth > 0 ? sWidth : undefined;

            if (sNextWidth === sLastWidth) {
                return;
            }

            sLastWidth = sNextWidth;
            onWidthChange(sNextWidth);
        };

        updateChartAreaWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateChartAreaWidth);
            return () => window.removeEventListener('resize', updateChartAreaWidth);
        }

        const sResizeObserver = new ResizeObserver(updateChartAreaWidth);
        sResizeObserver.observe(sChartArea);

        return () => sResizeObserver.disconnect();
    }, [chartAreaRef, onWidthChange]);
}
