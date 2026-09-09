import type { MutableRefObject } from 'react';
import type { AxisRange } from '../rangeExpression/rangeModel';
import type { ChartSeriesData } from './chartData';

export type ChartRangeState = {
    mainRange: AxisRange;
    navigatorRange: AxisRange;
};

export enum PanelOverlayMode {
    NO_OVERLAY = 'noOverlay',
    HIGHLIGHT = 'highlight',
    ANNOTATION = 'annotation',
    DRAG_SELECT = 'dragSelect',
}

export type PanelChartHandle = {
    getVisibleSeries: () => Array<{ name: string; visible: boolean }>;
    isPointInsideMainGrid: (clientX: number, clientY: number) => boolean;
};

export type PanelChartClientPosition = {
    x: number;
    y: number;
};

export type PanelChartHandlers = {
    rangeActions: {
        setMainRange: (range: AxisRange) => void;
        shiftMainRangeLeft: () => void;
        shiftMainRangeRight: () => void;
    };
    markupHandlers: {
        onOpenCreateAnnotation: (
            position: PanelChartClientPosition,
            seriesIndex: number | undefined,
            timestamp: number,
        ) => void;
        onActivateHighlightEditor: (
            position: PanelChartClientPosition,
            highlightIndex: number,
        ) => void;
        onActivateAnnotationEditor: (
            position: PanelChartClientPosition,
            annotationIndex: number,
        ) => void;
    };
    onHoveredMainSeriesChange: (seriesName: string | undefined) => void;
    onSelection: (selectionRange: AxisRange) => void;
};

export type PanelChartData = {
    chartData: ChartSeriesData[];
    navigatorChartData: ChartSeriesData[];
};

export type ChartValueRange = {
    min: number | undefined;
    max: number | undefined;
};

export type ChartYAxis = {
    zeroBase: boolean;
    showTickline: boolean;
    valueRange: ChartValueRange;
    upperControlLimit: { enabled: boolean; value: number };
    lowerControlLimit: { enabled: boolean; value: number };
};

export type ChartSeriesPresentation = {
    key: string;
    yAxis: 0 | 1;
    color: string;
};

export type ChartHighlight = {
    range: AxisRange;
    text: string;
    fillColor: string;
    textColor: string;
};

export type ChartAnnotation = {
    seriesKey: string;
    anchorTime: number;
    text: string;
    fillColor: string;
    textColor: string;
    clip: boolean;
};

export type ChartPresentation = {
    title: string;
    isNumericXAxis: boolean;
    normalizeRightAxis: boolean;
    series: ChartSeriesPresentation[];
    highlights: ChartHighlight[];
    annotations: ChartAnnotation[];
    axes: {
        x: { showTickline: boolean };
        leftY: ChartYAxis;
        rightY: ChartYAxis;
        rightYEnabled: boolean;
    };
    display: {
        showLegend: boolean;
        showPoint: boolean;
        connectNulls: boolean;
        useZoom: boolean;
        pointRadius: number;
        fill: number;
        stroke: number;
    };
};

export type PanelChartProps = {
    presentation: ChartPresentation;
    isLoading: boolean;
    rangeState: ChartRangeState | undefined;
    displayNotice: string | undefined;
    refs: {
        chartAreaRef: MutableRefObject<HTMLDivElement | null>;
        chartApiRef: MutableRefObject<PanelChartHandle | null>;
    };
    draftHighlight?: ChartHighlight;
    overlayMode: PanelOverlayMode;
    data: PanelChartData;
    handlers: PanelChartHandlers;
};
