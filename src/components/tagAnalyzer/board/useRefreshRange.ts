import type { PanelInfo } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import {
    resolveFullDataTimeRange,
    resolvePanelTimeRange,
} from '../domain/time/PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    hasValidRangeState,
    type ApplyPanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';

type RefreshRangeDependencies = {
    boardTime: TimeRangeConfig;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeState: ApplyPanelRangeState;
};

type RefreshRangeActions = {
    refreshPanelData: (panelInfo: PanelInfo) => Promise<void>;
    refreshPanelTime: (panelInfo: PanelInfo) => Promise<void>;
    setFullDataRange: (panelInfo: PanelInfo) => Promise<void>;
};

export function useRefreshRange({
    boardTime,
    getBoardPanelRecord,
    applyPanelRangeState,
}: RefreshRangeDependencies): RefreshRangeActions {
    async function setFullDataRange(panelInfo: PanelInfo): Promise<void> {
        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);

        if (!isConcreteTimeRange(fullDataRange)) {
            throw new Error('Cannot set full data range without a concrete range.');
        }

        applyPanelRangeState(panelInfo, {
            panelRange: fullDataRange,
            navigatorRange: fullDataRange,
            fullRange: fullDataRange,
        });
    }

    async function refreshPanelData(panelInfo: PanelInfo): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        if (!hasValidRangeState(rangeState)) {
            await applyConfiguredTimeRange(panelInfo);
            return;
        }

        applyPanelRangeState(panelInfo, {
            panelRange: rangeState.panelRange,
            navigatorRange: rangeState.navigatorRange,
            fullRange: rangeState.fullRange,
            reloadData: true,
        });
    }

    async function refreshPanelTime(panelInfo: PanelInfo): Promise<void> {
        const refreshedRange = await resolveRefreshedRange(
            panelInfo.data.tag_set,
            panelInfo.time.range_config,
            boardTime,
        );

        await applyConfiguredTimeRange(panelInfo, refreshedRange);
    }

    return {
        refreshPanelData,
        refreshPanelTime,
        setFullDataRange,
    };

    async function applyConfiguredTimeRange(
        panelInfo: PanelInfo,
        refreshedRange?: { panelRange: TimeRangeMs; fullRange: TimeRangeMs },
    ): Promise<void> {
        const range =
            refreshedRange ??
            await resolveRefreshedRange(
                panelInfo.data.tag_set,
                panelInfo.time.range_config,
                boardTime,
            );

        applyPanelRangeState(panelInfo, {
            panelRange: range.panelRange,
            navigatorRange: getCoveringNavigatorRange(
                range.panelRange,
                range.fullRange,
            ),
            fullRange: range.fullRange,
        });
    }
}

async function resolveFullRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;

    return resolveFullDataTimeRange(boundaryRanges);
}

async function resolveRefreshedRange(
    seriesList: PanelSeriesDefinition[],
    panelTime: TimeRangeConfig,
    boardTime: TimeRangeConfig,
): Promise<{ panelRange: TimeRangeMs; fullRange: TimeRangeMs }> {
    const shouldUseBoardTime = hasConfiguredTimeRange(boardTime);
    const activeTimeConfig = shouldUseBoardTime ? boardTime : panelTime;
    const [
        timeBoundaryRanges,
        fullDataBoundaryRanges,
    ] = await Promise.all([
        resolveTimeBoundaryRanges(seriesList, boardTime, activeTimeConfig),
        resolveSeriesTimeBoundaryRanges(seriesList),
    ]);
    const resolvedTimeBoundaryRanges = timeBoundaryRanges ?? null;
    const resolvedPanelRange = resolvePanelTimeRange({
        boardTime,
        panelTime: { rangeConfig: activeTimeConfig },
        timeBoundaryRanges: resolvedTimeBoundaryRanges,
        mode: 'reset',
    });
    const resolvedFullRange =
        (shouldUseBoardTime
            ? resolvedPanelRange
            : resolveFullDataTimeRange(
                  fullDataBoundaryRanges ?? resolvedTimeBoundaryRanges,
              )) ??
        resolvedPanelRange;

    if (!isConcreteTimeRange(resolvedPanelRange)) {
        throw new Error('Cannot refresh panel time without a concrete panel range.');
    }

    if (!isConcreteTimeRange(resolvedFullRange)) {
        throw new Error('Cannot refresh panel time without a concrete full range.');
    }

    return {
        panelRange: resolvedPanelRange,
        fullRange: resolvedFullRange,
    };
}

function hasConfiguredTimeRange(timeRangeConfig: TimeRangeConfig): boolean {
    return timeRangeConfig.start.kind !== 'empty' ||
        timeRangeConfig.end.kind !== 'empty';
}

function getCoveringNavigatorRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
): TimeRangeMs {
    return {
        startTime: Math.min(panelRange.startTime, navigatorRange.startTime),
        endTime: Math.max(panelRange.endTime, navigatorRange.endTime),
    };
}
