import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';
import type {
    ChartSeriesData,
    FFTSelectionPayload,
} from '../domain/ChartDataModel';
import type { PanelBrushSelectionEvent } from '../domain/PanelChartModel';
import { buildSeriesSummaryRows } from '../domain/ChartSeriesSummaryBuilder';
import type { PanelSeriesDefinition } from '../domain/SeriesModel';

export type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: { x: number; y: number };
};

type BrushSelectionRange = {
    min: number;
    max: number;
    startTime: number;
    endTime: number;
};

export function createPanelBrushSelectionHandler({
    chartData,
    seriesList,
    chartAreaRef,
    isHighlightActive,
    createHighlightFromSelection,
    closeContextMenu,
    closeAnnotationMode,
    onSelectionSummaryChange,
}: {
    chartData: ChartSeriesData[];
    seriesList: PanelSeriesDefinition[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    isHighlightActive: boolean;
    createHighlightFromSelection: (startTime: number, endTime: number) => void;
    closeContextMenu: () => void;
    closeAnnotationMode: () => void;
    onSelectionSummaryChange: (selectionSummary: PanelSelectionSummary) => void;
}): (event: PanelBrushSelectionEvent) => boolean {
    return function handlePanelBrushSelection(
        event: PanelBrushSelectionEvent,
    ): boolean {
        const sSelectionRange = getBrushSelectionRange(event);

        if (!sSelectionRange) {
            return false;
        }

        if (isHighlightActive) {
            closeContextMenu();
            closeAnnotationMode();
            createHighlightFromSelection(
                sSelectionRange.startTime,
                sSelectionRange.endTime,
            );
            return false;
        }

        const sSelection = buildBrushSelectionSummary(
            chartData,
            seriesList,
            sSelectionRange,
        );

        if (!sSelection) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        onSelectionSummaryChange({
            selection: sSelection,
            popoverPosition: getSelectionPopoverPosition(chartAreaRef),
        });
        return false;
    };
}

function getBrushSelectionRange(
    event: PanelBrushSelectionEvent,
): BrushSelectionRange | undefined {
    if (event.min === undefined || event.max === undefined) {
        return undefined;
    }

    return {
        min: event.min,
        max: event.max,
        startTime: Math.floor(event.min),
        endTime: Math.ceil(event.max),
    };
}

function buildBrushSelectionSummary(
    chartData: ChartSeriesData[],
    seriesList: PanelSeriesDefinition[],
    range: BrushSelectionRange,
): FFTSelectionPayload | undefined {
    const seriesSummaries = buildSeriesSummaryRows(
        chartData.map((series) => series.data),
        seriesList,
        range.min,
        range.max,
    );

    if (isEmpty(seriesSummaries)) {
        return undefined;
    }

    return {
        startTime: range.startTime,
        endTime: range.endTime,
        seriesSummaries,
    };
}

function getSelectionPopoverPosition(
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
): { x: number; y: number } {
    const rect = chartAreaRef.current?.getBoundingClientRect();

    return rect
        ? { x: rect.left - 90, y: rect.top - 35 }
        : { x: 10, y: 10 };
}
