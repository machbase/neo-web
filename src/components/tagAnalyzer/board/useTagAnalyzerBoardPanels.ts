import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
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

    if (getTimeRangeWidth(sNavigatorRange) <= sMaxNavigatorWidth) {
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
): number {
    const sPanelWidth = getTimeRangeWidth(panelRange);
    const sMinimumSelectionRatio =
        MIN_NAVIGATOR_SELECTION_PIXEL_WIDTH / Math.max(navigatorPixelWidth, 1);

    if (sPanelWidth <= 0 || sMinimumSelectionRatio <= 0) {
        throw new Error('Cannot normalize navigator range for an invalid panel width.');
    }

    return Math.max(sPanelWidth, sPanelWidth / Math.min(sMinimumSelectionRatio, 1));
}

export function useTagAnalyzerBoardPanels({
    panels,
    boardTime,
    globalTimeRange,
    isActiveTab,
    rollupTableList,
    onAppliedRange,
}: {
    panels: PanelInfo[];
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

    function setNavigatorLoadStatus(
        panelKey: string,
        navigatorLoadStatus: PanelChartLoadStatus,
    ): void {
        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            navigatorLoadStatus,
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
        setNavigatorLoadStatus,
    });
    const rangeMutation = useBoardPanelRangeMutation({
        boardTime,
        globalTimeRange,
        isActiveTab,
        getBoardPanelRecord,
        updateRangeState,
        setChartAreaWidth,
        normalizeNavigatorRangeForVisiblePanel,
        loadMainPanelData: chartDataFetching.loadMainPanelData,
        loadNavigatorData: chartDataFetching.loadNavigatorData,
        commitNavigatorDataFromMainPanelData:
            chartDataFetching.commitNavigatorDataFromMainPanelData,
        onAppliedRange,
    });

    return {
        getPanelContainerRuntimeProps: rangeMutation.getPanelContainerRuntimeProps,
        handlePanelChartAreaWidthChange:
            rangeMutation.handleChartAreaWidthChange,
        refreshPanelData: rangeMutation.refreshDataRange,
        refreshPanelTime: rangeMutation.refreshTimeRange,
        reloadRawMode: rangeMutation.reloadRawMode,
        reloadPanelEdit: rangeMutation.reloadPanelEdit,
        refreshAllPanelData: () => {
            for (const panelInfo of panels) {
                void rangeMutation.refreshDataRange(panelInfo);
            }
        },
        refreshAllPanelTime: () => {
            for (const panelInfo of panels) {
                void rangeMutation.refreshTimeRange(panelInfo);
            }
        },
        applyBoardRangeToPanels: (
            boardTimeToApply: TimeRangeConfig,
        ) => {
            for (const panelInfo of panels) {
                void rangeMutation.applyBoardRange(panelInfo, boardTimeToApply);
            }
        },
        applyGlobalRangeToPanels: (
            globalTimeRangeToApply: GlobalTimeRangeState,
        ) => {
            for (const panelInfo of panels) {
                void rangeMutation.applyGlobalRange(panelInfo, globalTimeRangeToApply);
            }
        },
    };
}
