import { Toast } from '@/design-system/components';
import type { FetchPanelSeriesRowsResult } from '../../fetch/panelData/PanelDataFetchTypes';

export function hasFetchLimitReached(result: FetchPanelSeriesRowsResult): boolean {
    return result.seriesFetchResults.some(
        ({ isLimitReached }) => isLimitReached === true,
    );
}

export function hasSeriesFetchError(result: FetchPanelSeriesRowsResult): boolean {
    return result.seriesFetchResults.some(
        ({ error }) => error !== undefined,
    );
}

export function showPanelFetchLimitToast(
    result: FetchPanelSeriesRowsResult,
): void {
    if (!hasFetchLimitReached(result)) {
        return;
    }

    Toast.warning('Only limit amount was displayed.', undefined);
}

export function showSeriesAvailabilityToast(
    result: FetchPanelSeriesRowsResult,
): void {
    const sUnavailableSeriesCount = getUnavailableSeriesCount(result);

    if (sUnavailableSeriesCount === 0) {
        return;
    }

    const sMessage =
        sUnavailableSeriesCount === result.seriesFetchResults.length &&
        hasOnlyNoDataSeriesErrors(result)
            ? 'No series data could be loaded.'
            : 'Some series could not be loaded.';

    Toast.error(sMessage);
}

function getUnavailableSeriesCount(result: FetchPanelSeriesRowsResult): number {
    return result.seriesFetchResults.filter(
        ({ error }) => error !== undefined,
    ).length;
}

function hasOnlyNoDataSeriesErrors(result: FetchPanelSeriesRowsResult): boolean {
    return result.seriesFetchResults.every(
        ({ error }) => error?.kind === 'no-data',
    );
}
