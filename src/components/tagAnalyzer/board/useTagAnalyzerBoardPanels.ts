import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries, type PanelSeriesDefinition } from '../domain/SeriesDomain';
import { EMPTY_TIME_RANGE } from '../domain/time/TimeConstants';
import { convertTimeRangeConfigToTimeRangeMs } from '../domain/time/TimeBoundaryConverters';
import { resolveFullDataTimeRange } from '../domain/time/PanelTimeRangeResolver';
import { resolveSeriesTimeBoundaryRanges } from '../domain/time/TimeBoundaryRangeResolver';
import type {
    TimeRangeConfig,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import {
    createInitialBoardPanelRecord,
    type BoardPanelRecord,
    type PanelRangeStateApplyOptions,
} from './BoardPanelState';
import { useApplyPanelRange } from './useApplyPanelRange';
import { useRangeInit } from './useRangeInit';
import { useConfigReload } from './useConfigReload';
import { useRefreshRange } from './useRefreshRange';

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
        assertPanelKey(panelKey);
        return boardPanelRecordsRef.current[panelKey] ?? createInitialBoardPanelRecord();
    }

    function updateBoardPanelRecord(
        panelKey: string,
        updater: (record: BoardPanelRecord) => BoardPanelRecord,
    ): void {
        assertPanelKey(panelKey);
        const sNextRecord = updater(getBoardPanelRecord(panelKey));
        const sNextBoardPanelRecords = {
            ...boardPanelRecordsRef.current,
            [panelKey]: sNextRecord,
        };

        boardPanelRecordsRef.current = sNextBoardPanelRecords;
        setBoardPanelRecords(sNextBoardPanelRecords);
    }

    function setPanelChartAreaWidth(
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

    const { applyPanelRangeState } = useApplyPanelRange({
        panelStore: {
            getBoardPanelRecord,
            updateBoardPanelRecord,
        },
        handlers: { onRangeApplied: onAppliedRange },
    });
    const {
        initializePanelRange,
        handleChartWidthChange,
    } = useRangeInit({
        boardTime,
        globalTimeRange,
        isActiveTab,
        getBoardPanelRecord,
        setPanelChartAreaWidth,
        applyPanelRangeState,
        applyGlobalRangeToPanel,
    });
    const {
        refreshPanelData,
        refreshPanelTime: refreshPanelTimeRange,
        setFullDataRange,
    } = useRefreshRange({
        boardTime,
        getBoardPanelRecord,
        applyPanelRangeState,
    });
    const {
        reloadAfterRawModeChange,
        reloadAfterEditorSave,
    } = useConfigReload({
        getBoardPanelRecord,
        applyPanelRangeState,
        initializePanelRange,
        setFullDataRange,
    });

    function applyGlobalRangeToPanel(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): void {
        if (hasNumericBaseTimeSeries(panelInfo.data.tag_set)) {
            return;
        }

        applyPanelRangeState(panelInfo, {
            panelRange: globalTimeRangeToApply.data,
            navigatorRange: globalTimeRangeToApply.navigator,
            fullRange: globalTimeRangeToApply.navigator,
        });
    }

    async function applyBoardTimeToPanel(
        panelInfo: PanelInfo,
        boardTimeToApply: TimeRangeConfig,
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.data.tag_set)) {
            return;
        }

        const boardRange = await resolveBoardTimeRange(
            panelInfo.data.tag_set,
            boardTimeToApply,
        );

        applyPanelRangeState(panelInfo, {
            panelRange: boardRange,
            navigatorRange: boardRange,
            fullRange: boardRange,
        });
    }

    function refreshAllPanelData(): void {
        for (const panelInfo of panels) {
            void refreshPanelData(panelInfo);
        }
    }

    function refreshPanelTime(panelInfo: PanelInfo): void {
        void refreshPanelTimeRange(panelInfo);
    }

    function refreshAllPanelTime(): void {
        for (const panelInfo of panels) refreshPanelTime(panelInfo);
    }

    function applyBoardTimeToPanels(boardTimeToApply: TimeRangeConfig): void {
        for (const panelInfo of panels) {
            void applyBoardTimeToPanel(panelInfo, boardTimeToApply);
        }
    }

    function applyGlobalRangeToPanels(
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): void {
        for (const panelInfo of panels) {
            applyGlobalRangeToPanel(panelInfo, globalTimeRangeToApply);
        }
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) => ({
            ...getPanelRuntimeProps(panelInfo),
            rollupTableList,
        }),
        handleChartWidthChange,
        refreshPanelData,
        refreshPanelTime,
        reloadAfterRawModeChange,
        reloadAfterEditorSave,
        refreshAllPanelData,
        refreshAllPanelTime,
        applyBoardTimeToPanels,
        applyGlobalRangeToPanels,
    };

    function getPanelRuntimeProps(panelInfo: PanelInfo) {
        const sBoardPanelRecord = getBoardPanelRecord(panelInfo.data.index_key);

        return {
            rangeState: sBoardPanelRecord.rangeState,
            chartAreaWidth: sBoardPanelRecord.chartAreaWidth,
            dataRefreshVersion: sBoardPanelRecord.dataRefreshVersion,
            onRangeStateChange: (
                rangeState: PanelRangeState,
                options?: PanelRangeStateApplyOptions,
            ): void => {
                applyPanelRangeState(panelInfo, {
                    panelRange: rangeState.panelRange,
                    navigatorRange: rangeState.navigatorRange,
                    fullRange: options?.fullRange ?? rangeState.fullRange,
                    navigatorSelectionCenterRatio:
                        options?.navigatorSelectionCenterRatio,
                    reloadData: options?.reloadData,
                });
            },
        };
    }
}

function assertPanelKey(panelKey: string): void {
    if (panelKey.length === 0) {
        throw new Error('Panel key is required.');
    }
}

async function resolveBoardTimeRange(
    seriesList: PanelSeriesDefinition[],
    boardTime: TimeRangeConfig,
): Promise<TimeRangeMs> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;
    const boardRange = convertTimeRangeConfigToTimeRangeMs(
        boardTime,
        boundaryRanges?.end.max.timestamp,
    );
    const resolvedRange = isConcreteTimeRange(boardRange)
        ? boardRange
        : resolveFullDataTimeRange(boundaryRanges) ?? EMPTY_TIME_RANGE;

    if (!isConcreteTimeRange(resolvedRange)) {
        throw new Error('Cannot apply board time without a concrete range.');
    }

    return resolvedRange;
}
