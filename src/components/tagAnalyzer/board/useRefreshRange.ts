import type { PanelInfo } from '../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { resolveFullDataTimeRange } from '../domain/time/PanelTimeRangeResolver';
import { resolveSeriesTimeBoundaryRanges } from '../domain/time/TimeBoundaryRangeResolver';
import { clampTimeRangeToBounds, isConcreteTimeRange } from '../domain/time/TimeRangeUtils';
import type { PanelRangeApplyOptions } from '../panel/PanelDataRuntimeState';
import { hasValidRangeState, type BoardPanelRecord } from './BoardPanelState';

type ApplyPanelRangeState = (
    panelInfo: PanelInfo,
    options: PanelRangeApplyOptions,
) => void;

type RefreshRangeDependencies = {
    getBoardPanelRecord: (panelKey: string) => BoardPanelRecord;
    applyPanelRangeState: ApplyPanelRangeState;
};

export function useRefreshRange({
    getBoardPanelRecord,
    applyPanelRangeState,
}: RefreshRangeDependencies) {
    async function setFullDataRange(panelInfo: PanelInfo): Promise<void> {
        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);

        if (!isConcreteTimeRange(fullDataRange)) {
            throw new Error('Cannot set full data range without a concrete range.');
        }

        applyPanelRangeState(panelInfo, {
            panelRange: fullDataRange,
            navigatorRange: fullDataRange,
            fullRange: fullDataRange,
        });
    }

    async function refreshPanelData(panelInfo: PanelInfo): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;

        if (!hasValidRangeState(rangeState)) {
            await setFullDataRange(panelInfo);
            return;
        }

        applyPanelRangeState(panelInfo, {
            panelRange: rangeState.panelRange,
            navigatorRange: rangeState.navigatorRange,
            fullRange: rangeState.fullRange,
            preserveNavigatorRange: true,
        });
    }

    async function refreshPanelTime(
        panelInfo: PanelInfo,
        keepCurrentViewRange: boolean,
    ): Promise<void> {
        const rangeState = getBoardPanelRecord(panelInfo.data.index_key).rangeState;
        const fullDataRange = await resolveFullRange(panelInfo.data.tag_set);

        if (!isConcreteTimeRange(fullDataRange)) {
            throw new Error('Cannot refresh panel time without a concrete full range.');
        }

        if (keepCurrentViewRange && !hasValidRangeState(rangeState)) {
            throw new Error('Cannot keep current view range without a valid range state.');
        }

        const panelRange = keepCurrentViewRange
            ? clampTimeRangeToBounds(rangeState.panelRange, fullDataRange)
            : fullDataRange;
        const navigatorRange = keepCurrentViewRange
            ? clampTimeRangeToBounds(rangeState.navigatorRange, fullDataRange)
            : fullDataRange;

        applyPanelRangeState(panelInfo, {
            panelRange,
            navigatorRange,
            fullRange: fullDataRange,
            preserveNavigatorRange: keepCurrentViewRange,
        });
    }

    return {
        refreshPanelData,
        refreshPanelTime,
        setFullDataRange,
    };
}

async function resolveFullRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    const boundaryRanges = (await resolveSeriesTimeBoundaryRanges(seriesList)) ?? null;

    return resolveFullDataTimeRange(boundaryRanges);
}
