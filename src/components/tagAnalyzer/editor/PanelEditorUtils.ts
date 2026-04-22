import { resolveTimeBoundaryRanges } from '../utils/time/TimeBoundaryRangeResolver';
import { resolveLastRelativeTimeRange } from '../utils/time/RelativeTimeUtils';
import type { SeriesConfig } from '../utils/series/seriesTypes';
import type { TimeRange } from '../utils/time/timeTypes';
import {
    isLastRelativeTimeRangeConfig,
    isNowRelativeTimeRangeConfig,
    resolveTimeBoundaryValue,
} from '../utils/time/TimeBoundaryParsing';
import { toLegacyTimeRangeInput } from '../utils/legacy/LegacyTimeAdapter';
import type {
    EditTabPanelType,
    TagAnalyzerPanelTimeConfig,
} from './PanelEditorTypes';

export const EDITOR_TABS: EditTabPanelType[] = ['General', 'Data', 'Axes', 'Display', 'Time'];

type ResolveEditorTimeBoundsArgs = {
    timeConfig: TagAnalyzerPanelTimeConfig;
    tag_set: SeriesConfig[];
    navigatorRange: TimeRange;
};

type EditorTimeRangeMode = 'lastRelative' | 'nowRelative' | 'absolute' | 'fallback';

/**
 * Resolves the concrete preview bounds used by the editor time controls.
 * Intent: Convert the editor's stored time config into an actual preview range.
 * @param {TagAnalyzerPanelTimeConfig} timeConfig The normalized editor time config.
 * @param {SeriesConfig[]} tag_set The current series set used to resolve relative last-ranges.
 * @param {TimeRange} navigatorRange The current navigator bounds used as the fallback preview window.
 * @returns {Promise<TimeRange>} The resolved preview range for the editor chart.
 */
export async function resolveEditorTimeBounds({
    timeConfig,
    tag_set,
    navigatorRange,
}: ResolveEditorTimeBoundsArgs): Promise<TimeRange> {
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
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config to inspect.
 * @returns {EditorTimeRangeMode} The resolution mode for this config.
 */
function getEditorTimeRangeMode(aTimeConfig: TagAnalyzerPanelTimeConfig): EditorTimeRangeMode {
    if (isLastRelativeTimeRangeConfig(aTimeConfig.range_config)) {
        return 'lastRelative';
    }

    if (isNowRelativeTimeRangeConfig(aTimeConfig.range_config)) {
        return 'nowRelative';
    }

    return hasAbsoluteEditorTimeBounds(aTimeConfig) ? 'absolute' : 'fallback';
}

/**
 * Checks whether the editor config already contains a usable concrete numeric range.
 * Intent: Separate validation of literal timestamps from the resolution branches.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config to validate.
 * @returns {boolean} True when the config contains a valid absolute range.
 */
function hasAbsoluteEditorTimeBounds(aTimeConfig: TagAnalyzerPanelTimeConfig): boolean {
    return aTimeConfig.range_bgn > 0 && aTimeConfig.range_end > aTimeConfig.range_bgn;
}

/**
 * Resolves last-relative editor ranges against the fetched last available end timestamp.
 * Intent: Keep the async fetch path isolated from the other range resolution branches.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config.
 * @param {SeriesConfig[]} aTagSet The series set used to resolve the last range.
 * @param {TimeRange} aFallbackRange The fallback range when no last range can be resolved.
 * @returns {Promise<TimeRange>} The resolved preview range.
 */
async function resolveLastRelativeEditorTimeBounds(
    aTimeConfig: TagAnalyzerPanelTimeConfig,
    aTagSet: SeriesConfig[],
    aFallbackRange: TimeRange,
): Promise<TimeRange> {
    if (!isLastRelativeTimeRangeConfig(aTimeConfig.range_config)) {
        return aFallbackRange;
    }

    const sLegacyRange = createLegacyEditorTimeRangeInput(aTimeConfig);
    const sResolvedRanges = await resolveLastRelativeBoundaryRanges(aTagSet, sLegacyRange);
    if (!sResolvedRanges) {
        return aFallbackRange;
    }

    return createLastRelativeEditorTimeBounds(aTimeConfig, sResolvedRanges.end.max);
}

/**
 * Converts the editor's normalized time config into the legacy boundary shape.
 * Intent: Keep the legacy adapter call separate from last-range resolution.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config to serialize.
 * @returns {ReturnType<typeof toLegacyTimeRangeInput>} The legacy range input.
 */
function createLegacyEditorTimeRangeInput(
    aTimeConfig: TagAnalyzerPanelTimeConfig,
): ReturnType<typeof toLegacyTimeRangeInput> {
    return toLegacyTimeRangeInput({
        range: { min: aTimeConfig.range_bgn, max: aTimeConfig.range_end },
        rangeConfig: aTimeConfig.range_config,
    });
}

/**
 * Fetches the concrete boundary ranges needed for last-relative editor ranges.
 * Intent: Encapsulate the dependency call that resolves the last available timestamp.
 * @param {SeriesConfig[]} aTagSet The active series set.
 * @param {ReturnType<typeof toLegacyTimeRangeInput>} aLegacyRange The serialized range input.
 * @returns {Promise<Awaited<ReturnType<typeof resolveTimeBoundaryRanges>>>} The fetched boundary ranges.
 */
async function resolveLastRelativeBoundaryRanges(
    aTagSet: SeriesConfig[],
    aLegacyRange: ReturnType<typeof toLegacyTimeRangeInput>,
): Promise<Awaited<ReturnType<typeof resolveTimeBoundaryRanges>>> {
    return resolveTimeBoundaryRanges(aTagSet, aLegacyRange, { bgn: '', end: '' });
}

/**
 * Builds the preview range for a last-relative config from the fetched end timestamp.
 * Intent: Keep the final timestamp math separate from the fetch and conversion steps.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config.
 * @param {number} aResolvedEndTime The resolved last available end timestamp.
 * @returns {TimeRange} The concrete preview range.
 */
function createLastRelativeEditorTimeBounds(
    aTimeConfig: TagAnalyzerPanelTimeConfig,
    aResolvedEndTime: number,
): TimeRange {
    if (!isLastRelativeTimeRangeConfig(aTimeConfig.range_config)) {
        throw new Error('Expected a last-relative time config.');
    }

    return resolveLastRelativeTimeRange(aResolvedEndTime, aTimeConfig.range_config);
}

/**
 * Resolves now-relative editor ranges against the current time.
 * Intent: Isolate the direct boundary-resolution path for now-based configs.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config.
 * @returns {TimeRange} The concrete preview range.
 */
function resolveNowRelativeEditorTimeBounds(aTimeConfig: TagAnalyzerPanelTimeConfig): TimeRange {
    if (!isNowRelativeTimeRangeConfig(aTimeConfig.range_config)) {
        throw new Error('Expected a now-relative time config.');
    }

    return {
        startTime: resolveTimeBoundaryValue(aTimeConfig.range_config.start),
        endTime: resolveTimeBoundaryValue(aTimeConfig.range_config.end),
    };
}

/**
 * Returns the literal numeric editor range as-is.
 * Intent: Keep the concrete timestamp path separate from relative range resolution.
 * @param {TagAnalyzerPanelTimeConfig} aTimeConfig The editor time config.
 * @returns {TimeRange} The numeric time range.
 */
function resolveAbsoluteEditorTimeBounds(aTimeConfig: TagAnalyzerPanelTimeConfig): TimeRange {
    return {
        startTime: aTimeConfig.range_bgn,
        endTime: aTimeConfig.range_end,
    };
}
