import { resolveTimeBoundaryRanges } from '../../fetch/TimeBoundaryRangeResolver';
import {
    convertTimeRangeConfigToResolvedTimeRangeMs,
} from '../../time/TimeBoundaryConverters';
import type { PanelSeriesDefinition } from '../../domain/SeriesModel';
import type { ResolvedTimeRangeMs } from '../../time/TimeTypes';
import type {
    EditorTimeRangeMode,
    PanelTimeConfig,
    ResolveEditorTimeBoundsArgs,
} from './EditorTypes';

export const parseEditorNumber = (value: string): number | '' => {
    return value === '' ? '' : Number(value);
};

export async function resolveEditorTimeBounds({
    timeConfig,
    tag_set,
    navigatorRange,
}: ResolveEditorTimeBoundsArgs): Promise<ResolvedTimeRangeMs> {
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

function getEditorTimeRangeMode(timeConfig: PanelTimeConfig): EditorTimeRangeMode {
    if (
        timeConfig.range_config.start.kind === 'last' &&
        timeConfig.range_config.end.kind === 'last'
    ) {
        return 'lastRelative';
    }

    if (
        timeConfig.range_config.start.kind === 'now' &&
        timeConfig.range_config.end.kind === 'now'
    ) {
        return 'nowRelative';
    }

    return hasAbsoluteEditorTimeBounds(timeConfig) ? 'absolute' : 'fallback';
}

function hasAbsoluteEditorTimeBounds(timeConfig: PanelTimeConfig): boolean {
    return timeConfig.range_bgn > 0 && timeConfig.range_end > timeConfig.range_bgn;
}

async function resolveLastRelativeEditorTimeBounds(
    timeConfig: PanelTimeConfig,
    tagSet: PanelSeriesDefinition[],
    fallbackRange: ResolvedTimeRangeMs,
): Promise<ResolvedTimeRangeMs> {
    if (
        timeConfig.range_config.start.kind !== 'last' ||
        timeConfig.range_config.end.kind !== 'last'
    ) {
        return fallbackRange;
    }

    const sResolvedRanges = await resolveLastRelativeBoundaryRanges(tagSet, timeConfig);
    if (!sResolvedRanges) {
        return fallbackRange;
    }

    return createLastRelativeEditorTimeBounds(
        timeConfig,
        sResolvedRanges.end.max.timestamp,
    );
}

async function resolveLastRelativeBoundaryRanges(
    tagSet: PanelSeriesDefinition[],
    timeConfig: PanelTimeConfig,
): Promise<Awaited<ReturnType<typeof resolveTimeBoundaryRanges>>> {
    return resolveTimeBoundaryRanges(tagSet, timeConfig.range_config, {
        start: { kind: 'empty' },
        end: { kind: 'empty' },
    });
}

function createLastRelativeEditorTimeBounds(
    timeConfig: PanelTimeConfig,
    resolvedEndTime: number,
): ResolvedTimeRangeMs {
    if (
        timeConfig.range_config.start.kind !== 'last' ||
        timeConfig.range_config.end.kind !== 'last'
    ) {
        throw new Error('Expected a last-relative time config.');
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeConfig.range_config, resolvedEndTime);
}

function resolveNowRelativeEditorTimeBounds(timeConfig: PanelTimeConfig): ResolvedTimeRangeMs {
    if (
        timeConfig.range_config.start.kind !== 'now' ||
        timeConfig.range_config.end.kind !== 'now'
    ) {
        throw new Error('Expected a now-relative time config.');
    }

    return convertTimeRangeConfigToResolvedTimeRangeMs(timeConfig.range_config);
}

function resolveAbsoluteEditorTimeBounds(timeConfig: PanelTimeConfig): ResolvedTimeRangeMs {
    return {
        startTime: timeConfig.range_bgn,
        endTime: timeConfig.range_end,
    };
}


