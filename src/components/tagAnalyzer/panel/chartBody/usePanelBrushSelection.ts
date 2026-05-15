import type { MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';
import type {
    ChartSeriesData,
    FFTSelectionPayload,
} from '../../domain/ChartDataModel';
import type {
    PanelBrushSelectionEvent,
} from '../../domain/PanelChartModel';
import { buildSeriesSummaryRows } from '../../domain/ChartSeriesSummaryBuilder';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';

export type PanelSelectionSummary = {
    selection: FFTSelectionPayload;
    popoverPosition: { x: number; y: number };
};

export function usePanelBrushSelection({
    chartAreaRef,
    chartData,
    seriesList,
    isHighlightActive,
    onHighlightSelection,
    onSelectionSummaryChange,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartData: ChartSeriesData[];
    seriesList: PanelSeriesDefinition[];
    isHighlightActive: boolean;
    onHighlightSelection: (startTime: number, endTime: number) => void;
    onSelectionSummaryChange: (selectionSummary: PanelSelectionSummary) => void;
}) {
    function handleSelection(event: PanelBrushSelectionEvent) {
        if (event.min === undefined || event.max === undefined) {
            return false;
        }

        const startTime = Math.floor(event.min);
        const endTime = Math.ceil(event.max);

        if (isHighlightActive) {
            onHighlightSelection(startTime, endTime);
            return false;
        }

        const seriesSummaries = buildSeriesSummaryRows(
            chartData.map((series) => series.data),
            seriesList,
            event.min,
            event.max,
        );

        if (isEmpty(seriesSummaries)) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        const rect = chartAreaRef.current?.getBoundingClientRect();
        const nextSelection = { startTime, endTime, seriesSummaries };

        onSelectionSummaryChange({
            selection: nextSelection,
            popoverPosition: rect
                ? { x: rect.left - 90, y: rect.top - 35 }
                : { x: 10, y: 10 },
        });
        return false;
    }

    return {
        handleSelection,
    };
}
