import type {
    NumericRangeConfig,
    PanelRangeBoundary,
    PanelRangeConfig,
    TimestampRangeConfig,
} from '../../domain/time/model/TimeTypes';
import {
    createNumericRangeBoundary,
    createNumericRangeConfig,
    createTimestampRangeBoundary,
    createTimestampRangeBoundaryFromTimeBoundary,
    createTimestampRangeConfig,
    isNumericRangeBoundary,
    isNumericRangeBoundaryKind,
    isTimestampRangeBoundary,
    isTimestampRangeBoundaryKind,
} from '../../domain/time/range/PanelRangeConfigUtils';
import { normalizePersistedTimeRangeConfig } from './normalizePersistedTimeRangeConfig';

export function normalizePersistedPanelRangeConfig(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeConfig | undefined {
    const sExplicitRangeConfig = normalizeExplicitPanelRangeConfig(
        rangeConfig,
        isNumericAxis,
    );
    if (sExplicitRangeConfig) {
        return sExplicitRangeConfig;
    }

    const sDirectNumberRangeConfig = normalizeDirectNumberRangeConfig(
        rangeConfig,
        isNumericAxis,
    );
    if (sDirectNumberRangeConfig) {
        return sDirectNumberRangeConfig;
    }

    const sLegacyTimeRangeConfig = normalizePersistedTimeRangeConfig(rangeConfig);
    if (!sLegacyTimeRangeConfig) {
        return undefined;
    }

    if (isNumericAxis) {
        if (
            sLegacyTimeRangeConfig.start.kind === 'absolute' &&
            sLegacyTimeRangeConfig.end.kind === 'absolute'
        ) {
            return createNumericRangeConfig(
                createNumericRangeBoundary(
                    'numeric_value',
                    sLegacyTimeRangeConfig.start.timestamp,
                ),
                createNumericRangeBoundary(
                    'numeric_value',
                    sLegacyTimeRangeConfig.end.timestamp,
                ),
            );
        }

        return createNumericRangeConfig(
            createNumericRangeBoundary('numeric_empty'),
            createNumericRangeBoundary('numeric_empty'),
        );
    }

    return createTimestampRangeConfig(
        createTimestampRangeBoundaryFromTimeBoundary(sLegacyTimeRangeConfig.start),
        createTimestampRangeBoundaryFromTimeBoundary(sLegacyTimeRangeConfig.end),
    );
}

function normalizeExplicitPanelRangeConfig(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeConfig | undefined {
    if (!rangeConfig || typeof rangeConfig !== 'object') {
        return undefined;
    }

    const sRangeConfig = rangeConfig as Record<string, unknown>;

    if (isNumericAxis) {
        return normalizeExplicitNumericRangeConfig(sRangeConfig);
    }

    return normalizeExplicitTimestampRangeConfig(sRangeConfig);
}

function normalizeExplicitTimestampRangeConfig(
    rangeConfig: Record<string, unknown>,
): TimestampRangeConfig | undefined {
    const sStartBoundary = normalizeExplicitPanelBoundary(rangeConfig.start);
    const sEndBoundary = normalizeExplicitPanelBoundary(rangeConfig.end);

    if (
        !sStartBoundary ||
        !sEndBoundary ||
        !isTimestampRangeBoundary(sStartBoundary) ||
        !isTimestampRangeBoundary(sEndBoundary)
    ) {
        return undefined;
    }

    return createTimestampRangeConfig(sStartBoundary, sEndBoundary);
}

function normalizeExplicitNumericRangeConfig(
    rangeConfig: Record<string, unknown>,
): NumericRangeConfig | undefined {
    const sStartBoundary = normalizeExplicitPanelBoundary(rangeConfig.start);
    const sEndBoundary = normalizeExplicitPanelBoundary(rangeConfig.end);

    if (
        !sStartBoundary ||
        !sEndBoundary ||
        !isNumericRangeBoundary(sStartBoundary) ||
        !isNumericRangeBoundary(sEndBoundary)
    ) {
        return undefined;
    }

    return createNumericRangeConfig(sStartBoundary, sEndBoundary);
}

function normalizeExplicitPanelBoundary(
    boundary: unknown,
): PanelRangeBoundary | undefined {
    if (!boundary || typeof boundary !== 'object') {
        return undefined;
    }

    const sBoundary = boundary as Record<string, unknown>;

    if (typeof sBoundary.value !== 'number') {
        return undefined;
    }

    if (isTimestampRangeBoundaryKind(sBoundary.kind)) {
        return createTimestampRangeBoundary(sBoundary.kind, sBoundary.value);
    }

    if (isNumericRangeBoundaryKind(sBoundary.kind)) {
        return createNumericRangeBoundary(sBoundary.kind, sBoundary.value);
    }

    return undefined;
}

function normalizeDirectNumberRangeConfig(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeConfig | undefined {
    if (!rangeConfig || typeof rangeConfig !== 'object') {
        return undefined;
    }

    const sRangeConfig = rangeConfig as Record<string, unknown>;

    if (
        typeof sRangeConfig.start !== 'number' ||
        typeof sRangeConfig.end !== 'number'
    ) {
        return undefined;
    }

    return isNumericAxis
        ? createNumericRangeConfig(
              createNumericRangeBoundary('numeric_value', sRangeConfig.start),
              createNumericRangeBoundary('numeric_value', sRangeConfig.end),
          )
        : createTimestampRangeConfig(
              createTimestampRangeBoundary(
                  'timestamp_absolute',
                  sRangeConfig.start,
              ),
              createTimestampRangeBoundary('timestamp_absolute', sRangeConfig.end),
          );
}
