import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { loadPanelChartState } from '../utils/fetch/PanelChartStateLoader';
import { getNavigatorRangeFromEvent } from '../utils/time/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import { isSameTimeRange } from '../utils/time/PanelTimeRangeResolver';
import type {
    PanelChartHandle,
    PanelRangeAppliedContext,
    PanelNavigateState,
    PanelRangeChangeEvent,
} from './PanelTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/types/TimeTypes';
import { buildPanelLoadNavigateStatePatch } from './PanelChartLoadNavigateStatePatch';

type PanelRefreshResult = {
    appliedRange: TimeRangeMs;
    isStale: boolean;
};

const INITIAL_PANEL_NAVIGATE_STATE: PanelNavigateState = {
    chartData: [],
    navigatorChartData: [],
    panelRange: EMPTY_TIME_RANGE,
    navigatorRange: EMPTY_TIME_RANGE,
    rangeOption: undefined,
    preOverflowTimeRange: EMPTY_TIME_RANGE,
};

type UsePanelChartRuntimeControllerParams = {
    panelInfo: PanelInfo;
    boardTime: InputTimeBounds;
    areaChartRef: MutableRefObject<HTMLDivElement | null>;
    chartRef: MutableRefObject<PanelChartHandle | null>;
    rollupTableList: string[];
    isRaw: boolean;
    onPanelRangeApplied:
        | ((panelRange: TimeRangeMs, context: PanelRangeAppliedContext) => void)
        | undefined;
};

export function usePanelChartRuntimeController({
    panelInfo,
    boardTime,
    areaChartRef,
    chartRef,
    rollupTableList,
    isRaw,
    onPanelRangeApplied,
}: UsePanelChartRuntimeControllerParams) {
    const [navigateState, setNavigateState] = useState<PanelNavigateState>(
        INITIAL_PANEL_NAVIGATE_STATE,
    );
    const navigateStateRef = useRef<PanelNavigateState>(INITIAL_PANEL_NAVIGATE_STATE);
    const skipNextFetchRef = useRef(false);
    const panelLoadRequestIdRef = useRef(0);
    const loadedDataRangeRef = useRef<TimeRangeMs>(EMPTY_TIME_RANGE);

    const updateNavigateState = function updateNavigateState(patch: Partial<PanelNavigateState>) {
        setNavigateState((prev) => {
            const sNext = { ...prev, ...patch };
            navigateStateRef.current = sNext;
            return sNext;
        });
    };

    const refreshPanelData = async function refreshPanelData(
        timeRange: TimeRangeMs | undefined,
        raw: boolean,
        dataRange: TimeRangeMs | undefined,
    ): Promise<PanelRefreshResult> {
        const sRequestedRange = timeRange ?? navigateStateRef.current.panelRange;
        const sLoadedDataRange = dataRange ?? sRequestedRange;
        const sRequestId = ++panelLoadRequestIdRef.current;
        const sMeasuredChartWidth = areaChartRef.current?.clientWidth;
        const sChartWidth =
            typeof sMeasuredChartWidth === 'number' && sMeasuredChartWidth > 0
                ? sMeasuredChartWidth
                : 1;
        const sLoadState = await loadPanelChartState(
            panelInfo.data,
            panelInfo.time,
            panelInfo.axes,
            boardTime,
            sChartWidth,
            raw,
            sLoadedDataRange,
            rollupTableList,
        );

        if (sRequestId !== panelLoadRequestIdRef.current) {
            return {
                appliedRange: navigateStateRef.current.panelRange,
                isStale: true,
            };
        }

        const sAppliedRange = sLoadState.overflowRange ?? sRequestedRange;
        loadedDataRangeRef.current = sLoadedDataRange;

        updateNavigateState(
            buildPanelLoadNavigateStatePatch(
                sLoadState,
                undefined,
                navigateStateRef.current.rangeOption,
            ),
        );
        if (sLoadState.overflowRange) {
            skipNextFetchRef.current = true;
            chartRef.current?.setPanelRange(sLoadState.overflowRange);
        }

        return {
            appliedRange: sAppliedRange,
            isStale: false,
        };
    };

    const notifyPanelRangeApplied = function notifyPanelRangeApplied(panelRange: TimeRangeMs) {
        onPanelRangeApplied?.(panelRange, {
            navigatorRange: navigateStateRef.current.navigatorRange,
            isRaw,
        });
    };

    const applyPanelAndNavigatorRanges = async function applyPanelAndNavigatorRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
        raw = isRaw,
    ) {
        const sCurrentPanelRange = navigateStateRef.current.panelRange;
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;
        const sLoadedDataRange = loadedDataRangeRef.current;

        if (
            isSameTimeRange(panelRange, sCurrentPanelRange) &&
            isSameTimeRange(navigatorRange, sCurrentNavigatorRange)
        ) {
            return;
        }

        const sNavigatorRangeChanged = !isSameTimeRange(
            navigatorRange,
            sCurrentNavigatorRange,
        );
        const sPreviousWidth = sCurrentPanelRange.endTime - sCurrentPanelRange.startTime;
        const sNextWidth = panelRange.endTime - panelRange.startTime;
        const sVisibleRangeZoomed =
            !sNavigatorRangeChanged &&
            sPreviousWidth > 0 &&
            Math.abs(sNextWidth - sPreviousWidth) / sPreviousWidth > 0.01;
        const sPanelEscapedLoadedData =
            !sNavigatorRangeChanged &&
            sLoadedDataRange.startTime > 0 &&
            (panelRange.startTime < sLoadedDataRange.startTime ||
                panelRange.endTime > sLoadedDataRange.endTime);
        const sNeedsFetch =
            sNavigatorRangeChanged || sVisibleRangeZoomed || sPanelEscapedLoadedData;
        const sDataRange = sNavigatorRangeChanged ? navigatorRange : panelRange;

        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        if (!sNeedsFetch) {
            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(panelRange, raw, sDataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        if (!sNavigatorRangeChanged) {
            updateNavigateState({ navigatorChartData: sPreFetchNavigatorData });
        }

        notifyPanelRangeApplied(sRefreshResult.appliedRange);
    };

    const handleNavigatorRangeChange = function handleNavigatorRangeChange(
        event: PanelRangeChangeEvent,
    ) {
        const sNextNavigatorRange = getNavigatorRangeFromEvent(event);
        updateNavigateState({ navigatorRange: sNextNavigatorRange });
    };

    const handlePanelRangeChange = async function handlePanelRangeChange(
        event: PanelRangeChangeEvent,
    ) {
        if (event.min === undefined || event.max === undefined) return;

        const sNextPanelRange = {
            startTime: event.min,
            endTime: event.max,
        };
        const sCurrentNavigatorRange = navigateStateRef.current.navigatorRange;

        if (skipNextFetchRef.current) {
            skipNextFetchRef.current = false;
            updateNavigateState({ panelRange: sNextPanelRange });
            notifyPanelRangeApplied(sNextPanelRange);
            return;
        }

        await applyPanelAndNavigatorRanges(sNextPanelRange, sCurrentNavigatorRange, undefined);
    };

    const setExtremes = function setExtremes(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs | undefined,
    ) {
        void applyPanelAndNavigatorRanges(
            panelRange,
            navigatorRange ?? navigateStateRef.current.navigatorRange,
            undefined,
        );
    };

    const applyLoadedRanges = async function applyLoadedRanges(
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs = panelRange,
    ) {
        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        const sRefreshResult = await refreshPanelData(panelRange, isRaw, navigatorRange);
        if (sRefreshResult.isStale) {
            return;
        }

        updateNavigateState({
            panelRange: sRefreshResult.appliedRange,
            navigatorRange: navigatorRange,
        });
    };

    return {
        navigateState,
        navigateStateRef,
        updateNavigateState,
        refreshPanelData,
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
}
