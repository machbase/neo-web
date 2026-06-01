import { useRef } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import {
    resolvePanelAxesForRuntime,
    type PanelInfo,
    type PanelRangeState,
} from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/TimeTypes';
import {
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    hasConcretePanelRangeState,
    type BoardPanelRecord,
} from './BoardPanelState';
import type {
    PanelChartDataLoadConfig,
    PanelRangeApplyOptions,
    PanelRangeRefreshOptions,
} from '../panel/PanelDataRuntimeState';
import { getPanelContainerRuntimeProps as buildPanelContainerRuntimeProps } from './getPanelContainerRuntimeProps';
import { useRangeRefresh } from './useRangeRefresh';

function assertCanApplyRange(
    boardPanelRecord: BoardPanelRecord,
    panelRange: TimeRangeMs,
): void {
    if (!boardPanelRecord.chartAreaWidth) {
        throw new Error('Cannot refresh panel range before chart width is measured.');
    }

    if (!isConcreteTimeRange(panelRange)) {
        throw new Error('Cannot refresh panel range with an invalid panel range.');
    }
}

type RangeMutationContext = {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
};

type RangeMutationPanelStore = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateRangeState: (panelKey: string, patch: Partial<PanelRangeState>) => void;
    setChartAreaWidth: (panelKey: string, chartAreaWidth: number | undefined) => void;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
    requestDataRefresh: (
        panelKey: string,
        options?: PanelRangeRefreshOptions,
    ) => void;
};

type RangeMutationPersistence = {
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
};

type RangeMutationDependencies = {
    context: RangeMutationContext;
    panelStore: RangeMutationPanelStore;
    persistence: RangeMutationPersistence;
};

export function useBoardPanelRangeMutation({
    context,
    panelStore,
    persistence,
}: RangeMutationDependencies) {
    const { boardTime, globalTimeRange, isActiveTab } = context;
    const {
        getBoardPanelRecord,
        updateRangeState,
        setChartAreaWidth,
        normalizeNavigatorRangeForVisiblePanel,
        requestDataRefresh,
    } = panelStore;
    const { onAppliedRange } = persistence;
    const initializedPanelKeysRef = useRef<Record<string, true>>({});

    function commitRangeState(
        panelInfo: PanelInfo,
        rangeState: PanelRangeState,
        options: PanelRangeRefreshOptions = {},
    ): void {
        const sPanelKey = panelInfo.data.index_key;

        updateRangeState(sPanelKey, rangeState);
        onAppliedRange(panelInfo, rangeState);
        requestDataRefresh(sPanelKey, options);
    }

    function applyRange(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange = panelRange,
            fullRange,
            ...refreshOptions
        }: PanelRangeApplyOptions,
    ): void {
        const sPanelKey = panelInfo.data.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        assertCanApplyRange(sBoardPanelRecord, panelRange);

        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelKey,
            panelRange,
            navigatorRange,
        );

        commitRangeState(
            panelInfo,
            {
                panelRange,
                navigatorRange: sNavigatorRange,
                fullRange: fullRange ?? sNavigatorRange,
            },
            {
                ...refreshOptions,
                forceReload: true,
            },
        );
    }

    function refreshVisibleRange(
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        {
            preserveNavigatorRange = false,
            forceReload = false,
            dataLoadConfigOverride,
            forceRawMainSampling,
            clampPanelRangeToLoadedDataRange,
            fullRange,
            skipDataRefresh,
        }: PanelRangeRefreshOptions = {},
    ): void {
        const sPanelKey = panelInfo.data.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        assertCanApplyRange(sBoardPanelRecord, panelRange);

        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelKey,
            panelRange,
            navigatorRange,
        );
        const sCurrentRangeState = sBoardPanelRecord.rangeState;
        const sFullRange =
            fullRange ??
            (isConcreteTimeRange(sCurrentRangeState.fullRange)
                ? sCurrentRangeState.fullRange
                : sNavigatorRange);
        const sRangeChanged = hasVisibleTimeRangeChanged(
            panelRange,
            sNavigatorRange,
            sCurrentRangeState,
        ) || !isSameTimeRange(sFullRange, sCurrentRangeState.fullRange);
        const sHasLoadConfigOverride = dataLoadConfigOverride !== undefined;

        if (
            !sRangeChanged &&
            !forceReload &&
            !sHasLoadConfigOverride &&
            !forceRawMainSampling &&
            !clampPanelRangeToLoadedDataRange &&
            !skipDataRefresh
        ) {
            return;
        }

        commitRangeState(
            panelInfo,
            {
                panelRange,
                navigatorRange: sNavigatorRange,
                fullRange: sFullRange,
            },
            {
                preserveNavigatorRange,
                forceReload,
                dataLoadConfigOverride,
                forceRawMainSampling,
                clampPanelRangeToLoadedDataRange,
                skipDataRefresh,
            },
        );
    }

    function refreshCurrentRange(
        panelInfo: PanelInfo,
        options: PanelRangeRefreshOptions = {},
    ): void {
        const sRangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        refreshVisibleRange(
            panelInfo,
            sRangeState.panelRange,
            sRangeState.navigatorRange,
            options,
        );
    }

    async function refreshDataRange(panelInfo: PanelInfo): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        if (!hasConcretePanelRangeState(sRangeState)) {
            await rangeRefresh.refreshFullRange(panelInfo);
            return;
        }

        refreshCurrentRange(panelInfo, {
            forceReload: true,
            preserveNavigatorRange: true,
            clampPanelRangeToLoadedDataRange: panelInfo.general.is_raw,
        });
    }

    const rangeRefresh = useRangeRefresh({
        boardTime,
        getBoardPanelRecord,
        applyRange,
        refreshVisibleRange,
    });

    function applyGlobalRange(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): void {
        if (hasNumericBaseTimeSeries(panelInfo.data.tag_set)) {
            return;
        }

        applyRange(panelInfo, {
            panelRange: globalTimeRangeToApply.data,
            navigatorRange: globalTimeRangeToApply.navigator,
            fullRange: globalTimeRangeToApply.navigator,
        });
    }

    function markPanelUninitialized(panelKey: string): void {
        delete initializedPanelKeysRef.current[panelKey];
    }

    function handleChartAreaWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.data.index_key;

        setChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            markPanelUninitialized(sPanelKey);
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
            void rangeRefresh.initializeRange(panelInfo);
            return;
        }

        void (
            globalTimeRange &&
            !hasNumericBaseTimeSeries(panelInfo.data.tag_set)
                ? applyGlobalRange(panelInfo, globalTimeRange)
                : rangeRefresh.initializeRange(panelInfo)
        );
    }

    function reloadRawMode(nextPanelInfo: PanelInfo): void {
        const sRangeState = getBoardPanelRecord(nextPanelInfo.data.index_key).rangeState;
        const sShouldPreserveLiveRange =
            nextPanelInfo.general.use_last_viewed_range &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (nextPanelInfo.general.use_last_viewed_range && !sShouldPreserveLiveRange) {
            void rangeRefresh.refreshFullRange(nextPanelInfo);
            return;
        }

        refreshCurrentRange(nextPanelInfo, {
            forceReload: true,
            preserveNavigatorRange: sShouldPreserveLiveRange,
            forceRawMainSampling: nextPanelInfo.general.is_raw,
            clampPanelRangeToLoadedDataRange: nextPanelInfo.general.is_raw,
            dataLoadConfigOverride: {
                isRaw: nextPanelInfo.general.is_raw,
            },
        });
    }

    function reloadPanelEdit(nextPanelInfo: PanelInfo): void {
        const sRuntimeAxes = resolvePanelAxesForRuntime(nextPanelInfo.axes);
        const sDataLoadConfigOverride: Partial<PanelChartDataLoadConfig> = {
            seriesList: nextPanelInfo.data.tag_set,
            queryLimit: nextPanelInfo.data.count ?? -1,
            intervalType: nextPanelInfo.data.interval_type,
            isRaw: nextPanelInfo.general.is_raw,
            xAxis: sRuntimeAxes.x_axis,
            mainChartSampling: sRuntimeAxes.main_chart_sampling,
        };
        const sRangeState = getBoardPanelRecord(nextPanelInfo.data.index_key).rangeState;
        const sLastViewedRange = nextPanelInfo.general.last_viewed_range;
        const sShouldPreserveLiveRange =
            nextPanelInfo.general.use_last_viewed_range &&
            isConcreteTimeRange(sLastViewedRange?.panelRange) &&
            isConcreteTimeRange(sLastViewedRange?.navigatorRange) &&
            isConcreteTimeRange(sRangeState.panelRange) &&
            isConcreteTimeRange(sRangeState.navigatorRange);

        if (sShouldPreserveLiveRange) {
            refreshCurrentRange(nextPanelInfo, {
                forceReload: true,
                preserveNavigatorRange: true,
                clampPanelRangeToLoadedDataRange: nextPanelInfo.general.is_raw,
                dataLoadConfigOverride: sDataLoadConfigOverride,
            });
            return;
        }

        void rangeRefresh.initializeRange(nextPanelInfo, {
            dataLoadConfigOverride: sDataLoadConfigOverride,
        });
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) =>
            buildPanelContainerRuntimeProps({
                panelInfo,
                getBoardPanelRecord,
                refreshVisibleRange,
            }),
        handleChartAreaWidthChange,
        refreshDataRange,
        refreshTimeRange: rangeRefresh.refreshTimeRange,
        applyBoardRange: rangeRefresh.applyBoardRange,
        applyGlobalRange,
        reloadRawMode,
        reloadPanelEdit,
    };
}
