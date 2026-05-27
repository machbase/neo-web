import type { MutableRefObject } from 'react';
import type {
    PanelBrushSelectionEvent,
    PanelMarkupHandlers,
    PanelOverlayMode,
    PanelRangeHandlers,
} from '../../../domain/PanelDomain';
import type { TimeRangeMs } from '../../../domain/time/TimeTypes';
import type {
    EChartBrushPayload,
    EChartDataZoomEventPayload,
    PanelChartAxisPointerPayload,
    PanelChartClickPayload,
    PanelChartHighlightPayload,
    PanelChartInstance,
    PanelChartLegendChangePayload,
} from '../PanelChartRuntimeTypes';

export type BuildChartEventParams = {
    currentRanges: {
        panelRange: TimeRangeMs;
        navigatorRange: TimeRangeMs;
    };
    overlayMode: PanelOverlayMode;
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    rangeHandlers: PanelRangeHandlers;
    markupHandlers: PanelMarkupHandlers;
    onSelection: (event: PanelBrushSelectionEvent) => unknown;
    isSelectionMode: boolean;
    isDragZoomEnabled: boolean;
    isNumericXAxis: boolean;
    getChartInstance: () => PanelChartInstance | undefined;
    applyLegendHoverState: (
        hoveredLegendSeries: string | undefined,
        force?: boolean,
    ) => void;
    setVisibleSeries: (visibleSeries: Record<string, boolean>) => void;
    visibleSeriesRef: MutableRefObject<Record<string, boolean>>;
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
};

export type ChartEvents = {
    datazoom: (params: EChartDataZoomEventPayload) => void;
    brushEnd: (params: EChartBrushPayload) => void;
    legendselectchanged: (params: PanelChartLegendChangePayload) => void;
    highlight: (params: PanelChartHighlightPayload) => void;
    downplay: (params: PanelChartHighlightPayload) => void;
    updateAxisPointer: (params: PanelChartAxisPointerPayload) => void;
    globalout: () => void;
    click: (params: PanelChartClickPayload) => void;
};
