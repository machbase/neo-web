import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardModel';
import type { PanelRangeState } from '../domain/PanelChartModel';
import type { PanelInfo } from '../domain/PanelModel';
import type {
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import {
    createTimeRangeMs,
    getTimeRangeCenter,
    getTimeRangeWidth,
} from '../domain/time/TimeRangeUtils';
import {
    createInitialBoardPanelRecord,
    PanelChartLoadStatus,
    type BoardPanelRecord,
    type PanelChartDataState,
} from './BoardPanelState';
import { useBoardPanelChartDataFetching } from './useBoardPanelChartDataFetching';
import { useBoardPanelRangeMutation } from './useBoardPanelRangeMutation';

const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
const MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH = 36;

function normalizeNavigatorRangeForPanelRange(
    panelRange: TimeRangeMs,
    navigatorRange: TimeRangeMs,
    navigatorPixelWidth: number,
): TimeRangeMs {
    const sNavigatorRange = createTimeRangeMs(
        Math.min(panelRange.startTime, navigatorRange.startTime),
        Math.max(panelRange.endTime, navigatorRange.endTime),
    );
    const sMaxNavigatorWidth = getMaxNavigatorRangeWidthForMinimumSelection(
        panelRange,
        navigatorPixelWidth,
    );

    if (
        sMaxNavigatorWidth === undefined ||
        getTimeRangeWidth(sNavigatorRange) <= sMaxNavigatorWidth
    ) {
        return sNavigatorRange;
    }

    const sPanelCenterTime = getTimeRangeCenter(panelRange);

    return createTimeRangeMs(
        sPanelCenterTime - sMaxNavigatorWidth / 2,
        sPanelCenterTime + sMaxNavigatorWidth / 2,
    );
}

function getMaxNavigatorRangeWidthForMinimumSelection(
    panelRange: TimeRangeMs,
    navigatorPixelWidth: number,
): number | undefined {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sMinimumSelectionRatio =
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH / Math.max(navigatorPixelWidth, 1);

    if (sPanelWidth <= 0 || sMinimumSelectionRatio <= 0) {
        return undefined;
    }

    return Math.max(sPanelWidth, sPanelWidth / Math.min(sMinimumSelectionRatio, 1));
}

export function useTagAnalyzerBoardPanels({
    boardTime,
    globalTimeRange,
    isActiveTab,
    rollupTableList,
    onAppliedRange,
}: {
    boardTime: TimeRangeConfig;
    globalTimeRange: GlobalTimeRangeState | undefined;
    isActiveTab: boolean;
    rollupTableList: string[];
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
}) {
    const [, setBoardPanelRecords] =
        useState<Record<string, BoardPanelRecord>>({});
    const boardPanelRecordsRef = useRef<Record<string, BoardPanelRecord>>({});

    function getBoardPanelRecord(panelKey: string): BoardPanelRecord {
        return boardPanelRecordsRef.current[panelKey] ?? createInitialBoardPanelRecord();
    }

    function updateBoardPanelRecord(
        panelKey: string,
        updater: (record: BoardPanelRecord) => BoardPanelRecord,
    ): void {
        const sNextRecord = updater(getBoardPanelRecord(panelKey));
        const sNextBoardPanelRecords = {
            ...boardPanelRecordsRef.current,
            [panelKey]: sNextRecord,
        };

        boardPanelRecordsRef.current = sNextBoardPanelRecords;
        setBoardPanelRecords(sNextBoardPanelRecords);
    }

    function updateRangeState(panelKey: string, patch: Partial<PanelRangeState>): void {
        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            rangeState: {
                ...record.rangeState,
                ...patch,
            },
        }));
    }

    function updateChartDataState(
        panelKey: string,
        patch: Partial<PanelChartDataState>,
    ): void {
        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            chartDataState: {
                ...record.chartDataState,
                ...patch,
            },
        }));
    }

    function setChartLoadStatus(
        panelKey: string,
        chartLoadStatus: PanelChartLoadStatus,
    ): void {
        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            chartLoadStatus,
        }));
    }

    function setChartAreaWidth(
        panelKey: string,
        chartAreaWidth: number | undefined,
    ): void {
        if (getBoardPanelRecord(panelKey).chartAreaWidth === chartAreaWidth) {
            return;
        }

        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            chartAreaWidth,
        }));
    }

    function getChartLoadWidth(panelKey: string): number {
        const sChartAreaWidth = getBoardPanelRecord(panelKey).chartAreaWidth;

        return typeof sChartAreaWidth === 'number' && sChartAreaWidth > 0
            ? sChartAreaWidth
            : 1;
    }

    function normalizeNavigatorRangeForVisiblePanel(
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ): TimeRangeMs {
        const sChartAreaWidth = getBoardPanelRecord(panelKey).chartAreaWidth;
        const sNavigatorTrackPixelWidth =
            typeof sChartAreaWidth === 'number' && sChartAreaWidth > 0
                ? Math.max(sChartAreaWidth - NAVIGATOR_TRACK_SIDE_OFFSET_PX, 1)
                : undefined;

        return sNavigatorTrackPixelWidth === undefined
            ? navigatorRange
            : normalizeNavigatorRangeForPanelRange(
                  panelRange,
                  navigatorRange,
                  sNavigatorTrackPixelWidth,
              );
    }

    const chartDataFetching = useBoardPanelChartDataFetching({
        rollupTableList,
        getBoardPanelRecord,
        getChartLoadWidth,
        normalizeNavigatorRangeForVisiblePanel,
        updateChartDataState,
        setChartLoadStatus,
    });
    const rangeMutation = useBoardPanelRangeMutation({
        boardTime,
        globalTimeRange,
        isActiveTab,
        getBoardPanelRecord,
        updateRangeState,
        setChartAreaWidth,
        normalizeNavigatorRangeForVisiblePanel,
        loadPanelData: chartDataFetching.loadPanelData,
        loadNavigatorData: chartDataFetching.loadNavigatorData,
        onAppliedRange,
    });

    return {
        getPanelContainerRuntimeProps: rangeMutation.getPanelContainerRuntimeProps,
        refreshAllPanelData: (panelsToRefresh: PanelInfo[]) => {
            for (const panelInfo of panelsToRefresh) {
                void rangeMutation.refreshCurrentRange(panelInfo, { forceReload: true });
            }
        },
        refreshAllPanelTime: (panelsToRefresh: PanelInfo[]) => {
            for (const panelInfo of panelsToRefresh) {
                void rangeMutation.refreshFullRange(panelInfo);
            }
        },
        applyBoardRangeToPanels: (
            panelsToUpdate: PanelInfo[],
            boardTimeToApply: TimeRangeConfig,
        ) => {
            for (const panelInfo of panelsToUpdate) {
                void rangeMutation.applyBoardRange(panelInfo, boardTimeToApply);
            }
        },
        applyGlobalRangeToPanels: (
            panelsToUpdate: PanelInfo[],
            globalTimeRangeToApply: GlobalTimeRangeState | undefined,
        ) => {
            for (const panelInfo of panelsToUpdate) {
                void rangeMutation.applyGlobalRange(panelInfo, globalTimeRangeToApply);
            }
        },
    };
}
