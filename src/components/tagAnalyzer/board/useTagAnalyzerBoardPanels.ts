import { useRef, useState } from 'react';
import type { GlobalTimeRangeState } from '../domain/BoardDomain';
import type { PanelInfo, PanelRangeState } from '../domain/PanelDomain';
import { hasNumericBaseTimeSeries } from '../domain/SeriesDomain';
import type { TimeRangeConfig, TimeRangeMs } from '../domain/time/model/TimeTypes';
import type { RollupTableMap } from '../fetch/FetchContracts';
import {
    createInitialBoardPanelRecord,
    hasValidRangeState,
    type BoardPanelRecord,
    type PanelRangeChangeOptions,
} from './BoardPanelState';
import { createApplyPanelRange } from './createApplyPanelRange';
import { createRefreshRangeActions } from './createRefreshRangeActions';
import {
    fetchFullRangeOrWarn,
    getCoveringNavigatorRange,
    resolveBoardTimeRange,
    resolvePanelRangeStateForSeries,
} from './PanelRangeResolver';

type ResolvePanelRangeOptions = {
    applyInitialMainChartWindow: boolean;
};

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
    rollupTableList: RollupTableMap;
    onAppliedRange: (panelInfo: PanelInfo, rangeState: PanelRangeState) => void;
}) {
    const [, setBoardPanelRecords] =
        useState<Record<string, BoardPanelRecord>>({});
    const boardPanelRecordsRef = useRef<Record<string, BoardPanelRecord>>({});
    const initializedPanelKeysRef = useRef<Record<string, true>>({});
    const initializingPanelKeysRef = useRef<Record<string, true>>({});

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

    const {
        applyPanelRange,
        requestPanelDataRefresh,
    } = createApplyPanelRange({
        panelStore: {
            getBoardPanelRecord,
            updateBoardPanelRecord,
        },
    });

    function applyPanelRangeToPanel(
        panelInfo: PanelInfo,
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ): PanelRangeState | undefined {
        const sApplyResult = applyPanelRange({
            panelKey: panelInfo.key,
            rangeState,
            navigatorSelectionCenterRatio:
                options?.navigatorSelectionCenterRatio,
        });

        if (sApplyResult.didChange) {
            onAppliedRange(panelInfo, sApplyResult.resolvedRangeState);
            return sApplyResult.resolvedRangeState;
        }

        return undefined;
    }

    function getPanelInfo(panelKey: string): PanelInfo | undefined {
        assertPanelKey(panelKey);
        return panels.find((panel) => panel.key === panelKey);
    }

    const {
        refreshPanelData,
        refreshPanelTime: refreshPanelTimeRange,
        setFullDataRange,
    } = createRefreshRangeActions({
        boardTime,
        getBoardPanelRecord,
        getPanelInfo,
        applyPanelRangeToPanel,
        requestPanelDataRefresh,
    });
    function resolvePanelRangeState(
        panelInfo: PanelInfo,
        options: ResolvePanelRangeOptions,
    ): Promise<PanelRangeState | undefined> {
        return resolvePanelRangeStateForSeries({
            panelInfo,
            boardTime,
            useLastViewedRange: true,
            applyInitialMainChartWindow: options.applyInitialMainChartWindow,
        });
    }

    function reloadAfterEditorSave(
        nextPanelInfo: PanelInfo,
        preserveCurrentVisibleRange: boolean,
    ): void {
        const sRangeState =
            getBoardPanelRecord(nextPanelInfo.key).rangeState;

        if (preserveCurrentVisibleRange && hasValidRangeState(sRangeState)) {
            return;
        }

        void (async () => {
            const sResolvedRangeState = await resolvePanelRangeState(nextPanelInfo, {
                applyInitialMainChartWindow: false,
            });

            if (!sResolvedRangeState) {
                return;
            }

            applyPanelRangeToPanel(nextPanelInfo, sResolvedRangeState);
        })();
    }

    function handleChartWidthChange(
        panelInfo: PanelInfo,
        width: number | undefined,
    ): void {
        const sPanelKey = panelInfo.key;

        setPanelChartAreaWidth(sPanelKey, width);

        if (width === undefined || !isActiveTab) {
            delete initializedPanelKeysRef.current[sPanelKey];
            delete initializingPanelKeysRef.current[sPanelKey];
            return;
        }

        const sUpdatedBoardPanelRecord = getBoardPanelRecord(sPanelKey);

        if (
            sUpdatedBoardPanelRecord.chartAreaWidth === undefined ||
            initializedPanelKeysRef.current[sPanelKey] ||
            initializingPanelKeysRef.current[sPanelKey]
        ) {
            return;
        }

        initializingPanelKeysRef.current[sPanelKey] = true;
        void (async () => {
            try {
                if (
                    !panelInfo.timeRange.useLastViewedRange &&
                    globalTimeRange &&
                    !hasNumericBaseTimeSeries(panelInfo.query.tagSet)
                ) {
                    await applyGlobalRangeToPanel(panelInfo, globalTimeRange);
                    initializedPanelKeysRef.current[sPanelKey] = true;
                    return;
                }

                const sResolvedRangeState = await resolvePanelRangeState(panelInfo, {
                    applyInitialMainChartWindow: true,
                });

                if (!sResolvedRangeState) {
                    return;
                }

                applyPanelRangeToPanel(panelInfo, sResolvedRangeState);
                initializedPanelKeysRef.current[sPanelKey] = true;
            } finally {
                delete initializingPanelKeysRef.current[sPanelKey];
            }
        })();
    }

    async function applyDerivedRangeToPanel(
        panelInfo: PanelInfo,
        computeRange: (fullRange: TimeRangeMs) => {
            panelRange: TimeRangeMs;
            navigatorSeed: TimeRangeMs;
        },
    ): Promise<void> {
        if (hasNumericBaseTimeSeries(panelInfo.query.tagSet)) {
            return;
        }

        const fullRange = await fetchFullRangeOrWarn(panelInfo.query.tagSet);

        if (!fullRange) {
            return;
        }

        const { panelRange, navigatorSeed } = computeRange(fullRange);

        applyPanelRangeToPanel(panelInfo, {
            requestPanelRange: panelRange,
            requestNavigatorRange: getCoveringNavigatorRange(navigatorSeed, fullRange),
            fullRange,
        });
    }

    function applyGlobalRangeToPanel(
        panelInfo: PanelInfo,
        globalTimeRangeToApply: GlobalTimeRangeState,
    ): Promise<void> {
        return applyDerivedRangeToPanel(panelInfo, () => ({
            panelRange: globalTimeRangeToApply.data,
            navigatorSeed: globalTimeRangeToApply.navigator,
        }));
    }

    return {
        getPanelContainerRuntimeProps: (panelInfo: PanelInfo) => ({
            ...getPanelRuntimeProps(panelInfo),
            rollupTableList,
        }),
        handleChartWidthChange,
        refreshPanelData,
        refreshPanelTime: (panelKey: string) =>
            void refreshPanelTimeRange(panelKey),
        expandPanelFullRange: (panelKey: string) =>
            void setFullDataRange(panelKey),
        reloadAfterEditorSave,
        refreshAllPanelData: () => panels.forEach((p) => void refreshPanelData(p.key)),
        refreshAllPanelTime: () =>
            panels.forEach((p) => void refreshPanelTimeRange(p.key)),
        expandAllPanelFullRanges: () =>
            panels.forEach((p) => void setFullDataRange(p.key)),
        applyBoardTimeToPanels: (boardTimeToApply: TimeRangeConfig) =>
            panels.forEach(
                (p) =>
                    void applyDerivedRangeToPanel(p, (fullRange) => {
                        const boardRange = resolveBoardTimeRange(
                            boardTimeToApply,
                            fullRange,
                        );
                        return {
                            panelRange: boardRange,
                            navigatorSeed: boardRange,
                        };
                    }),
            ),
        applyGlobalRangeToPanels: (
            globalTimeRangeToApply: GlobalTimeRangeState,
        ) =>
            panels.forEach(
                (p) => void applyGlobalRangeToPanel(p, globalTimeRangeToApply),
            ),
        getPanelRangeState: (panelInfo: PanelInfo) =>
            getBoardPanelRecord(panelInfo.key).rangeState,
    };

    function getPanelRuntimeProps(panelInfo: PanelInfo) {
        const sBoardPanelRecord = getBoardPanelRecord(panelInfo.key);

        return {
            isActive: isActiveTab,
            rangeState: sBoardPanelRecord.rangeState,
            chartAreaWidth: sBoardPanelRecord.chartAreaWidth,
            dataRefreshVersion: sBoardPanelRecord.dataRefreshVersion,
            onRangeStateChange: (
                rangeState: PanelRangeState,
                options?: PanelRangeChangeOptions,
            ): void => {
                applyPanelRangeToPanel(panelInfo, rangeState, options);
            },
        };
    }
}

function assertPanelKey(panelKey: string): void {
    if (panelKey.length === 0) {
        throw new Error('Panel key is required.');
    }
}
