import { TagzCsvParser } from '@/utils/tqlCsvParser';
import { showRequestError } from '../FetchRequestErrorPresenter';
import type {
    ChartFetchApiResponse,
    ChartFetchResponse,
} from '../FetchTypes';

/**
 * Parses the shared chart CSV response and preserves the original response metadata.
 * Intent: Normalize chart responses and surface backend errors through the shared toast path.
 *
 * @param apiResponse The raw chart fetch response returned by the request client.
 * @returns The normalized chart response, or undefined when the request fails or is not CSV text.
 */
export function parseChartCsvResponse(
    apiResponse: ChartFetchApiResponse,
): ChartFetchResponse | undefined {
    if (apiResponse.status >= 400) {
        showRequestError(apiResponse);
        return undefined;
    }

    if (typeof apiResponse.data !== 'string') {
        return undefined;
    }

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: TagzCsvParser(apiResponse.data),
        },
    };
}
