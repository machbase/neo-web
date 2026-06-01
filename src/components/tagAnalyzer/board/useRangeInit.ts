import { useRef } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries, type PanelSeriesDefinition } from '../domain/SeriesDomain';
import { resolveFullDataTimeRange, resolvePanelTimeRange } from '../domain/time/PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import type {
    PanelNavigatorRangePair,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import type { PanelRangeApplyOptions } from '../panel/PanelDataRuntimeState';
import { hasValidRangeState, type BoardPanelRecord } from './BoardPanelState';

type ApplyPanelRangeState = (
    panelInfo: PanelInfo,
    options: PanelRangeApplyOptions,
) => void;

type PanelRangeInitializationDependencies = {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    setPanelChartAreaWidth: (
        panelKey: string,
        chartAreaWidth: number | undefined,
    ) => void;
    applyPanelRangeState: ApplyPanelRangeState;
    applyGlobalRangeToPanel: (
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ) => void;
};

export function useRangeInit({
    boardTime,
    globalTimeRange,
    isActiveTab,
    getBoardPanelRecord,
    setPanelChartAreaWidth,
    applyPanelRangeState,
    applyGlobalRangeToPanel,
}: PanelRangeInitializationDependencies) {
    const initializedPanelKeysRef = useRef<Record<string, true>>({});

    async function initializePanelRange(panelInfo: PanelInfo): Promise<void> {
        const initialRange = await resolveInitialPanelRange(
            panelInfo.data.tag_set,
            panelInfo.time.range_config,
            panelInfo.general.use_last_viewed_range
                ? panelInfo.general.last_viewed_range
                : undefined,
            boardTime,
        );

        if (!hasValidRangeState(initialRange)) {
            throw new Error('Cannot initialize panel without a concrete range.');
        }

        applyPanelRangeState(panelInfo, {
            panelRange: initialRange.panelRange,
            navigatorRange: initialRange.navigatorRange,
            fullRange: initialRange.fullRange,
        });
    }

    function handleChartWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.data.index_key;

        setPanelChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            delete initializedPanelKeysRef.current[sPanelKey];
            return;
        }

        const sUpdatedBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (
            sUpdatedBoardPanelRecord.chartAreaWidth === undefined ||
            initializedPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializedPanelKeysRef.current[sPanelKey] = true;

        if (panelInfo.general.use_last_viewed_range) {
            void initializePanelRange(panelInfo);
            return;
        }

        if (
            globalTimeRange &&
            !hasNumericBaseTimeSeries(panelInfo.data.tag_set)
        ) {
            applyGlobalRangeToPanel(panelInfo, globalTimeRange);
            return;
        }

        void initializePanelRange(panelInfo);
    }

    return {
        initializePanelRange,
        handleChartWidthChange,
    };
}

async function resolveInitialPanelRange(
    seriesList: PanelSeriesDefinition[],
    rangeConfig: TimeRangeConfig,
    lastViewedRange: Partial<PanelNavigatorRangePair> | undefined,
    boardTime: TimeRangeConfig,
): Promise<PanelRangeState> {
    const [
        timeBoundaryRanges,
        fullDataBoundaryRanges,
    ] = await Promise.all([
        resolveTimeBoundaryRanges(seriesList, boardTime, rangeConfig),
        resolveSeriesTimeBoundaryRanges(seriesList),
    ]);
    const resolvedTimeBoundaryRanges = timeBoundaryRanges ?? null;
    const resolvedFullDataBoundaryRanges =
        fullDataBoundaryRanges ?? resolvedTimeBoundaryRanges;
    const resolvedRange = resolvePanelTimeRange({
        boardTime,
        panelTime: { rangeConfig },
        timeBoundaryRanges: resolvedTimeBoundaryRanges,
        mode: 'initialize',
    });
    const fullDataRange =
        resolveFullDataTimeRange(resolvedFullDataBoundaryRanges) ?? resolvedRange;
    const lastViewedPanelRange = lastViewedRange?.panelRange;
    const lastViewedNavigatorRange = lastViewedRange?.navigatorRange;

    if (
        isConcreteTimeRange(lastViewedPanelRange) &&
        isConcreteTimeRange(lastViewedNavigatorRange)
    ) {
        return {
            panelRange: lastViewedPanelRange,
            navigatorRange: lastViewedNavigatorRange,
            fullRange: fullDataRange,
        };
    }

    return {
        panelRange: resolvedRange,
        navigatorRange: getCoveringNavigatorRange(
            resolvedRange,
            fullDataRange,
        ),
        fullRange: fullDataRange,
    };
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
