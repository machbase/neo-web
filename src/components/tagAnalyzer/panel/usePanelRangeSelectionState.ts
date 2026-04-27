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

export type PanelRangeSelectionState = {
    isOpen: boolean;
    startTime: number;
    endTime: number;
    seriesSummaries: SelectedRangeSeriesSummary[];
    menuPosition: { x: number; y: number };
};

const INITIAL_PANEL_RANGE_SELECTION_STATE: PanelRangeSelectionState = {
    isOpen: false,
    startTime: 0,
    endTime: 0,
    seriesSummaries: [],
    menuPosition: { x: 0, y: 0 },
};

type UsePanelRangeSelectionStateParams = {
    chartRefs: PanelChartRefs;
    panelState: Pick<PanelState, 'isDragSelectActive' | 'isHighlightActive'>;
    navigateState: Pick<PanelNavigateState, 'chartData'>;
    tagSet: PanelSeriesConfig[];
    onDragSelectStateChange: (isDragSelectActive: boolean, canOpenFft: boolean) => void;
    onHighlightSelection: (startTime: number, endTime: number) => void;
};

export function usePanelRangeSelectionState({
    chartRefs,
    panelState,
    navigateState,
    tagSet,
    onDragSelectStateChange,
    onHighlightSelection,
}: UsePanelRangeSelectionStateParams) {
    const [selectionState, setSelectionState] = useState(INITIAL_PANEL_RANGE_SELECTION_STATE);

    useEffect(() => {
        if (!panelState.isDragSelectActive) {
            setSelectionState(INITIAL_PANEL_RANGE_SELECTION_STATE);
        }
    }, [panelState.isDragSelectActive]);

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
            event.max,
        );
        if (isEmpty(sSeriesSummaries)) {
            Toast.error('There is no data in the selected area.', undefined);
            return false;
        }

        const sRect = chartRefs.areaChart.current?.getBoundingClientRect();
        const sMenuPosition = sRect ? { x: sRect.left - 90, y: sRect.top - 35 } : { x: 10, y: 10 };

        setSelectionState({
            isOpen: true,
            startTime: Math.floor(event.min),
            endTime: Math.ceil(event.max),
            seriesSummaries: sSeriesSummaries,
            menuPosition: sMenuPosition,
        });
        onDragSelectStateChange(true, true);
        return false;
    }

    const handleCloseSelection = () => {
        setSelectionState(INITIAL_PANEL_RANGE_SELECTION_STATE);
        onDragSelectStateChange(false, false);
    };

    return {
        selectionState,
        handleCloseSelection,
        handleSelection,
    };
}
