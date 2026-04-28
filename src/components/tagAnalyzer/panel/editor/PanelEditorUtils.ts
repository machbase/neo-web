import { resolveTimeBoundaryRanges } from '../../utils/time/TimeBoundaryRangeResolver';
import { resolveLastRelativeTimeRange } from '../../utils/time/RelativeTimeUtils';
import type { PanelSeriesDefinition } from '../../utils/series/PanelSeriesTypes';
import type { TimeRangeMs } from '../../utils/time/types/TimeTypes';
import {
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    resolveTimeBoundaryValue,
} from '../../utils/time/TimeBoundaryParsing';
import { toStoredTimeRangeInput } from '../../utils/time/StoredTimeRangeAdapter';
import type {
    EditorTimeRangeMode,
    PanelTimeConfig,
    ResolveEditorTimeBoundsArgs,
} from './EditorTypes';

/**
 * Parses one editor field into either a number or an empty draft value.
 * Intent: Preserve blank numeric inputs while still converting entered text into numbers.
 * @param {string} value The raw editor input value.
 * @returns {number | ''} The parsed numeric draft value.
 */
export const parseEditorNumber = (value: string): number | '' => {
    return value === '' ? '' : Number(value);
};

/**
 * Resolves the concrete preview bounds used by the editor time controls.
 * Intent: Convert the editor's stored time config into an actual preview range.
 * @param {PanelTimeConfig} timeConfig The normalized editor time config.
 * @param {PanelSeriesDefinition[]} tag_set The current series set used to resolve relative last-ranges.
 * @param {TimeRangeMs} navigatorRange The current navigator bounds used as the fallback preview window.
 * @returns {Promise<TimeRangeMs>} The resolved preview range for the editor chart.
 */
export async function resolveEditorTimeBounds({
    timeConfig,
    tag_set,
    navigatorRange,
}: ResolveEditorTimeBoundsArgs): Promise<TimeRangeMs> {
    const sRangeMode = getEditorTimeRangeMode(timeConfig);

    switch (sRangeMode) {
        case 'lastRelative':
            return resolveLastRelativeEditorTimeBounds(timeConfig, tag_set, navigatorRange);
        case 'nowRelative':
            return resolveNowRelativeEditorTimeBounds(timeConfig);
        case 'absolute':
            return resolveAbsoluteEditorTimeBounds(timeConfig);
        case 'fallback':
            return navigatorRange;
    }
}

/**
 * Classifies the editor time config into the resolution path it should use.
 * Intent: Keep the main resolver focused on orchestration instead of branch details.
 * @param {PanelTimeConfig} timeConfig The editor time config to inspect.
 * @returns {EditorTimeRangeMode} The resolution mode for this config.
 */
function getEditorTimeRangeMode(timeConfig: PanelTimeConfig): EditorTimeRangeMode {
    if (isLastRelativeTimeRangeConfig(timeConfig.range_config)) {
        return 'lastRelative';
    }

    if (isNowRelativeTimeRangeConfig(timeConfig.range_config)) {
        return 'nowRelative';
    }

    return hasAbsoluteEditorTimeBounds(timeConfig) ? 'absolute' : 'fallback';
}

/**
 * Checks whether the editor config already contains a usable concrete numeric range.
 * Intent: Separate validation of literal timestamps from the resolution branches.
 * @param {PanelTimeConfig} timeConfig The editor time config to validate.
 * @returns {boolean} True when the config contains a valid absolute range.
 */
function hasAbsoluteEditorTimeBounds(timeConfig: PanelTimeConfig): boolean {
    return timeConfig.range_bgn > 0 && timeConfig.range_end > timeConfig.range_bgn;
}

/**
 * Resolves last-relative editor ranges against the fetched last available end timestamp.
 * Intent: Keep the async fetch path isolated from the other range resolution branches.
 * @param {PanelTimeConfig} timeConfig The editor time config.
 * @param {PanelSeriesDefinition[]} tagSet The series set used to resolve the last range.
 * @param {TimeRangeMs} fallbackRange The fallback range when no last range can be resolved.
 * @returns {Promise<TimeRangeMs>} The resolved preview range.
 */
async function resolveLastRelativeEditorTimeBounds(
    timeConfig: PanelTimeConfig,
    tagSet: PanelSeriesDefinition[],
    fallbackRange: TimeRangeMs,
): Promise<TimeRangeMs> {
    if (!isLastRelativeTimeRangeConfig(timeConfig.range_config)) {
        return fallbackRange;
    }

    const sStoredRange = createStoredEditorTimeRangeInput(timeConfig);
    const sResolvedRanges = await resolveLastRelativeBoundaryRanges(tagSet, sStoredRange);
    if (!sResolvedRanges) {
        return fallbackRange;
    }

    return createLastRelativeEditorTimeBounds(timeConfig, sResolvedRanges.end.max);
}

/**
 * Converts the editor's normalized time config into the stored boundary shape.
 * Intent: Keep the serialized time-range conversion separate from last-range resolution.
 * @param {PanelTimeConfig} timeConfig The editor time config to serialize.
 * @returns {ReturnType<typeof toStoredTimeRangeInput>} The stored range input.
 */
function createStoredEditorTimeRangeInput(
    timeConfig: PanelTimeConfig,
): ReturnType<typeof toStoredTimeRangeInput> {
    return toStoredTimeRangeInput({
        range: { min: timeConfig.range_bgn, max: timeConfig.range_end },
        rangeConfig: timeConfig.range_config,
    });
}

/**
 * Fetches the concrete boundary ranges needed for last-relative editor ranges.
 * Intent: Encapsulate the dependency call that resolves the last available timestamp.
 * @param {PanelSeriesDefinition[]} tagSet The active series set.
 * @param {ReturnType<typeof toStoredTimeRangeInput>} storedRange The serialized range input.
 * @returns {Promise<Awaited<ReturnType<typeof resolveTimeBoundaryRanges>>>} The fetched boundary ranges.
 */
async function resolveLastRelativeBoundaryRanges(
    tagSet: PanelSeriesDefinition[],
    storedRange: ReturnType<typeof toStoredTimeRangeInput>,
): Promise<Awaited<ReturnType<typeof resolveTimeBoundaryRanges>>> {
    return resolveTimeBoundaryRanges(tagSet, storedRange, { bgn: '', end: '' });
}

/**
 * Builds the preview range for a last-relative config from the fetched end timestamp.
 * Intent: Keep the final timestamp math separate from the fetch and conversion steps.
 * @param {PanelTimeConfig} timeConfig The editor time config.
 * @param {number} resolvedEndTime The resolved last available end timestamp.
 * @returns {TimeRangeMs} The concrete preview range.
 */
function createLastRelativeEditorTimeBounds(
    timeConfig: PanelTimeConfig,
    resolvedEndTime: number,
): TimeRangeMs {
    if (!isLastRelativeTimeRangeConfig(timeConfig.range_config)) {
        throw new Error('Expected a last-relative time config.');
    }

    return resolveLastRelativeTimeRange(resolvedEndTime, timeConfig.range_config);
}

/**
 * Resolves now-relative editor ranges against the current time.
 * Intent: Isolate the direct boundary-resolution path for now-based configs.
 * @param {PanelTimeConfig} timeConfig The editor time config.
 * @returns {TimeRangeMs} The concrete preview range.
 */
function resolveNowRelativeEditorTimeBounds(timeConfig: PanelTimeConfig): TimeRangeMs {
    if (!isNowRelativeTimeRangeConfig(timeConfig.range_config)) {
        throw new Error('Expected a now-relative time config.');
    }

    return {
        startTime: resolveTimeBoundaryValue(timeConfig.range_config.start),
        endTime: resolveTimeBoundaryValue(timeConfig.range_config.end),
    };
}

/**
 * Returns the literal numeric editor range as-is.
 * Intent: Keep the concrete timestamp path separate from relative range resolution.
 * @param {PanelTimeConfig} timeConfig The editor time config.
 * @returns {TimeRangeMs} The numeric time range.
 */
function resolveAbsoluteEditorTimeBounds(timeConfig: PanelTimeConfig): TimeRangeMs {
    return {
        startTime: timeConfig.range_bgn,
        endTime: timeConfig.range_end,
    };
}
