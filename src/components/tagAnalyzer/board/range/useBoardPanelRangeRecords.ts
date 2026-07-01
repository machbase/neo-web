import { useReducer, useRef } from 'react';
import type {
    PanelRangeState,
    RuntimePanelInfo,
} from '../../domain/panel/PanelConfig';
import {
    resolvePanelRangeApplyResult,
    type BoardPanelRecord,
    type PanelRangeChangeOptions,
} from '../../domain/panelRange/PanelRangeApply';
import { assertPanelKey } from '../runtimeBoardPanels';

export type PanelRangeRuntimeRecord = {
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
    onRangeStateChange: (
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ) => void;
};

type BoardPanelRuntimeRecord = {
    chartAreaWidth: number | undefined;
    dataRefreshVersion: number;
};

const INITIAL_PANEL_RUNTIME_RECORD: BoardPanelRuntimeRecord = {
    chartAreaWidth: undefined,
    dataRefreshVersion: 0,
};

export function useBoardPanelRangeRecords({
    onPanelRangeStateChange,
    onAppliedRange,
}: {
    onPanelRangeStateChange: (
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ) => void;
    onAppliedRange: (
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
    ) => void;
}) {
    const boardPanelRecordsRef = useRef<Record<string, BoardPanelRuntimeRecord>>({});
    const [, forceRender] = useReducer((version: number) => version + 1, 0);

    function getPanelRuntimeRecord(panelKey: string): BoardPanelRuntimeRecord {
        assertPanelKey(panelKey);
        return boardPanelRecordsRef.current[panelKey] ?? INITIAL_PANEL_RUNTIME_RECORD;
    }

    function getPanelApplyRecord(panelInfo: RuntimePanelInfo): BoardPanelRecord {
        return {
            ...getPanelRuntimeRecord(panelInfo.key),
            rangeState: panelInfo.time.runtimeRange,
        };
    }

    function updatePanelRecord(
        panelKey: string,
        updater: (record: BoardPanelRuntimeRecord) => BoardPanelRuntimeRecord,
    ): void {
        assertPanelKey(panelKey);
        boardPanelRecordsRef.current = {
            ...boardPanelRecordsRef.current,
            [panelKey]: updater(getPanelRuntimeRecord(panelKey)),
        };
        forceRender();
    }

    function setChartAreaWidth(
        panelKey: string,
        chartAreaWidth: number | undefined,
    ): void {
        if (getPanelRuntimeRecord(panelKey).chartAreaWidth === chartAreaWidth) {
            return;
        }

        updatePanelRecord(panelKey, (record) => ({
            ...record,
            chartAreaWidth,
        }));
    }

    function requestDataRefresh(panelKey: string): void {
        updatePanelRecord(panelKey, (record) => ({
            ...record,
            dataRefreshVersion: record.dataRefreshVersion + 1,
        }));
    }

    function applyRangeToPanel(
        panelInfo: RuntimePanelInfo,
        rangeState: PanelRangeState,
        options?: PanelRangeChangeOptions,
    ): PanelRangeState | undefined {
        const sApplyResult = resolvePanelRangeApplyResult(
            getPanelApplyRecord(panelInfo),
            {
                rangeState,
                navigatorSelectionCenterRatio:
                    options?.navigatorSelectionCenterRatio,
            },
        );

        if (!sApplyResult.didChange) {
            return undefined;
        }

        onPanelRangeStateChange(panelInfo, sApplyResult.resolvedRangeState);
        onAppliedRange(panelInfo, sApplyResult.resolvedRangeState);

        return sApplyResult.resolvedRangeState;
    }


    function getPanelContainerRuntimeRecord(
        panelInfo: RuntimePanelInfo,
    ): PanelRangeRuntimeRecord {
        const sBoardPanelRecord = getPanelRuntimeRecord(panelInfo.key);

        return {
            chartAreaWidth: sBoardPanelRecord.chartAreaWidth,
            dataRefreshVersion: sBoardPanelRecord.dataRefreshVersion,
            onRangeStateChange: (rangeState, options) => {
                applyRangeToPanel(panelInfo, rangeState, options);
            },
        };
    }

    return {
        getPanelRuntimeRecord,
        setChartAreaWidth,
        requestDataRefresh,
        applyRangeToPanel,
        getPanelContainerRuntimeRecord,
    };
}