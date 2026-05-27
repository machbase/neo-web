import type {
    PanelChartHighlightPayload,
    PanelChartLegendChangePayload,
} from '../PanelChartRuntimeTypes';
import type {
    ChartEvents,
} from './eventCallbackTypes';
import type { MutableRefObject } from 'react';

function isLegendHoverPayload(
    payload: PanelChartHighlightPayload | undefined,
): payload is PanelChartHighlightPayload & { excludeSeriesId: string[] } {
    return Array.isArray(payload?.excludeSeriesId);
}

export function buildLegendEvent({
    applyLegendHoverState,
    setVisibleSeries,
    visibleSeriesRef,
}: {
    applyLegendHoverState: (
        hoveredLegendSeries: string | undefined,
        force?: boolean,
    ) => void;
    setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
}): Pick<ChartEvents, 'legendselectchanged' | 'highlight' | 'downplay'> {
    return {
        legendselectchanged: (params: PanelChartLegendChangePayload) => {
            visibleSeriesRef.current = params.selected ?? {};
            setVisibleSeries(params.selected ?? {});
        },
        highlight: (params: PanelChartHighlightPayload) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(
                    params.seriesName ?? params.name ?? undefined,
                );
            }
        },
        downplay: (params: PanelChartHighlightPayload) => {
            if (isLegendHoverPayload(params)) {
                applyLegendHoverState(undefined);
            }
        },
    };
}
