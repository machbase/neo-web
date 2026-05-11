import { resolveTimeBoundaryRanges } from '../../fetch/TimeBoundaryRangeResolver';
import {
    hasMatchingTimeRangeBoundaryKind,
    resolveConcreteTimeRangeConfigWithFallback,
    resolveLastTimeRangeConfig,
} from '../../time/TimeRangeResolution';
import {
    createEmptyTimeRangeConfig,
    createTimeRangeMs,
    isConcreteTimeRange,
} from '../../time/TimeRangeUtils';
import type { TimeRangeMs } from '../../time/TimeTypes';
import type {
    ResolveEditorTimeBoundsArgs,
} from './EditorTypes';

export const parseEditorNumber = (value: string): number | '' => {
    return value === '' ? '' : Number(value);
};

export async function resolveEditorTimeBounds({
    timeConfig,
    tag_set,
    navigatorRange,
}: ResolveEditorTimeBoundsArgs): Promise<TimeRangeMs> {
    if (hasMatchingTimeRangeBoundaryKind(timeConfig.range_config, 'last')) {
        const sResolvedRanges = await resolveTimeBoundaryRanges(
            tag_set,
            createEmptyTimeRangeConfig(),
            timeConfig.range_config,
        );

        return (
            resolveLastTimeRangeConfig(timeConfig.range_config, sResolvedRanges) ??
            navigatorRange
        );
    }

    if (hasMatchingTimeRangeBoundaryKind(timeConfig.range_config, 'now')) {
        return resolveConcreteTimeRangeConfigWithFallback({
            rangeConfig: timeConfig.range_config,
            fallbackRange: navigatorRange,
        });
    }

    const sStoredRange = createTimeRangeMs(
        timeConfig.range_bgn,
        timeConfig.range_end,
    );
    if (isConcreteTimeRange(sStoredRange)) {
        return sStoredRange;
    }

    return resolveConcreteTimeRangeConfigWithFallback({
        rangeConfig: timeConfig.range_config,
        fallbackRange: navigatorRange,
    });
}


