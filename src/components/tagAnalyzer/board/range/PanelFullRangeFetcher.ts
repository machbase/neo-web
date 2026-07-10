import { Toast } from '@/design-system/components';
import type { PanelInfo, PanelRangeState } from '../../domain/panel/PanelInfo';
import {
    shouldUseNumericPanelRangeInput,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
import type { TimeRangeInput, TimeRangeMs } from '../../domain/time/TimeTypes';
import {
    createTimeRangeMs,
    isValidTimeRange,
} from '../../domain/time/TimeRangeUtils';
import { fetchSeriesDataAvailability } from '../../fetch/panelData/DataTimeRangeFetcher';
import { showDataAvailabilityToastOnce } from './DataAvailabilityToastPresenter';
import { resolveConcretePanelRangeState } from '../../domain/panelRange/PanelRangeResolver';
import { parseNumericRangeExpression } from '../../domain/panelRange/PanelRangeInput';

const PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE =
    'Cannot resolve panel range because no valid data range was found.';

class RequiredFullRangeError extends Error {
    constructor() {
        super(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        this.name = 'RequiredFullRangeError';
    }
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
    const sExplicitNumericRangeState = resolveExplicitNumericRangeState({
        panelInfo,
        boardTime,
        useLastViewedRange,
        applyInitialMainChartWindow,
    });

    if (sExplicitNumericRangeState) {
        return sExplicitNumericRangeState;
    }

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

function resolveExplicitNumericRangeState({
    panelInfo,
    boardTime,
    useLastViewedRange,
    applyInitialMainChartWindow,
}: {
    panelInfo: PanelInfo;
    boardTime: TimeRangeInput;
    useLastViewedRange: boolean;
    applyInitialMainChartWindow: boolean;
}): PanelRangeState | undefined {
    if (!shouldUseNumericPanelRangeInput(panelInfo.query.tagSet)) {
        return undefined;
    }

    const sFullRange = resolveExplicitNumericFullRange(panelInfo.time.rangeInput);
    if (!sFullRange) {
        return undefined;
    }

    return resolveConcretePanelRangeState({
        fullRange: sFullRange,
        rangeInput: panelInfo.time.rangeInput,
        isNumericAxis: true,
        lastViewedRange:
            useLastViewedRange && panelInfo.time.useLastViewedRange
                ? panelInfo.time.lastViewedRange
                : undefined,
        boardTime,
        applyInitialMainChartWindow,
    });
}

function resolveExplicitNumericFullRange(
    rangeInput: TimeRangeInput,
): TimeRangeMs | undefined {
    const sStart = parseNumericRangeExpression(rangeInput.start);
    const sEnd = parseNumericRangeExpression(rangeInput.end);

    if (sStart?.anchor !== 'value' || sEnd?.anchor !== 'value') {
        return undefined;
    }

    const sFullRange = createTimeRangeMs(sStart.value, sEnd.value);
    return isValidTimeRange(sFullRange) ? sFullRange : undefined;
}
