import type { ContextMenuPosition } from '@/design-system/components';
import type {
    PanelChartHandle,
    PanelContextMenuActions,
    PanelContextMenuViewState,
} from '../PanelTypes';
import type { ResolvedTimeRangeMs } from '../../time/TimeTypes';
import type { ChartSeriesData } from '../../chart/ChartTypes';
import type { MutableRefObject } from 'react';

export type PanelContextMenuState = {
    isOpen: boolean;
    position: ContextMenuPosition;
};

export type HighlightRenameState = {
    isOpen: boolean;
    highlightIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
    fillColor: string;
    textColor: string;
};

export type SeriesAnnotationPopoverState = {
    isOpen: boolean;
    seriesIndex: number | undefined;
    annotationIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
    timeRange: ResolvedTimeRangeMs | undefined;
};

export type CreateSeriesAnnotationPopoverState = {
    isOpen: boolean;
    position: ContextMenuPosition;
    seriesIndex: number | undefined;
    yearText: string;
    monthText: string;
    dayText: string;
    labelText: string;
};

export type CreateAnnotationOverlay = {
    state: CreateSeriesAnnotationPopoverState;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    actions: {
        updateSeriesValue: (value: string) => void;
        updateYearText: (value: string) => void;
        updateMonthText: (value: string) => void;
        updateDayText: (value: string) => void;
        updateLabelText: (value: string) => void;
        apply: () => void;
        close: () => void;
    };
};

export type ContextMenuOverlay = {
    state: PanelContextMenuState;
    viewState: PanelContextMenuViewState;
    actions: PanelContextMenuActions;
    onClose: () => void;
};

export type HighlightRenameOverlay = {
    state: HighlightRenameState;
    actions: {
        updateLabelText: (labelText: string) => void;
        updateFillColor: (fillColor: string) => void;
        updateTextColor: (textColor: string) => void;
        apply: () => void;
        close: () => void;
    };
};

export type EditAnnotationOverlay = {
    state: SeriesAnnotationPopoverState;
    actions: {
        updateLabelText: (value: string) => void;
        apply: () => void;
        deleteAnnotation: () => void;
        close: () => void;
    };
};

export type DeletePanelOverlay = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

export type ExportCsvOverlay = {
    isOpen: boolean;
    chartData: ChartSeriesData[];
    chartRef: MutableRefObject<PanelChartHandle | null>;
    onClose: () => void;
};
