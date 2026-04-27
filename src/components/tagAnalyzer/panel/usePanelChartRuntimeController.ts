import { useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { getNavigatorRangeFromEvent } from '../utils/time/PanelRangeControlLogic';
import { EMPTY_TIME_RANGE } from '../utils/time/constants/TimeRangeConstants';
import type {
    PanelChartHandle,
    PanelRangeAppliedContext,
    PanelNavigateState,
    PanelRangeChangeEvent,
} from '../utils/panelRuntimeTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type { InputTimeBounds, TimeRangeMs } from '../utils/time/types/TimeTypes';
import {
    INITIAL_PANEL_NAVIGATE_STATE,
    resolvePanelRangeApplicationDecision,
} from './PanelChartRuntimeState';
import { usePanelChartDataRefresh } from './usePanelChartDataRefresh';

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

    const updateNavigateState = function updateNavigateState(patch: Partial<PanelNavigateState>) {
        setNavigateState((prev) => {
            const sNext = { ...prev, ...patch };
            navigateStateRef.current = sNext;
            return sNext;
        });
    };

    const {
        loadedDataRangeRef,
        refreshPanelData,
        skipNextFetchRef,
    } = usePanelChartDataRefresh({
        panelInfo,
        boardTime,
        areaChartRef,
        chartRef,
        rollupTableList,
        navigateStateRef,
        updateNavigateState,
    });

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
        const sDecision = resolvePanelRangeApplicationDecision(
            panelRange,
            navigatorRange,
            navigateStateRef.current.panelRange,
            navigateStateRef.current.navigatorRange,
            loadedDataRangeRef.current,
        );

        if (!sDecision.shouldApply) {
            return;
        }

        const sPreFetchNavigatorData = navigateStateRef.current.navigatorChartData;

        updateNavigateState({
            panelRange: panelRange,
            navigatorRange: navigatorRange,
            preOverflowTimeRange: EMPTY_TIME_RANGE,
        });

        if (!sDecision.needsFetch) {
            notifyPanelRangeApplied(panelRange);
            return;
        }

        const sRefreshResult = await refreshPanelData(panelRange, raw, sDecision.dataRange);
        if (sRefreshResult.isStale) {
            return;
        }

        if (!sDecision.navigatorRangeChanged) {
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
        refreshPanelData: (
            timeRange: TimeRangeMs | undefined,
            raw = isRaw,
            dataRange: TimeRangeMs | undefined = undefined,
        ) => refreshPanelData(timeRange, raw, dataRange),
        handlePanelRangeChange,
        handleNavigatorRangeChange,
        setExtremes,
        applyLoadedRanges,
    };
}
