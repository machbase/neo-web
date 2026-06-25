import { Toast } from '@/design-system/components';
import type { PanelSeriesDefinition } from '../domain/SeriesDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { isValidTimeRange } from '../domain/time/TimeRangeUtils';
import { fetchSeriesDataAvailability } from '../fetch/panelData/DataTimeRangeFetcher';
import { showDataAvailabilityToastOnce } from './range/DataAvailabilityToastPresenter';
import {
    PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE,
    getFullRangeFromSeries,
    resolvePanelRangeStateForSeries,
} from './range/PanelFullRangeFetcher';

export { getFullRangeFromSeries, resolvePanelRangeStateForSeries };

export async function fetchFullRangeOrWarn(
    seriesList: PanelSeriesDefinition[],
): Promise<TimeRangeMs | undefined> {
    if (seriesList.length === 0) {
        Toast.error(PANEL_FULL_RANGE_UNAVAILABLE_MESSAGE);
        return undefined;
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

        return undefined;
    }

    return sFullRange;
}
