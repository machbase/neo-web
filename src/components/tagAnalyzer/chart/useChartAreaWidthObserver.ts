import { useEffect, useRef, type MutableRefObject } from 'react';

export function useChartAreaWidthObserver(
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
    onWidthChange: (width: number | undefined) => void,
): void {
    const onWidthChangeRef = useRef(onWidthChange);
    onWidthChangeRef.current = onWidthChange;

    useEffect(() => {
        const chartArea = chartAreaRef.current;
        if (!chartArea) {
            onWidthChangeRef.current(undefined);
            return;
        }

        let lastWidth: number | undefined;
        function updateWidth(): void {
            const nextWidth = chartArea!.clientWidth || undefined;
            if (nextWidth === lastWidth) return;

            lastWidth = nextWidth;
            onWidthChangeRef.current(nextWidth);
        }

        updateWidth();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        const observer = new ResizeObserver(updateWidth);
        observer.observe(chartArea);
        return () => observer.disconnect();
    }, [chartAreaRef]);
}
