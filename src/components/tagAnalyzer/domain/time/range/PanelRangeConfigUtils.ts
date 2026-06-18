import { getTimeUnitMilliseconds } from '../interval/TimeIntervalUtils';
import type {
    NumericRangeBoundary,
    NumericRangeConfig,
    PanelRangeBoundary,
    PanelRangeConfig,
    TimeBoundary,
    TimestampRangeBoundary,
    TimestampRangeConfig,
} from '../model/TimeTypes';

export function createTimestampRangeConfig(
    start: TimestampRangeBoundary,
    end: TimestampRangeBoundary,
): TimestampRangeConfig {
    return {
        start,
        end,
    };
}

export function createNumericRangeConfig(
    start: NumericRangeBoundary,
    end: NumericRangeBoundary,
): NumericRangeConfig {
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

export function isTimestampRangeConfig(
    rangeConfig: PanelRangeConfig,
): rangeConfig is TimestampRangeConfig {
    return isTimestampRangeBoundary(rangeConfig.start) &&
        isTimestampRangeBoundary(rangeConfig.end);
}

export function isNumericRangeConfig(
    rangeConfig: PanelRangeConfig,
): rangeConfig is NumericRangeConfig {
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

export function isEmptyPanelRangeConfig(
    rangeConfig: PanelRangeConfig,
): boolean {
    return isEmptyPanelRangeBoundary(rangeConfig.start) &&
        isEmptyPanelRangeBoundary(rangeConfig.end);
}

export function hasCompletePanelRangeConfig(
    rangeConfig: PanelRangeConfig,
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

export function clonePanelRangeConfig(
    rangeConfig: PanelRangeConfig,
): PanelRangeConfig {
    if (isTimestampRangeConfig(rangeConfig)) {
        return createTimestampRangeConfig(
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

    if (isNumericRangeConfig(rangeConfig)) {
        return createNumericRangeConfig(
            createNumericRangeBoundary(
                rangeConfig.start.kind,
                rangeConfig.start.value,
            ),
            createNumericRangeBoundary(rangeConfig.end.kind, rangeConfig.end.value),
        );
    }

    throw new Error('Cannot clone panel range config with mixed boundary kinds.');
}
