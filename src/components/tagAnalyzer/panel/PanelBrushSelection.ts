import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';
import {
    PanelOverlayMode,
    type PanelRangeChangeEvent,
} from '../domain/PanelDomain';
import type {
    ChartSeriesData,
    FFTSelectionPayload,
    SelectedRangeSeriesSummary,
} from '../domain/ChartDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';

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

type PanelBrushSelectionContext = {
    chartData: ChartSeriesData[];
    seriesList: PanelSeriesDefinition[];
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    overlayMode: PanelOverlayMode;
    isNumericXAxis: boolean;
    createHighlightFromSelection: (startTime: number, endTime: number) => void;
    onSelectionSummaryChange: (selectionSummary: PanelSelectionSummary) => void;
};

export function handlePanelBrushSelection({
    chartData,
    seriesList,
    chartAreaRef,
    overlayMode,
    isNumericXAxis,
    createHighlightFromSelection,
    onSelectionSummaryChange,
}: PanelBrushSelectionContext, event: PanelRangeChangeEvent): boolean {
    const sSelectionRange = getBrushSelectionRange(event, isNumericXAxis);

    if (overlayMode === PanelOverlayMode.HIGHLIGHT) {
        createHighlightFromSelection(
            sSelectionRange.startTime,
            sSelectionRange.endTime,
        );
        return false;
    }

    const sSeriesSummaries = buildSeriesSummaryRows(
        chartData.map((series) => series.data),
        seriesList,
        sSelectionRange.min,
        sSelectionRange.max,
    );

    if (isEmpty(sSeriesSummaries)) {
        Toast.error('There is no data in the selected area.', undefined);
        return false;
    }

    const sSelection: FFTSelectionPayload = {
        startTime: sSelectionRange.startTime,
        endTime: sSelectionRange.endTime,
        seriesSummaries: sSeriesSummaries,
    };

    onSelectionSummaryChange({
        selection: sSelection,
        popoverPosition: getSelectionPopoverPosition(chartAreaRef),
    });

    return false;
}

function getBrushSelectionRange(
    event: PanelRangeChangeEvent,
    isNumericXAxis: boolean,
): BrushSelectionRange {
    return {
        min: event.min,
        max: event.max,
        startTime: isNumericXAxis ? event.min : Math.floor(event.min),
        endTime: isNumericXAxis ? event.max : Math.ceil(event.max),
    };
}

function buildSeriesSummaryRows(
    seriesDataList: Array<ChartSeriesData['data']>,
    seriesList: PanelSeriesDefinition[],
    startTime: number,
    endTime: number,
): SelectedRangeSeriesSummary[] {
    if (seriesDataList.length !== seriesList.length) {
        throw new Error(
            `Brush selection series mismatch: ${seriesDataList.length} chart series for ${seriesList.length} panel series.`,
        );
    }

    return seriesDataList.flatMap((seriesData, index) => {
        const sSeriesConfig = seriesList[index];
        if (sSeriesConfig === undefined) {
            throw new Error(`Missing series config for chart data index ${index}.`);
        }

        const sSelectedValues = seriesData
            .filter((row) => startTime <= row[0] && endTime >= row[0])
            .map((row) => row[1]);

        if (sSelectedValues.length === 0) {
            return [];
        }

        const sTotalValue = sSelectedValues.reduce(
            (runningTotal: number, value: number) => runningTotal + value,
            0,
        );

        return [{
            seriesIndex: index,
            table: sSeriesConfig.table,
            name: sSeriesConfig.sourceTagName,
            alias: sSeriesConfig.alias,
            sourceColumns: sSeriesConfig.sourceColumns,
            min: Math.min(...sSelectedValues).toFixed(5),
            max: Math.max(...sSelectedValues).toFixed(5),
            avg: (sTotalValue / sSelectedValues.length).toFixed(5),
        }];
    });
}

function getSelectionPopoverPosition(
    chartAreaRef: MutableRefObject<HTMLDivElement | null>,
): { x: number; y: number } {
    const rect = chartAreaRef.current?.getBoundingClientRect();

    if (!rect) {
        throw new Error('Cannot place selection popover without a chart area.');
    }

    return { x: rect.left - 90, y: rect.top - 35 };
}
