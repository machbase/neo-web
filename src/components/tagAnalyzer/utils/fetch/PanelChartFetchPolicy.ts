import type { RawFetchSampling } from './FetchTypes';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import {
    calculateInterval,
    convertIntervalUnit,
    getIntervalMs,
} from '../time/IntervalUtils';
import {
    normalizeBoardTimeRangeInput,
    normalizePanelTimeRangeSource,
    setTimeRange,
} from '../time/PanelTimeRangeResolver';
import { isConcreteTimeRange } from '../time/TimeBoundaryParsing';
import type {
    InputTimeBounds,
    IntervalOption,
    TimeRangeMs,
} from '../time/types/TimeTypes';

/**
 * Checks whether a time range can be used for fetching.
 * Intent: Reject invalid or incomplete ranges before the fetch layer runs.
 *
 * @param timeRange The time range candidate to validate.
 * @returns True when the range is concrete and ordered.
 */
export function isFetchableTimeRange(
    timeRange: TimeRangeMs | undefined,
): timeRange is TimeRangeMs {
    return isConcreteTimeRange(timeRange);
}

/**
 * Resolves the time range used for a panel fetch.
 * Intent: Prefer an explicit range when present and fall back to the panel and board time sources.
 *
 * @param panelTime The panel time configuration.
 * @param boardTime The board-level time bounds.
 * @param timeRange The explicit time range override, when provided.
 * @returns The resolved fetch time range.
 */
export function resolvePanelFetchTimeRange(
    panelTime: PanelTime,
    boardTime: InputTimeBounds,
    timeRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (timeRange) {
        return timeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(panelTime),
        normalizeBoardTimeRangeInput(boardTime),
    );
}

/**
 * Resolves the explicit raw-fetch sampling mode for a panel request.
 * Intent: Keep the backend sampling hint and its numeric value coupled in one fetch contract.
 *
 * @param useSampling Whether raw fetch sampling is enabled.
 * @param samplingValue The backend sampling value from panel axes.
 * @returns The explicit raw-fetch sampling mode.
 */
export function resolveRawFetchSampling(
    useSampling: boolean,
    samplingValue: number,
): RawFetchSampling {
    if (!useSampling) {
        return { kind: 'disabled' };
    }

    return {
        kind: 'enabled',
        value: samplingValue,
    };
}

/**
 * Resolves the interval used for a panel fetch.
 * Intent: Honor an explicit interval type when present and otherwise calculate one from chart context.
 *
 * @param panelData The panel data that may define an interval type.
 * @param axes The panel axes configuration.
 * @param timeRange The resolved time range for the fetch.
 * @param chartWidth The visible chart width in pixels.
 * @param isRaw Whether the panel is loading raw data.
 * @param isNavigator Whether the request is for the navigator chart.
 * @returns The resolved interval option.
 */
export function resolvePanelFetchInterval(
    panelData: PanelData,
    axes: PanelAxes,
    timeRange: TimeRangeMs,
    chartWidth: number,
    isRaw: boolean,
    isNavigator = false,
): IntervalOption {
    const sCalculatedInterval = calculateInterval(
        timeRange.startTime,
        timeRange.endTime,
        chartWidth,
        isRaw,
        axes.x_axis.calculated_data_pixels_per_tick,
        axes.x_axis.raw_data_pixels_per_tick,
        isNavigator,
    );
    const sIntervalType = panelData.interval_type?.toLowerCase() ?? '';

    if (sIntervalType !== '') {
        const sExplicitInterval = resolveExplicitFetchInterval(
            convertIntervalUnit(sIntervalType),
            sCalculatedInterval,
        );

        if (sExplicitInterval) {
            return sExplicitInterval;
        }

        return sCalculatedInterval;
    }

    return sCalculatedInterval;
}

/**
 * Resolves a stored explicit interval unit into a concrete non-zero fetch interval.
 * Intent: Keep loaded charts from sending zero-sized intervals when older files only save the interval unit.
 * @param {string} intervalType The stored explicit interval unit.
 * @param {IntervalOption} calculatedInterval The calculated interval used as the size baseline.
 * @returns {IntervalOption | undefined} The explicit fetch interval, or undefined when the stored unit is unsupported.
 */
function resolveExplicitFetchInterval(
    intervalType: string,
    calculatedInterval: IntervalOption,
): IntervalOption | undefined {
    const sIntervalUnitMs = getIntervalMs(intervalType, 1);
    if (sIntervalUnitMs <= 0) {
        return undefined;
    }

    const sCalculatedIntervalMs = getIntervalMs(
        calculatedInterval.IntervalType,
        calculatedInterval.IntervalValue,
    );
    if (sCalculatedIntervalMs <= 0) {
        return {
            IntervalType: intervalType,
            IntervalValue: 1,
        };
    }

    return {
        IntervalType: intervalType,
        IntervalValue: Math.max(1, Math.ceil(sCalculatedIntervalMs / sIntervalUnitMs)),
    };
}
