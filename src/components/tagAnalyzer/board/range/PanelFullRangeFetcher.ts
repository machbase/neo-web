import { Toast } from '@/design-system/components';
import type { PanelInfo, PanelRangeState } from '../../domain/panel/PanelConfig';
import {
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { TimeRangeInput, TimeRangeMs } from '../../domain/time/TimeTypes';
import { isValidTimeRange } from '../../domain/time/TimeRangeUtils';
import { fetchSeriesDataAvailability } from '../../fetch/panelData/DataTimeRangeFetcher';
import { showDataAvailabilityToastOnce } from './DataAvailabilityToastPresenter';
import { resolveConcretePanelRangeState } from '../../domain/panelRange/PanelRangeResolver';

export const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

export class RequiredFullRangeError extends Error {
    constructor() {
        super(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        this.name = 'RequiredFullRangeError';
    }
}


export async function getFullRangeFromSeries(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    if (seriesList.length === 0) {
        return undefined;
    }

    const sDataAvailability = await fetchSeriesDataAvailability(seriesList);

    return isValidTimeRange(sDataAvailability.timeRange)
        ? sDataAvailability.timeRange
        : undefined;
}

export async function fetchRequiredFullRange(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs> {
    if (seriesList.length === 0) {
        Toast.error(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        throw new RequiredFullRangeError();
    }

    const sDataAvailability = await fetchSeriesDataAvailability(seriesList);
    const sFullRange = isValidTimeRange(sDataAvailability.timeRange)
        ? sDataAvailability.timeRange
        : undefined;
    const sAvailabilityToast = showDataAvailabilityToastOnce(
        sDataAvailability.issues,
    );

    if (!sFullRange) {
        if (!sAvailabilityToast.hasMessage) {
            Toast.error(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        }

        throw new RequiredFullRangeError();
    }

    return sFullRange;
}

export function isRequiredFullRangeError(
    error: unknown,
): error is RequiredFullRangeError {
    return error instanceof RequiredFullRangeError;
}

export async function resolvePanelRangeStateForSeries({
    panelInfo,
    boardTime,
    useLastViewedRange,
    applyInitialMainChartWindow,
}: {
    panelInfo: PanelInfo;
    boardTime: TimeRangeInput;
    useLastViewedRange: boolean;
    applyInitialMainChartWindow: boolean;
}): Promise<PanelRangeState> {
    const fullRange = await fetchRequiredFullRange(panelInfo.query.tagSet);

    return resolveConcretePanelRangeState({
        fullRange,
        rangeInput: panelInfo.time.rangeInput,
        isNumericAxis: shouldUseNumericPanelRangeInput(panelInfo.query.tagSet),
        lastViewedRange:
            useLastViewedRange && panelInfo.time.useLastViewedRange
                ? panelInfo.time.lastViewedRange
                : undefined,
        boardTime,
        applyInitialMainChartWindow,
    });
}
