import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries, type PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import { convertTimeRangeConfigToTimeRangeMs } from '../domain/time/TimeBoundaryConverters';
import { resolveFullDataTimeRange, resolvePanelTimeRange } from '../domain/time/PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import type { PanelNavigatorRangePair, TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import { clampTimeRangeToBounds, isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import type {
    BoardPanelRecord,
} from './BoardPanelState';
import type {
    PanelRangeApplyOptions,
    PanelRangeRefreshOptions,
} from '../panel/PanelDataRuntimeState';
import { hasConcretePanelRangeState } from './BoardPanelState';

type RangeRefreshDependencies = {
    boardTime: TimeRangeConfig;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyRange: (
        panelInfo: PanelInfo,
        options: PanelRangeApplyOptions,
    ) => void;
    refreshVisibleRange: (
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        options?: PanelRangeRefreshOptions,
    ) => void;
};

export function useRangeRefresh({
    boardTime,
    getBoardPanelRecord,
    applyRange,
    refreshVisibleRange,
}: RangeRefreshDependencies) {
    async function initializeRange(
        panelInfo: PanelInfo,
        options: PanelRangeRefreshOptions = {},
    ): Promise<void> {
        const initialRange = await resolveInitialPanelRange(
            panelInfo.data.tag_set,
            panelInfo.time.range_config,
            panelInfo.general.use_last_viewed_range
                ? panelInfo.general.last_viewed_range
                : undefined,
            boardTime,
        );

        if (!hasConcretePanelRangeState(initialRange)) {
            return;
        }

        applyRange(panelInfo, {
            panelRange: initialRange.panelRange,
            navigatorRange: initialRange.navigatorRange,
            ...options,
            clampPanelRangeToLoadedDataRange:
                options.clampPanelRangeToLoadedDataRange ??
                panelInfo.general.is_raw,
        });
    }

    async function refreshFullRange(panelInfo: PanelInfo): Promise<void> {
        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);

        if (!isConcreteTimeRange(fullDataRange)) {
            return;
        }

        applyRange(panelInfo, {
            panelRange: fullDataRange,
            navigatorRange: fullDataRange,
            clampPanelRangeToLoadedDataRange: panelInfo.general.is_raw,
        });
    }

    async function refreshTimeRange(panelInfo: PanelInfo): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        if (
            !hasConcretePanelRangeState(rangeState) ||
            !panelInfo.general.use_last_viewed_range
        ) {
            await refreshFullRange(panelInfo);
            return;
        }

        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);
        if (!isConcreteTimeRange(fullDataRange)) {
            return;
        }

        const panelRange = clampTimeRangeToBounds(rangeState.panelRange, fullDataRange);

        refreshVisibleRange(panelInfo, panelRange, fullDataRange, {
            forceReload: true,
            preserveNavigatorRange: true,
            clampPanelRangeToLoadedDataRange: panelInfo.general.is_raw,
        });
    }

    async function applyBoardRange(
        panelInfo: PanelInfo,
        boardTimeToApply: TimeRangeConfig,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.data.tag_set)) {
            return;
        }

        const boardRange = await resolveBoardRange(
            panelInfo.data.tag_set,
            boardTimeToApply,
        );

        if (!isConcreteTimeRange(boardRange)) {
            return;
        }

        applyRange(panelInfo, {
            panelRange: boardRange,
            navigatorRange: boardRange,
        });
    }

    return {
        initializeRange,
        refreshFullRange,
        refreshTimeRange,
        applyBoardRange,
    };
}

async function resolveInitialPanelRange(
    seriesList: PanelSeriesDefinition[],
    rangeConfig: TimeRangeConfig,
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined,
    boardTime: TimeRangeConfig,
): Promise<PanelRangeState> {
    const timeBoundaryRanges =
        (await resolveTimeBoundaryRanges(seriesList, boardTime, rangeConfig)) ?? null;
    const resolvedRange = resolvePanelTimeRange({
        boardTime,
        panelTime: { rangeConfig },
        timeBoundaryRanges,
        mode: 'initialize',
    });
    const lastViewedPanelRange = lastViewedRange?.panelRange;
    const lastViewedNavigatorRange = lastViewedRange?.navigatorRange;

    if (
        isConcreteTimeRange(lastViewedPanelRange) &&
        isConcreteTimeRange(lastViewedNavigatorRange)
    ) {
        return { panelRange: lastViewedPanelRange, navigatorRange: lastViewedNavigatorRange };
    }

    return { panelRange: resolvedRange, navigatorRange: resolvedRange };
}

async function resolveBoardRange(
    seriesList: PanelSeriesDefinition[],
    boardTime: TimeRangeConfig,
): Promise<TimeRangeMs> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;
    const boardRange = convertTimeRangeConfigToTimeRangeMs(
        boardTime,
        boundaryRanges?.end.max.timestamp,
    );

    return isConcreteTimeRange(boardRange)
        ? boardRange
        : resolveFullDataTimeRange(boundaryRanges) ?? EMPTY_TIME_RANGE;
}

async function resolveFullRange(seriesList: PanelSeriesDefinition[]): Promise<TimeRangeMs> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;

    return resolveFullDataTimeRange(boundaryRanges) ?? EMPTY_TIME_RANGE;
}
