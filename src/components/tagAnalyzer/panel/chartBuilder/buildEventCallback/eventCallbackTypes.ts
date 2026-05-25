import type { MutableRefObject } from 'react';
import type {
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
} from '../../../domain/PanelDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type {
    PanelChartAxisPointerPayload,
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from '../PanelChartRuntimeTypes';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
} from '../ChartInteractionTypes';

export type ChartCurrentRanges = {
    panelRange: TimeRangeMs;
    navigatorRange: TimeRangeMs;
};

export type BuildChartEventParams = {
    currentRanges: ChartCurrentRanges;
    overlayMode: PanelOverlayMode;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    rangeHandlers: PanelRangeHandlers;
    markupHandlers: PanelMarkupHandlers;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    isNumericXAxis: boolean;
    getChartInstance: () => PanelChartInstance | undefined;
    lastZoomRangeRef: MutableRefObject<TimeRangeMs>;
    applyLegendHoverState: (
        hoveredLegendSeries: string | undefined,
        force?: boolean,
    ) => void;
    setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
};

export type ChartRangeEvents = {
    datazoom: (params: EChartDataZoomEventPayload) => void;
};

export type ChartBrushEvents = {
    brushEnd: (params: EChartBrushPayload) => void;
};

export type ChartLegendEvents = {
    legendselectchanged: (params: PanelChartLegendChangePayload) => void;
    highlight: (params: PanelChartHighlightPayload) => void;
    downplay: (params: PanelChartHighlightPayload) => void;
};

export type ChartPointerEvents = {
    updateAxisPointer: (params: PanelChartAxisPointerPayload) => void;
    globalout: () => void;
};

export type ChartMarkupClickEvents = {
    click: (params: PanelChartClickPayload) => void;
};

export type ChartEvents =
    ChartRangeEvents &
    ChartBrushEvents &
    ChartLegendEvents &
    ChartPointerEvents &
    ChartMarkupClickEvents;
