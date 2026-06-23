import { getTimeUnitMilliseconds } from '../interval/TimeIntervalUtils';
import type {
    NumericRangeBoundary,
    NumericRangeInput,
    PanelRangeBoundary,
    PanelRangeInput,
    TimeBoundary,
    TimestampRangeBoundary,
    TimestampRangeInput,
} from '../model/TimeTypes';

export function createTimestampRangeInput(
    start: TimestampRangeBoundary,
    end: TimestampRangeBoundary,
): TimestampRangeInput {
    return {
        start,
        end,
    };
}

export function createNumericRangeInput(
    start: NumericRangeBoundary,
    end: NumericRangeBoundary,
): NumericRangeInput {
    return {
        start,
        end,
    };
}

export function createTimestampRangeBoundary(
    kind: TimestampRangeBoundary['kind'],
    value = 0,
): TimestampRangeBoundary {
    return { kind, value } as TimestampRangeBoundary;
}

export function createNumericRangeBoundary(
    kind: NumericRangeBoundary['kind'],
    value = 0,
): NumericRangeBoundary {
    return { kind, value } as NumericRangeBoundary;
}

export function isTimestampRangeInput(
    rangeConfig: PanelRangeInput,
): rangeConfig is TimestampRangeInput {
    return isTimestampRangeBoundary(rangeConfig.start) &&
        isTimestampRangeBoundary(rangeConfig.end);
}

export function isNumericRangeInput(
    rangeConfig: PanelRangeInput,
): rangeConfig is NumericRangeInput {
    return isNumericRangeBoundary(rangeConfig.start) &&
        isNumericRangeBoundary(rangeConfig.end);
}

export function isTimestampRangeBoundaryKind(
    kind: unknown,
): kind is TimestampRangeBoundary['kind'] {
    return (
        kind === 'timestamp_empty' ||
        kind === 'timestamp_absolute' ||
        kind === 'timestamp_now' ||
        kind === 'timestamp_data_end'
    );
}

export function isNumericRangeBoundaryKind(
    kind: unknown,
): kind is NumericRangeBoundary['kind'] {
    return (
        kind === 'numeric_empty' ||
        kind === 'numeric_value' ||
        kind === 'numeric_data_start' ||
        kind === 'numeric_data_end'
    );
}

export function isTimestampRangeBoundary(
    boundary: PanelRangeBoundary,
): boundary is TimestampRangeBoundary {
    return isTimestampRangeBoundaryKind(boundary.kind);
}

export function isNumericRangeBoundary(
    boundary: PanelRangeBoundary,
): boundary is NumericRangeBoundary {
    return isNumericRangeBoundaryKind(boundary.kind);
}

export function isEmptyPanelRangeBoundary(
    boundary: PanelRangeBoundary,
): boolean {
    return (
        boundary.kind === 'timestamp_empty' ||
        boundary.kind === 'numeric_empty'
    );
}

export function isEmptyPanelRangeInput(
    rangeConfig: PanelRangeInput,
): boolean {
    return isEmptyPanelRangeBoundary(rangeConfig.start) &&
        isEmptyPanelRangeBoundary(rangeConfig.end);
}

export function hasCompletePanelRangeInput(
    rangeConfig: PanelRangeInput,
): boolean {
    return !isEmptyPanelRangeBoundary(rangeConfig.start) &&
        !isEmptyPanelRangeBoundary(rangeConfig.end);
}

export function createTimestampRangeBoundaryFromTimeBoundary(
    boundary: TimeBoundary,
): TimestampRangeBoundary {
    switch (boundary.kind) {
        case 'empty':
            return createTimestampRangeBoundary('timestamp_empty');
        case 'absolute':
            return createTimestampRangeBoundary(
                'timestamp_absolute',
                boundary.timestamp,
            );
        case 'now':
            return createTimestampRangeBoundary(
                'timestamp_now',
                -getTimeUnitMilliseconds(boundary.unit, boundary.amount),
            );
        case 'last':
            return createTimestampRangeBoundary(
                'timestamp_data_end',
                -getTimeUnitMilliseconds(boundary.unit, boundary.amount),
            );
    }
}

export function clonePanelRangeInput(
    rangeConfig: PanelRangeInput,
): PanelRangeInput {
    if (isTimestampRangeInput(rangeConfig)) {
        return createTimestampRangeInput(
            createTimestampRangeBoundary(
                rangeConfig.start.kind,
                rangeConfig.start.value,
            ),
            createTimestampRangeBoundary(
                rangeConfig.end.kind,
                rangeConfig.end.value,
            ),
        );
    }

    if (isNumericRangeInput(rangeConfig)) {
        return createNumericRangeInput(
            createNumericRangeBoundary(
                rangeConfig.start.kind,
                rangeConfig.start.value,
            ),
            createNumericRangeBoundary(rangeConfig.end.kind, rangeConfig.end.value),
        );
    }

    throw new Error('Cannot clone panel range config with mixed boundary kinds.');
}
