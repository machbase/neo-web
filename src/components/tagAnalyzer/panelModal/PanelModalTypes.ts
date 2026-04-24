import type { ContextMenuPosition } from '@/design-system/components';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';

export type HighlightRenameState = {
    isOpen: boolean;
    highlightIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
};

export type SeriesAnnotationPopoverState = {
    isOpen: boolean;
    seriesIndex: number | undefined;
    annotationIndex: number | undefined;
    position: ContextMenuPosition;
    labelText: string;
    timeRange: TimeRangeMs | undefined;
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

export type HighlightRenamePopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onClose: () => void;
};

export type SeriesAnnotationPopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    labelText: string;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onDelete: () => void;
    onClose: () => void;
};

export type CreateSeriesAnnotationPopoverProps = {
    isOpen: boolean;
    position: ContextMenuPosition;
    seriesOptions: Array<{
        label: string;
        value: string;
    }>;
    selectedSeriesValue: string;
    yearText: string;
    monthText: string;
    dayText: string;
    labelText: string;
    onSeriesValueChange: (aValue: string) => void;
    onYearTextChange: (aValue: string) => void;
    onMonthTextChange: (aValue: string) => void;
    onDayTextChange: (aValue: string) => void;
    onLabelTextChange: (aValue: string) => void;
    onApply: () => void;
    onClose: () => void;
};
