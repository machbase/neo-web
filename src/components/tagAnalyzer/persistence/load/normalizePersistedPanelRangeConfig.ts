import type {
    NumericRangeInput,
    PanelRangeBoundary,
    PanelRangeInput,
    TimestampRangeInput,
} from '../../domain/time/model/TimeTypes';
import {
    createNumericRangeBoundary,
    createNumericRangeInput,
    createTimestampRangeBoundary,
    createTimestampRangeBoundaryFromTimeBoundary,
    createTimestampRangeInput,
    isNumericRangeBoundary,
    isNumericRangeBoundaryKind,
    isTimestampRangeBoundary,
    isTimestampRangeBoundaryKind,
} from '../../domain/time/range/PanelRangeConfigUtils';
import { normalizePersistedTimeRangeConfig } from './normalizePersistedTimeRangeConfig';

export function normalizePersistedPanelRangeInput(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeInput | undefined {
    const sExplicitRangeConfig = normalizeExplicitPanelRangeInput(
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
            return createNumericRangeInput(
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

        return createNumericRangeInput(
            createNumericRangeBoundary('numeric_empty'),
            createNumericRangeBoundary('numeric_empty'),
        );
    }

    return createTimestampRangeInput(
        createTimestampRangeBoundaryFromTimeBoundary(sLegacyTimeRangeConfig.start),
        createTimestampRangeBoundaryFromTimeBoundary(sLegacyTimeRangeConfig.end),
    );
}

function normalizeExplicitPanelRangeInput(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): PanelRangeInput | undefined {
    if (!rangeConfig || typeof rangeConfig !== 'object') {
        return undefined;
    }

    const sRangeConfig = rangeConfig as Record<string, unknown>;

    if (isNumericAxis) {
        return normalizeExplicitNumericRangeInput(sRangeConfig);
    }

    return normalizeExplicitTimestampRangeInput(sRangeConfig);
}

function normalizeExplicitTimestampRangeInput(
    rangeConfig: Record<string, unknown>,
): TimestampRangeInput | undefined {
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

    return createTimestampRangeInput(sStartBoundary, sEndBoundary);
}

function normalizeExplicitNumericRangeInput(
    rangeConfig: Record<string, unknown>,
): NumericRangeInput | undefined {
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

    return createNumericRangeInput(sStartBoundary, sEndBoundary);
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
): PanelRangeInput | undefined {
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
        ? createNumericRangeInput(
              createNumericRangeBoundary('numeric_value', sRangeConfig.start),
              createNumericRangeBoundary('numeric_value', sRangeConfig.end),
          )
        : createTimestampRangeInput(
              createTimestampRangeBoundary(
                  'timestamp_absolute',
                  sRangeConfig.start,
              ),
              createTimestampRangeBoundary('timestamp_absolute', sRangeConfig.end),
          );
}
