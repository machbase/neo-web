import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import type {
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import {
    getNavigatorTrackPixelWidth,
    normalizeNavigatorRangeForPanelRange,
} from './PanelNavigatorRangeLimits';
import {
    createInitialBoardPanelRecord,
    type BoardPanelRecord,
} from './BoardPanelState';
import {
    createPanelDataRefreshPolicy,
    type PanelRangeRefreshOptions,
} from '../panel/PanelDataRuntimeState';
import { useBoardPanelRangeMutation } from './useBoardPanelRangeMutation';

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

    function normalizeNavigatorRangeForVisiblePanel(
        panelKey: string,
        panelRange: TimeRangeMs,
        navigatorRange: TimeRangeMs,
    ): TimeRangeMs {
        const sChartAreaWidth = getBoardPanelRecord(panelKey).chartAreaWidth;
        const sNavigatorTrackPixelWidth =
            typeof sChartAreaWidth === 'number' && sChartAreaWidth > 0
                ? getNavigatorTrackPixelWidth(sChartAreaWidth)
                : undefined;

        return sNavigatorTrackPixelWidth === undefined
            ? navigatorRange
            : normalizeNavigatorRangeForPanelRange(
                  panelRange,
                  navigatorRange,
                  sNavigatorTrackPixelWidth,
              );
    }

    function requestDataRefresh(
        panelKey: string,
        options: PanelRangeRefreshOptions = {},
    ): void {
        if (options.skipDataRefresh) {
            return;
        }

        updateBoardPanelRecord(panelKey, (record) => ({
            ...record,
            dataRefreshVersion: record.dataRefreshVersion + 1,
            dataRefreshPolicy: createPanelDataRefreshPolicy(options),
        }));
    }

    const rangeMutation = useBoardPanelRangeMutation({
        context: { boardTime, globalTimeRange, isActiveTab },
        panelStore: {
            getBoardPanelRecord,
            updateRangeState,
            setChartAreaWidth,
            normalizeNavigatorRangeForVisiblePanel,
            requestDataRefresh,
        },
        persistence: { onAppliedRange },
    });
    function refreshAllPanelData(): void {
        for (const panelInfo of panels) void rangeMutation.refreshDataRange(panelInfo);
    }

    function refreshAllPanelTime(): void {
        for (const panelInfo of panels) void rangeMutation.refreshTimeRange(panelInfo);
    }

    function applyBoardRangeToPanels(boardTimeToApply: TimeRangeConfig): void {
        for (const panelInfo of panels) {
            void rangeMutation.applyBoardRange(panelInfo, boardTimeToApply);
        }
    }

    function applyGlobalRangeToPanels(
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): void {
        for (const panelInfo of panels) {
            void rangeMutation.applyGlobalRange(panelInfo, globalTimeRangeToApply);
        }
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) => ({
            ...rangeMutation.getPanelContainerRuntimeProps(panelInfo),
            rollupTableList,
        }),
        handlePanelChartAreaWidthChange:
            rangeMutation.handleChartAreaWidthChange,
        refreshPanelData: rangeMutation.refreshDataRange,
        refreshPanelTime: rangeMutation.refreshTimeRange,
        reloadRawMode: rangeMutation.reloadRawMode,
        reloadPanelEdit: rangeMutation.reloadPanelEdit,
        refreshAllPanelData,
        refreshAllPanelTime,
        applyBoardRangeToPanels,
        applyGlobalRangeToPanels,
    };
}
