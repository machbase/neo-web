import type { RawFetchSampling } from './FetchTypes';
import type { PanelAxes, PanelData, PanelTime } from '../panelModelTypes';
import {
    calculateInterval,
    convertIntervalUnit,
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
 * @param aTimeRange The time range candidate to validate.
 * @returns True when the range is concrete and ordered.
 */
export function isFetchableTimeRange(
    aTimeRange: TimeRangeMs | undefined,
): aTimeRange is TimeRangeMs {
    return isConcreteTimeRange(aTimeRange);
}

/**
 * Resolves the time range used for a panel fetch.
 * Intent: Prefer an explicit range when present and fall back to the panel and board time sources.
 *
 * @param aPanelTime The panel time configuration.
 * @param aBoardTime The board-level time bounds.
 * @param aTimeRange The explicit time range override, when provided.
 * @returns The resolved fetch time range.
 */
export function resolvePanelFetchTimeRange(
    aPanelTime: PanelTime,
    aBoardTime: InputTimeBounds,
    aTimeRange: TimeRangeMs | undefined,
): TimeRangeMs {
    if (aTimeRange) {
        return aTimeRange;
    }

    return setTimeRange(
        normalizePanelTimeRangeSource(aPanelTime),
        normalizeBoardTimeRangeInput(aBoardTime),
    );
}

/**
 * Resolves the explicit raw-fetch sampling mode for a panel request.
 * Intent: Keep the backend sampling hint and its numeric value coupled in one fetch contract.
 *
 * @param aUseSampling Whether raw fetch sampling is enabled.
 * @param aSamplingValue The backend sampling value from panel axes.
 * @returns The explicit raw-fetch sampling mode.
 */
export function resolveRawFetchSampling(
    aUseSampling: boolean,
    aSamplingValue: number,
): RawFetchSampling {
    if (!aUseSampling) {
        return { kind: 'disabled' };
    }

    return {
        kind: 'enabled',
        value: aSamplingValue,
    };
}

/**
 * Resolves the interval used for a panel fetch.
 * Intent: Honor an explicit interval type when present and otherwise calculate one from chart context.
 *
 * @param aPanelData The panel data that may define an interval type.
 * @param aAxes The panel axes configuration.
 * @param aTimeRange The resolved time range for the fetch.
 * @param aChartWidth The visible chart width in pixels.
 * @param aIsRaw Whether the panel is loading raw data.
 * @param aIsNavigator Whether the request is for the navigator chart.
 * @returns The resolved interval option.
 */
export function resolvePanelFetchInterval(
    aPanelData: PanelData,
    aAxes: PanelAxes,
    aTimeRange: TimeRangeMs,
    aChartWidth: number,
    aIsRaw: boolean,
    aIsNavigator = false,
): IntervalOption {
    const sIntervalType = aPanelData.interval_type?.toLowerCase() ?? '';

    if (sIntervalType !== '') {
        return {
            IntervalType: convertIntervalUnit(sIntervalType),
            IntervalValue: 0,
        };
    }

    return calculateInterval(
        aTimeRange.startTime,
        aTimeRange.endTime,
        aChartWidth,
        aIsRaw,
        aAxes.x_axis.calculated_data_pixels_per_tick,
        aAxes.x_axis.raw_data_pixels_per_tick,
        aIsNavigator,
    );
}
