import type {
    AxisRange,
    NumericRangeBoundary,
    NumericRangeConfig,
    PanelRangeConfig,
    TimestampRangeBoundary,
    TimestampRangeConfig,
} from '../model/TimeTypes';
import { isValidTimeRange } from '../range/TimeRangeUtils';
import {
    hasCompletePanelRangeConfig,
    isNumericRangeConfig,
    isTimestampRangeConfig,
} from '../range/PanelRangeConfigUtils';

export function resolvePanelRangeConfig(
    rangeConfig: PanelRangeConfig,
    fullRange: AxisRange,
): AxisRange | undefined {
    if (!hasCompletePanelRangeConfig(rangeConfig)) {
        return undefined;
    }

    if (isTimestampRangeConfig(rangeConfig)) {
        return resolveTimestampRangeConfig(rangeConfig, fullRange);
    }

    if (isNumericRangeConfig(rangeConfig)) {
        return resolveNumericRangeConfig(rangeConfig, fullRange);
    }

    return undefined;
}

function resolveTimestampRangeConfig(
    rangeConfig: TimestampRangeConfig,
    fullRange: AxisRange,
): AxisRange | undefined {
    const startTime = resolveTimestampBoundary(rangeConfig.start, fullRange);
    const endTime = resolveTimestampBoundary(rangeConfig.end, fullRange);

    if (startTime === undefined || endTime === undefined) {
        return undefined;
    }

    const resolvedRange = {
        startTime,
        endTime,
    };

    return isValidTimeRange(resolvedRange) ? resolvedRange : undefined;
}

function resolveTimestampBoundary(
    boundary: TimestampRangeBoundary,
    fullRange: AxisRange,
): number | undefined {
    switch (boundary.kind) {
        case 'timestamp_empty':
            return undefined;
        case 'timestamp_absolute':
            return boundary.value;
        case 'timestamp_now':
            return Date.now() + boundary.value;
        case 'timestamp_data_end':
            return fullRange.endTime + boundary.value;
    }
}

function resolveNumericRangeConfig(
    rangeConfig: NumericRangeConfig,
    fullRange: AxisRange,
): AxisRange | undefined {
    const startValue = resolveNumericBoundary(rangeConfig.start, fullRange);
    const endValue = resolveNumericBoundary(rangeConfig.end, fullRange);

    if (startValue === undefined || endValue === undefined) {
        return undefined;
    }

    const resolvedRange = {
        startTime: startValue,
        endTime: endValue,
    };
    if (!isValidTimeRange(resolvedRange)) {
        return undefined;
    }

    if (usesNumericDataAnchor(rangeConfig)) {
        return clampNumericRangeToFullRange(resolvedRange, fullRange);
    }

    return resolvedRange;
}

function clampNumericRangeToFullRange(
    range: AxisRange,
    fullRange: AxisRange,
): AxisRange {
    const rangeWidth = range.endTime - range.startTime;
    const fullRangeWidth = fullRange.endTime - fullRange.startTime;

    if (rangeWidth >= fullRangeWidth) {
        return fullRange;
    }

    if (range.startTime < fullRange.startTime) {
        return {
            startTime: fullRange.startTime,
            endTime: fullRange.startTime + rangeWidth,
        };
    }

    if (range.endTime > fullRange.endTime) {
        return {
            startTime: fullRange.endTime - rangeWidth,
            endTime: fullRange.endTime,
        };
    }

    return range;
}

function resolveNumericBoundary(
    boundary: NumericRangeBoundary,
    fullRange: AxisRange,
): number | undefined {
    switch (boundary.kind) {
        case 'numeric_empty':
            return undefined;
        case 'numeric_value':
            return boundary.value;
        case 'numeric_data_start':
            return fullRange.startTime + boundary.value;
        case 'numeric_data_end':
            return fullRange.endTime + boundary.value;
    }
}

function usesNumericDataAnchor(rangeConfig: NumericRangeConfig): boolean {
    return (
        rangeConfig.start.kind === 'numeric_data_start' ||
        rangeConfig.start.kind === 'numeric_data_end' ||
        rangeConfig.end.kind === 'numeric_data_start' ||
        rangeConfig.end.kind === 'numeric_data_end'
    );
}
