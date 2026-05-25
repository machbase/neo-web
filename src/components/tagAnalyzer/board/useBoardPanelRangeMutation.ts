import { useRef } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type {
    PanelInfo,
    PanelNavigatorShiftActions,
    PanelRangeChangeEvent,
    PanelRangeHandlers,
    PanelRangeState,
    PanelZoomActions,
} from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import type {
    FetchedTimeBoundaryRange,
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { convertTimeRangeConfigToTimeRangeMs } from '../domain/time/TimeBoundaryConverters';
import {
    resolveFullDataTimeRange,
    resolvePanelTimeRange,
} from '../domain/time/PanelTimeRangeResolver';
import {
    resolveSeriesTimeBoundaryRanges,
    resolveTimeBoundaryRanges,
} from '../domain/time/TimeBoundaryRangeResolver';
import {
    clampTimeRangeToBounds,
    createTimeRangeMs,
    ensureMinimumTimeRangeWidth,
    getTimeRangeCenter,
    getTimeRangeWidth,
    hasVisibleTimeRangeChanged,
    isConcreteTimeRange,
    isSameTimeRange,
    isTimeRangeOutsideBounds,
    shiftTimeRange,
} from '../domain/time/TimeRangeUtils';
import {
    PanelChartLoadStatus,
    type BoardPanelRecord,
    type PanelDataRefreshResult,
    type PanelRangeApplyOptions,
    type PanelRangeInitializeOptions,
    type PanelRangeRefreshOptions,
    type PanelRangeResolutionState,
} from './BoardPanelState';

const MIN_NAVIGATOR_RANGE_MS = 1000;
const MIN_PANEL_RANGE_MS = 10;
const MIN_FOCUSABLE_PANEL_RANGE_MS = 1000;
const MIN_NUMERIC_RANGE_WIDTH = 0.000001;
const NUMERIC_RANGE_WIDTH_FRACTION = 0.000001;
const RANGE_SHIFT_FRACTION = 0.1;
const MAX_PANEL_END_TIME = 9999999999999;

type RangeDirection = 'left' | 'right';

const EMPTY_LAST_VIEWED_RANGE = {
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
};

function hasConcreteRangeState(rangeState: PanelRangeState): boolean {
    return (
        isConcreteTimeRange(rangeState.panelRange) &&
        isConcreteTimeRange(rangeState.navigatorRange)
    );
}

function getRangeResolutionState(panelInfo: PanelInfo): PanelRangeResolutionState {
    return {
        seriesList: panelInfo.data.tag_set,
        rangeConfig: panelInfo.time.rangeConfig,
        lastViewedRange: panelInfo.time.useLastViewedRange
            ? panelInfo.time.lastViewedRange ?? EMPTY_LAST_VIEWED_RANGE
            : EMPTY_LAST_VIEWED_RANGE,
    };
}

function isNumericPanelRange(panelInfo: PanelInfo): boolean {
    return hasNumericBaseTimeSeries(panelInfo.data.tag_set);
}

function getMinimumNumericRangeWidth(referenceRange: TimeRangeMs): number {
    const sReferenceWidth = Math.abs(getTimeRangeWidth(referenceRange));

    return Math.max(
        Number.isFinite(sReferenceWidth)
            ? sReferenceWidth * NUMERIC_RANGE_WIDTH_FRACTION
            : 0,
        MIN_NUMERIC_RANGE_WIDTH,
    );
}

function ensureMinimumAxisRangeWidth(
    range: TimeRangeMs,
    referenceRange: TimeRangeMs,
    isNumericXAxis: boolean,
    minimumDateTimeRangeMs: number,
): TimeRangeMs {
    if (!isNumericXAxis) {
        return ensureMinimumTimeRangeWidth(range, minimumDateTimeRangeMs);
    }

    if (range.endTime > range.startTime) {
        return range;
    }

    return createTimeRangeMs(
        range.startTime,
        range.startTime + getMinimumNumericRangeWidth(referenceRange),
    );
}

function getNextRangeResolutionState(
    panelInfo: PanelInfo,
    rangeStateOverride?: Partial<PanelRangeResolutionState>,
): PanelRangeResolutionState {
    return {
        ...getRangeResolutionState(panelInfo),
        ...rangeStateOverride,
    };
}

async function resolveInitialPanelRange(
    rangeState: PanelRangeResolutionState,
    boardTime: TimeRangeConfig,
): Promise<PanelRangeState> {
    const sResolvedRange = resolvePanelTimeRange({
        boardTime: boardTime,
        panelTime: {
            rangeConfig: rangeState.rangeConfig,
        },
        timeBoundaryRanges: await resolveFreshTimeBoundaryRanges(
            rangeState,
            boardTime,
        ),
        mode: 'initialize',
    });
    const sLastViewedPanelRange = rangeState.lastViewedRange?.panelRange;
    const sLastViewedNavigatorRange = rangeState.lastViewedRange?.navigatorRange;

    if (
        isConcreteTimeRange(sLastViewedPanelRange) &&
        isConcreteTimeRange(sLastViewedNavigatorRange)
    ) {
        return {
            panelRange: sLastViewedPanelRange,
            navigatorRange: sLastViewedNavigatorRange,
        };
    }

    return {
        panelRange: sResolvedRange,
        navigatorRange: sResolvedRange,
    };
}

async function resolveFreshTimeBoundaryRanges(
    rangeState: PanelRangeResolutionState,
    boardTime: TimeRangeConfig,
): Promise<FetchedTimeBoundaryRange | null> {
    return (
        (await resolveTimeBoundaryRanges(
            rangeState.seriesList,
            boardTime,
            rangeState.rangeConfig,
        )) ?? null
    );
}

async function resolveBoardRange(
    rangeState: PanelRangeResolutionState,
    boardTime: TimeRangeConfig,
): Promise<TimeRangeMs> {
    const sBoundaryRanges =
        (await resolveSeriesTimeBoundaryRanges(rangeState.seriesList)) ?? null;
    const sBoardRange = convertTimeRangeConfigToTimeRangeMs(
        boardTime,
        sBoundaryRanges?.end.max.timestamp,
    );

    return isConcreteTimeRange(sBoardRange)
        ? sBoardRange
        : resolveFullDataTimeRange(sBoundaryRanges) ?? EMPTY_TIME_RANGE;
}

function shouldReloadPanelData({
    panelRange,
    forceReload = false,
    hasLoadConfigOverride,
    loadedDataRange,
}: {
    panelRange: TimeRangeMs;
    forceReload?: boolean;
    hasLoadConfigOverride: boolean;
    loadedDataRange: TimeRangeMs;
}): boolean {
    return (
        forceReload ||
        hasLoadConfigOverride ||
        !isConcreteTimeRange(loadedDataRange) ||
        !isSameTimeRange(panelRange, loadedDataRange)
    );
}

export function useBoardPanelRangeMutation({
    boardTime,
    globalTimeRange,
    isActiveTab,
    getBoardPanelRecord,
    updateRangeState,
    setChartAreaWidth,
    normalizeNavigatorRangeForVisiblePanel,
    loadPanelData,
    loadNavigatorData,
    onAppliedRange,
}: {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    updateRangeState: (panelKey: string, patch: Partial<PanelRangeState>) => void;
    setChartAreaWidth: (
        panelKey: string,
        chartAreaWidth: number | undefined,
    ) => void;
    normalizeNavigatorRangeForVisiblePanel: (
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ) => TimeRangeMs;
    loadPanelData: (
        panelInfo: PanelInfo,
        options: PanelRangeApplyOptions,
    ) => Promise<PanelDataRefreshResult>;
    loadNavigatorData: (
        panelInfo: PanelInfo,
        options: PanelRangeApplyOptions,
    ) => Promise<PanelDataRefreshResult>;
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
}) {
    const initializedPanelKeysRef = useRef<Record<string, true>>({});

    function shouldReloadNavigatorData(
        boardPanelRecord: BoardPanelRecord,
        navigatorRange: TimeRangeMs,
        forceReload: boolean,
        hasLoadConfigOverride: boolean,
    ): boolean {
        return (
            forceReload ||
            hasLoadConfigOverride ||
            !isConcreteTimeRange(
                boardPanelRecord.chartDataState.loadedNavigatorRange,
            ) ||
            !isSameTimeRange(
                navigatorRange,
                boardPanelRecord.chartDataState.loadedNavigatorRange,
            )
        );
    }

    function commitAppliedRange(
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ): void {
        const sAppliedRange = {
            panelRange,
            navigatorRange,
        };

        updateRangeState(panelInfo.meta.index_key, sAppliedRange);
        onAppliedRange(panelInfo, sAppliedRange);
    }

    async function applyRange(
        panelInfo: PanelInfo,
        {
            panelRange,
            navigatorRange = panelRange,
            dataLoadConfigOverride,
        }: PanelRangeApplyOptions,
    ): Promise<void> {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (
            !sBoardPanelRecord.chartAreaWidth ||
            sBoardPanelRecord.chartLoadStatus === PanelChartLoadStatus.Loading ||
            !isConcreteTimeRange(panelRange)
        ) {
            return;
        }

        const sNavigatorRange = normalizeNavigatorRangeForVisiblePanel(
            sPanelKey,
            panelRange,
            navigatorRange,
        );

        updateRangeState(sPanelKey, {
            panelRange,
            navigatorRange: sNavigatorRange,
        });

        const sRefreshResult = await loadPanelData(panelInfo, {
            panelRange,
            navigatorRange: sNavigatorRange,
            dataLoadConfigOverride,
            reloadNavigatorData: shouldReloadNavigatorData(
                sBoardPanelRecord,
                sNavigatorRange,
                false,
                dataLoadConfigOverride !== undefined,
            ),
        });
        if (sRefreshResult.isStale) {
            return;
        }

        commitAppliedRange(
            panelInfo,
            sRefreshResult.panelRange ?? panelRange,
            sRefreshResult.navigatorRange ?? sNavigatorRange,
        );
    }

    async function refreshVisibleRange(
        panelInfo: PanelInfo,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        {
            preserveNavigatorRange = false,
            forceReload = false,
            dataLoadConfigOverride,
            forceRawMainSampling,
        }: PanelRangeRefreshOptions = {},
    ): Promise<void> {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        if (
            !sBoardPanelRecord.chartAreaWidth ||
            sBoardPanelRecord.chartLoadStatus === PanelChartLoadStatus.Loading ||
            !isConcreteTimeRange(panelRange)
        ) {
            return;
        }

        const sNavigatorRange = preserveNavigatorRange
            ? navigatorRange
            : normalizeNavigatorRangeForVisiblePanel(sPanelKey, panelRange, navigatorRange);
        const sCurrentRangeState = sBoardPanelRecord.rangeState;
        const sRangeChanged = hasVisibleTimeRangeChanged(
            panelRange,
            sNavigatorRange,
            sCurrentRangeState,
        );
        const sHasLoadConfigOverride = dataLoadConfigOverride !== undefined;

        if (!sRangeChanged && !forceReload && !sHasLoadConfigOverride) {
            return;
        }

        const sNavigatorRangeChanged = !isSameTimeRange(
            sNavigatorRange,
            sCurrentRangeState.navigatorRange,
        );
        const sPanelRangeChanged = !isSameTimeRange(
            panelRange,
            sCurrentRangeState.panelRange,
        );

        updateRangeState(sPanelKey, {
            panelRange,
            navigatorRange: sNavigatorRange,
        });

        let sRefreshResult: PanelDataRefreshResult = {
            isStale: false,
            panelRange,
            navigatorRange: sNavigatorRange,
        };

        if (
            sNavigatorRangeChanged &&
            !sPanelRangeChanged &&
            !forceReload &&
            !sHasLoadConfigOverride
        ) {
            if (
                shouldReloadNavigatorData(
                    sBoardPanelRecord,
                    sNavigatorRange,
                    forceReload,
                    sHasLoadConfigOverride,
                )
            ) {
                sRefreshResult = await loadNavigatorData(panelInfo, {
                    panelRange,
                    navigatorRange: sNavigatorRange,
                    dataLoadConfigOverride,
                });
            }
        } else if (
            shouldReloadPanelData({
                panelRange,
                forceReload,
                hasLoadConfigOverride: sHasLoadConfigOverride,
                loadedDataRange: sBoardPanelRecord.chartDataState.loadedDataRange,
            })
        ) {
            sRefreshResult = await loadPanelData(panelInfo, {
                panelRange,
                navigatorRange: sNavigatorRange,
                dataLoadConfigOverride,
                preserveNavigatorRange,
                forceRawMainSampling,
                reloadNavigatorData: shouldReloadNavigatorData(
                    sBoardPanelRecord,
                    sNavigatorRange,
                    forceReload,
                    sHasLoadConfigOverride,
                ),
            });
        }
        if (sRefreshResult.isStale) {
            return;
        }

        commitAppliedRange(
            panelInfo,
            sRefreshResult.panelRange ?? panelRange,
            sRefreshResult.navigatorRange ?? sNavigatorRange,
        );
    }

    async function refreshCurrentRange(
        panelInfo: PanelInfo,
        options: PanelRangeRefreshOptions = {},
    ): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        await refreshVisibleRange(
            panelInfo,
            sRangeState.panelRange,
            sRangeState.navigatorRange,
            options,
        );
    }

    async function initializeRange(
        panelInfo: PanelInfo,
        options: PanelRangeInitializeOptions = {},
    ): Promise<void> {
        const sInitialRange = await resolveInitialPanelRange(
            getNextRangeResolutionState(panelInfo, options.rangeStateOverride),
            boardTime,
        );

        await applyRange(panelInfo, {
            panelRange: sInitialRange.panelRange,
            navigatorRange: sInitialRange.navigatorRange,
            dataLoadConfigOverride: options.dataLoadConfigOverride,
        });
    }

    async function resolveFullRange(panelInfo: PanelInfo): Promise<TimeRangeMs> {
        const sRangeState = getRangeResolutionState(panelInfo);
        const sBoundaryRanges =
            (await resolveSeriesTimeBoundaryRanges(sRangeState.seriesList)) ?? null;

        return resolveFullDataTimeRange(sBoundaryRanges) ?? EMPTY_TIME_RANGE;
    }

    async function refreshFullRange(panelInfo: PanelInfo): Promise<void> {
        const sFullDataRange = await resolveFullRange(panelInfo);

        await applyRange(panelInfo, {
            panelRange: sFullDataRange,
            navigatorRange: sFullDataRange,
        });
    }

    function shouldPreserveLiveRange(panelInfo: PanelInfo): boolean {
        return (
            panelInfo.time.useLastViewedRange &&
            hasConcreteRangeState(
                getBoardPanelRecord(panelInfo.meta.index_key).rangeState,
            )
        );
    }

    async function refreshDataRange(panelInfo: PanelInfo): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        if (!hasConcreteRangeState(sRangeState)) {
            await refreshFullRange(panelInfo);
            return;
        }

        await refreshCurrentRange(panelInfo, {
            forceReload: true,
            preserveNavigatorRange: true,
            forceRawMainSampling: true,
        });
    }

    async function refreshTimeRange(panelInfo: PanelInfo): Promise<void> {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;

        if (!hasConcreteRangeState(sRangeState)) {
            await refreshFullRange(panelInfo);
            return;
        }

        if (!panelInfo.time.useLastViewedRange) {
            await refreshFullRange(panelInfo);
            return;
        }

        const sFullDataRange = await resolveFullRange(panelInfo);
        const sPanelRange = clampTimeRangeToBounds(
            sRangeState.panelRange,
            sFullDataRange,
        );

        await refreshVisibleRange(panelInfo, sPanelRange, sFullDataRange, {
            forceReload: true,
            preserveNavigatorRange: true,
            forceRawMainSampling: true,
        });
    }

    async function applyBoardRange(
        panelInfo: PanelInfo,
        boardTimeToApply: TimeRangeConfig,
    ): Promise<void> {
        if (isNumericPanelRange(panelInfo)) {
            return;
        }

        const sBoardRange = await resolveBoardRange(
            getRangeResolutionState(panelInfo),
            boardTimeToApply,
        );

        await applyRange(panelInfo, {
            panelRange: sBoardRange,
            navigatorRange: sBoardRange,
        });
    }

    async function applyGlobalRange(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState | undefined,
    ): Promise<void> {
        if (
            !globalTimeRangeToApply ||
            isNumericPanelRange(panelInfo)
        ) {
            return;
        }

        await applyRange(panelInfo, {
            panelRange: globalTimeRangeToApply.data,
            navigatorRange: globalTimeRangeToApply.navigator,
        });
    }

    function handleNavigatorRangeChange(
        panelInfo: PanelInfo,
        event: PanelRangeChangeEvent,
    ): void {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sIsNumericXAxis = isNumericPanelRange(panelInfo);
        const sNavigatorRange = ensureMinimumAxisRangeWidth(
            {
                startTime: event.min,
                endTime: event.max,
            },
            sRangeState.navigatorRange,
            sIsNumericXAxis,
            MIN_NAVIGATOR_RANGE_MS,
        );

        void refreshVisibleRange(panelInfo, sRangeState.panelRange, sNavigatorRange);
    }

    function handlePanelRangeChange(
        panelInfo: PanelInfo,
        event: PanelRangeChangeEvent,
    ): void {
        if (event.min === undefined || event.max === undefined) {
            return;
        }

        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sIsNumericXAxis = isNumericPanelRange(panelInfo);
        const sPanelRange = clampTimeRangeToBounds(
            ensureMinimumAxisRangeWidth(
                createTimeRangeMs(event.min, event.max),
                sRangeState.navigatorRange,
                sIsNumericXAxis,
                MIN_PANEL_RANGE_MS,
            ),
            sRangeState.navigatorRange,
        );

        void refreshVisibleRange(panelInfo, sPanelRange, sRangeState.navigatorRange, {
            preserveNavigatorRange: event.trigger === 'navigator',
        });
    }

    function shiftPanelRange(panelInfo: PanelInfo, direction: RangeDirection): void {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sOffset =
            getTimeRangeWidth(sRangeState.panelRange) *
            RANGE_SHIFT_FRACTION *
            (direction === 'left' ? -1 : 1);
        const sPanelRange = shiftTimeRange(sRangeState.panelRange, sOffset);
        const sNavigatorRange =
            direction === 'left' &&
            sPanelRange.startTime < sRangeState.navigatorRange.startTime
                ? createTimeRangeMs(
                      sPanelRange.startTime,
                      sRangeState.navigatorRange.endTime + sOffset,
                  )
                : direction === 'right' &&
                    sPanelRange.endTime > sRangeState.navigatorRange.endTime
                  ? createTimeRangeMs(
                        sRangeState.navigatorRange.startTime + sOffset,
                        sPanelRange.endTime,
                    )
                  : sRangeState.navigatorRange;

        void refreshVisibleRange(panelInfo, sPanelRange, sNavigatorRange);
    }

    function shiftNavigatorRange(panelInfo: PanelInfo, direction: RangeDirection): void {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sOffset =
            getTimeRangeWidth(sRangeState.navigatorRange) *
            RANGE_SHIFT_FRACTION *
            (direction === 'left' ? -1 : 1);
        const sNavigatorRange = shiftTimeRange(sRangeState.navigatorRange, sOffset);

        void refreshVisibleRange(
            panelInfo,
            clampTimeRangeToBounds(sRangeState.panelRange, sNavigatorRange),
            sNavigatorRange,
        );
    }

    function zoomInPanelRange(panelInfo: PanelInfo, zoom: number): void {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
        const sIsNumericXAxis = isNumericPanelRange(panelInfo);
        const sPanelRange = ensureMinimumAxisRangeWidth(
            createTimeRangeMs(
                sRangeState.panelRange.startTime + sOffset,
                sRangeState.panelRange.endTime - sOffset,
            ),
            sRangeState.panelRange,
            sIsNumericXAxis,
            MIN_PANEL_RANGE_MS,
        );

        void refreshVisibleRange(panelInfo, sPanelRange, sRangeState.navigatorRange);
    }

    function zoomOutPanelRange(panelInfo: PanelInfo, zoom: number): void {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sOffset = getTimeRangeWidth(sRangeState.panelRange) * zoom;
        const sExpandedStartTime = sRangeState.panelRange.startTime - sOffset;
        const sIsNumericXAxis = isNumericPanelRange(panelInfo);
        const sExpandedEndTime = sRangeState.panelRange.endTime + sOffset;
        const sNextStartTime = sIsNumericXAxis || sExpandedStartTime > 0
            ? sExpandedStartTime
            : sRangeState.navigatorRange.startTime;
        const sNextEndTime = sIsNumericXAxis
            ? sExpandedEndTime
            : Math.min(sExpandedEndTime, MAX_PANEL_END_TIME);
        const sPanelRange = createTimeRangeMs(
            sNextStartTime,
            sNextEndTime,
        );
        const sNavigatorRange = isTimeRangeOutsideBounds(
            sPanelRange,
            sRangeState.navigatorRange,
        )
            ? sPanelRange
            : sRangeState.navigatorRange;

        void refreshVisibleRange(panelInfo, sPanelRange, sNavigatorRange);
    }

    function focusPanelRange(panelInfo: PanelInfo): void {
        const sRangeState = getBoardPanelRecord(panelInfo.meta.index_key).rangeState;
        const sPanelWidth = getTimeRangeWidth(sRangeState.panelRange);
        const sIsNumericXAxis = isNumericPanelRange(panelInfo);
        const sMinimumFocusableWidth = sIsNumericXAxis
            ? getMinimumNumericRangeWidth(sRangeState.navigatorRange)
            : MIN_FOCUSABLE_PANEL_RANGE_MS;

        if (sPanelWidth < sMinimumFocusableWidth) {
            return;
        }

        const sPanelCenterTime = getTimeRangeCenter(sRangeState.panelRange);
        const sFocusedNavigatorWidth = Math.min(
            Math.max(sPanelWidth, getTimeRangeWidth(sRangeState.navigatorRange) / 2),
            getTimeRangeWidth(sRangeState.navigatorRange),
        );
        const sNavigatorStartTime = Math.min(
            Math.max(
                sPanelCenterTime - sFocusedNavigatorWidth / 2,
                sRangeState.navigatorRange.startTime,
            ),
            sRangeState.navigatorRange.endTime - sFocusedNavigatorWidth,
        );

        void refreshVisibleRange(
            panelInfo,
            createTimeRangeMs(
                sPanelCenterTime - sPanelWidth * 0.1,
                sPanelCenterTime + sPanelWidth * 0.1,
            ),
            createTimeRangeMs(
                sNavigatorStartTime,
                sNavigatorStartTime + sFocusedNavigatorWidth,
            ),
        );
    }

    function clearInitializedPanel(panelKey: string): void {
        if (!initializedPanelKeysRef.current[panelKey]) {
            return;
        }

        const sNextInitializedPanelKeys = { ...initializedPanelKeysRef.current };

        delete sNextInitializedPanelKeys[panelKey];

        initializedPanelKeysRef.current = sNextInitializedPanelKeys;
    }

    function initializePanelAfterWidthChange(panelInfo: PanelInfo): void {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (!isActiveTab) {
            clearInitializedPanel(sPanelKey);
            return;
        }

        if (
            sBoardPanelRecord.chartAreaWidth === undefined ||
            sBoardPanelRecord.chartLoadStatus === PanelChartLoadStatus.Loading ||
            initializedPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializedPanelKeysRef.current = {
            ...initializedPanelKeysRef.current,
            [sPanelKey]: true,
        };

        if (panelInfo.time.useLastViewedRange) {
            const sLastViewedRange = panelInfo.time.lastViewedRange;

            void (
                isConcreteTimeRange(sLastViewedRange?.panelRange) &&
                isConcreteTimeRange(sLastViewedRange?.navigatorRange)
                    ? initializeRange(panelInfo)
                    : refreshFullRange(panelInfo)
            );
            return;
        }

        void (globalTimeRange && !isNumericPanelRange(panelInfo)
            ? applyGlobalRange(panelInfo, globalTimeRange)
            : initializeRange(panelInfo));
    }

    function handleChartAreaWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.meta.index_key;

        setChartAreaWidth(sPanelKey, width);

        if (width === undefined) {
            clearInitializedPanel(sPanelKey);
            return;
        }

        initializePanelAfterWidthChange(panelInfo);
    }

    function getPanelContainerRuntimeProps(panelInfo: PanelInfo) {
        const sPanelKey = panelInfo.meta.index_key;
        const sBoardPanelRecord = getBoardPanelRecord(sPanelKey);
        const rangeHandlers: PanelRangeHandlers = {
            onPanelRangeChange: (event) => handlePanelRangeChange(panelInfo, event),
            onNavigatorRangeChange: (event) =>
                handleNavigatorRangeChange(panelInfo, event),
            onShiftPanelRangeLeft: () => shiftPanelRange(panelInfo, 'left'),
            onShiftPanelRangeRight: () => shiftPanelRange(panelInfo, 'right'),
        };
        const navigatorShiftActions: PanelNavigatorShiftActions = {
            onShiftLeft: () => shiftNavigatorRange(panelInfo, 'left'),
            onShiftRight: () => shiftNavigatorRange(panelInfo, 'right'),
        };
        const navigatorZoomActions: PanelZoomActions = {
            onZoomIn: (zoom) => zoomInPanelRange(panelInfo, zoom),
            onZoomOut: (zoom) => zoomOutPanelRange(panelInfo, zoom),
            onFocus: () => focusPanelRange(panelInfo),
        };

        return {
            panelRange: sBoardPanelRecord.rangeState.panelRange,
            navigatorRange: sBoardPanelRecord.rangeState.navigatorRange,
            chartData: sBoardPanelRecord.chartDataState.chartData,
            navigatorChartData:
                sBoardPanelRecord.chartDataState.navigatorChartData,
            resolvedIntervalOption:
                sBoardPanelRecord.chartDataState.resolvedIntervalOption,
            chartLoadStatus: sBoardPanelRecord.chartLoadStatus,
            navigatorLoadStatus: sBoardPanelRecord.navigatorLoadStatus,
            rangeHandlers,
            navigatorShiftActions,
            navigatorZoomActions,
            onChartAreaWidthChange: (width: number | undefined) =>
                handleChartAreaWidthChange(panelInfo, width),
            refreshData: () => {
                void refreshDataRange(panelInfo);
            },
            refreshTime: () => {
                void refreshTimeRange(panelInfo);
            },
            reloadRawMode: (nextPanelInfo: PanelInfo) => {
                const sShouldPreserveLiveRange =
                    shouldPreserveLiveRange(nextPanelInfo);

                if (
                    nextPanelInfo.time.useLastViewedRange &&
                    !sShouldPreserveLiveRange
                ) {
                    void refreshFullRange(nextPanelInfo);
                    return;
                }

                void refreshCurrentRange(nextPanelInfo, {
                    forceReload: true,
                    preserveNavigatorRange: sShouldPreserveLiveRange,
                    dataLoadConfigOverride: {
                        isRaw: nextPanelInfo.toolbar.isRaw,
                    },
                });
            },
            reloadPanelEdit: (nextPanelInfo: PanelInfo) => {
                const sDataLoadConfigOverride = {
                    seriesList: nextPanelInfo.data.tag_set,
                    queryLimit: nextPanelInfo.data.count,
                    intervalType: nextPanelInfo.data.interval_type,
                    isRaw: nextPanelInfo.toolbar.isRaw,
                    xAxis: nextPanelInfo.axes.x_axis,
                    navigatorSampling: nextPanelInfo.axes.sampling,
                    mainChartSampling:
                        nextPanelInfo.axes.main_chart_sampling,
                };
                const sShouldPreserveLiveRange =
                    shouldPreserveLiveRange(nextPanelInfo);

                if (nextPanelInfo.time.useLastViewedRange) {
                    if (sShouldPreserveLiveRange) {
                        void refreshCurrentRange(nextPanelInfo, {
                            forceReload: true,
                            preserveNavigatorRange: true,
                            dataLoadConfigOverride: sDataLoadConfigOverride,
                        });
                        return;
                    }

                    void refreshFullRange(nextPanelInfo);
                    return;
                }

                void initializeRange(nextPanelInfo, {
                    rangeStateOverride: {
                        seriesList: nextPanelInfo.data.tag_set,
                        rangeConfig: nextPanelInfo.time.rangeConfig,
                        lastViewedRange: undefined,
                    },
                    dataLoadConfigOverride: sDataLoadConfigOverride,
                });
            },
            resetNavigatorRange: () => {
                void refreshFullRange(panelInfo);
            },
        };
    }

    return {
        getPanelContainerRuntimeProps,
        refreshCurrentRange,
        refreshDataRange,
        refreshFullRange,
        refreshTimeRange,
        applyBoardRange,
        applyGlobalRange,
        initializeRange,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        shiftPanelRange,
        shiftNavigatorRange,
        zoomInPanelRange,
        zoomOutPanelRange,
        focusPanelRange,
    };
}
