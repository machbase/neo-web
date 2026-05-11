import { useEffect, useState, type MutableRefObject } from 'react';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';
import type { FFTSelectionPayload } from '../../boardModal/BoardModalTypes';
import type { ChartSeriesData } from '../../chart/ChartTypes';
import { buildSeriesSummaryRows } from '../../chart/ChartSeriesSummaryBuilder';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import type { SelectionSummaryPopoverState } from '../modal/SelectionSummaryPopover';

const INITIAL_SELECTION_POPOVER_STATE: SelectionSummaryPopoverState = {
    isOpen: false,
    menuPosition: { x: 0, y: 0 },
};

export type PanelBrushSelectionEvent = {
    min?: number;
    max?: number;
};

export function usePanelBrushSelection({
    chartAreaRef,
    chartData,
    seriesList,
    isHighlightActive,
    isDragSelectActive,
    onCloseHighlight,
    onDragSelectStateChange,
    onHighlightSelection,
    onFftSelectionChange,
}: {
    chartAreaRef: MutableRefObject<HTMLDivElement | null>;
    chartData: ChartSeriesData[];
    seriesList: PanelSeriesDefinition[];
    isHighlightActive: boolean;
    isDragSelectActive: boolean;
    onCloseHighlight: () => void;
    onDragSelectStateChange: (isDragSelectActive: boolean) => void;
    onHighlightSelection: (startTime: number, endTime: number) => void;
    onFftSelectionChange?: (selection: FFTSelectionPayload | undefined) => void;
}) {
    const [selection, setSelection] = useState<FFTSelectionPayload | undefined>();
    const [popoverState, setPopoverState] =
        useState<SelectionSummaryPopoverState>(INITIAL_SELECTION_POPOVER_STATE);

    useEffect(() => {
        if (isDragSelectActive) return;

        setSelection(undefined);
        setPopoverState(INITIAL_SELECTION_POPOVER_STATE);
        onFftSelectionChange?.(undefined);
    }, [isDragSelectActive, onFftSelectionChange]);

    function handleSelection(event: PanelBrushSelectionEvent) {
        if (event.min === undefined || event.max === undefined) {
            return false;
        }

        const startTime = Math.floor(event.min);
        const endTime = Math.ceil(event.max);

        if (isHighlightActive) {
            onHighlightSelection(startTime, endTime);
            onCloseHighlight();
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

        setSelection(nextSelection);
        setPopoverState({
            isOpen: true,
            menuPosition: rect ? { x: rect.left - 90, y: rect.top - 35 } : { x: 10, y: 10 },
        });
        onDragSelectStateChange(true);
        onFftSelectionChange?.(nextSelection);
        return false;
    }

    function handleCloseSelection() {
        setSelection(undefined);
        setPopoverState(INITIAL_SELECTION_POPOVER_STATE);
        onDragSelectStateChange(false);
        onFftSelectionChange?.(undefined);
    }

    return {
        selection,
        selectionPopoverState: popoverState,
        handleSelection,
        handleCloseSelection,
    };
}
