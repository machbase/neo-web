import type { PanelData, PanelTime } from '../domain/PanelModel';
import { resolveTimeBoundaryRanges } from '../fetch/TimeBoundaryRangeResolver';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
    TimeRangeMs,
} from '../time/TimeTypes';
import {
    hasMatchingTimeRangeBoundaryKind,
    resolveAbsoluteTimeRangeConfig,
    resolveConcreteRangeFallback,
    resolveConcreteTimeRangeConfigOrEmpty,
    resolveLastTimeRangeConfig,
    resolveNowTimeRangeConfigFromSource,
    resolvePanelOrBoardTimeRange,
} from '../time/TimeRangeResolution';
import { createEmptyTimeRangeConfig } from '../time/TimeRangeUtils';

type PanelRangeResolutionMode = 'initialize' | 'reset';

export async function resolvePanelTimeRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
    mode: PanelRangeResolutionMode,
): Promise<TimeRangeMs> {
    const sPanelOrBoardRange = resolvePanelOrBoardTimeRange(panelTime, boardTime);
    const sAbsolutePanelRange = resolveAbsoluteTimeRangeConfig(panelTime.rangeConfig);
    if (sAbsolutePanelRange) {
        return sAbsolutePanelRange;
    }

    const sBoardPriorityRange = resolveLastTimeRangeConfig(boardTime, timeBoundaryRanges);
    if (sBoardPriorityRange) {
        return sBoardPriorityRange;
    }

    const sRelativePanelRange = await resolveRelativeOrNowPanelRange(
        boardTime,
        panelData,
        panelTime,
        timeBoundaryRanges,
    );
    if (sRelativePanelRange) {
        return sRelativePanelRange;
    }

    if (mode === 'reset') {
        return resolveConcreteRangeFallback(
            resolveConcreteTimeRangeConfigOrEmpty(boardTime),
            timeBoundaryRanges,
        );
    }

    return resolveConcreteRangeFallback(
        sPanelOrBoardRange,
        timeBoundaryRanges,
    );
}

async function resolveRelativeOrNowPanelRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): Promise<TimeRangeMs | undefined> {
    const sRelativePanelLastRange = await resolveRelativePanelLastRange(
        boardTime,
        panelData,
        panelTime,
        timeBoundaryRanges,
    );
    if (sRelativePanelLastRange) {
        return sRelativePanelLastRange;
    }

    return resolveNowTimeRangeConfigFromSource(panelTime, boardTime);
}

async function resolveRelativePanelLastRange(
    boardTime: TimeRangeConfig | undefined,
    panelData: PanelData,
    panelTime: PanelTime,
    timeBoundaryRanges: FetchedTimeBoundaryRange | null,
): Promise<TimeRangeMs | undefined> {
    if (!hasMatchingTimeRangeBoundaryKind(panelTime.rangeConfig, 'last')) {
        return undefined;
    }

    const sTimeRange =
        timeBoundaryRanges ??
        (await resolveTimeBoundaryRanges(
            panelData.tag_set,
            boardTime ?? createEmptyTimeRangeConfig(),
            panelTime.rangeConfig,
        ));
    if (!sTimeRange) {
        return undefined;
    }

    return resolveLastTimeRangeConfig(panelTime.rangeConfig, sTimeRange);
}



