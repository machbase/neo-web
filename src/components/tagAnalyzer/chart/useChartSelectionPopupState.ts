import { useEffect, useState } from 'react';
import { Toast } from '@/design-system/components';
import { isEmpty } from '@/utils';
import { buildSeriesSummaryRows } from '../utils/series/SelectedRangeSeriesSummaryBuilder';
import type {
    PanelChartRefs,
    PanelNavigateState,
    PanelRangeChangeEvent,
    PanelState,
} from '../utils/panelRuntimeTypes';
import type {
    PanelSeriesConfig,
    SelectedRangeSeriesSummary,
} from '../utils/series/PanelSeriesTypes';

export type DragSelectState = {
    isOpen: boolean;
    startTime: number;
    endTime: number;
    seriesSummaries: SelectedRangeSeriesSummary[];
    menuPosition: { x: number; y: number };
};

const INITIAL_DRAG_SELECT_STATE: DragSelectState = {
    isOpen: false,
    startTime: 0,
    endTime: 0,
    seriesSummaries: [],
    menuPosition: { x: 0, y: 0 },
};

type UseChartSelectionPopupStateParams = {
    chartRefs: PanelChartRefs;
    panelState: Pick<PanelState, 'isDragSelectActive' | 'isHighlightActive'>;
    navigateState: Pick<PanelNavigateState, 'chartData'>;
    tagSet: PanelSeriesConfig[];
    onDragSelectStateChange: (isDragSelectActive: boolean, canOpenFft: boolean) => void;
    onHighlightSelection: (startTime: number, endTime: number) => void;
};

/**
 * Owns drag-select summary popup state and selection routing.
 * Intent: Keep selection workflow decisions outside the chart body render shell.
 * @param aParams The chart refs, panel state, data, tag set, and parent callbacks.
 * @returns The popup state plus selection and close handlers.
 */
export function useChartSelectionPopupState({
    chartRefs,
    panelState,
    navigateState,
    tagSet,
    onDragSelectStateChange,
    onHighlightSelection,
}: UseChartSelectionPopupStateParams) {
    const [dragSelectState, setDragSelectState] = useState(INITIAL_DRAG_SELECT_STATE);

    useEffect(() => {
        if (!panelState.isDragSelectActive) {
            setDragSelectState(INITIAL_DRAG_SELECT_STATE);
        }
    }, [panelState.isDragSelectActive]);

    /**
     * Captures the selected chart window and opens the local stats popup for that range.
     * Intent: Turn a completed brush selection into either highlight persistence or summary popup state.
     * @param event The selected chart range from the brush interaction.
     * @returns `false` to stop the chart selection handler from continuing.
     */
    function handleSelection(event: PanelRangeChangeEvent) {
        if (event.min === undefined || event.max === undefined) {
            return false;
        }

        if (panelState.isHighlightActive) {
            onHighlightSelection(Math.floor(event.min), Math.ceil(event.max));
            return false;
        }

        const sSeriesSummaries = buildSeriesSummaryRows(
            navigateState.chartData,
            tagSet,
            event.min,
            event.max
        );
        if (isEmpty(sSeriesSummaries)) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        const sRect = chartRefs.areaChart.current?.getBoundingClientRect();
        const sMenuPosition = sRect ? { x: sRect.left - 90, y: sRect.top - 35 } : { x: 10, y: 10 };

        setDragSelectState({
            isOpen: true,
            startTime: Math.floor(event.min),
            endTime: Math.ceil(event.max),
            seriesSummaries: sSeriesSummaries,
            menuPosition: sMenuPosition,
        });
        onDragSelectStateChange(true, true);
        return false;
    }

    /**
     * Clears the current drag selection and closes the summary popup.
     * Intent: Reset the temporary drag-select UI back to its idle state.
     * @returns Nothing.
     */
    const handleCloseDragSelect = () => {
        setDragSelectState(INITIAL_DRAG_SELECT_STATE);
        onDragSelectStateChange(false, false);
    };

    return {
        dragSelectState,
        handleCloseDragSelect,
        handleSelection,
    };
}
