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
 * @param aApiResponse The raw chart fetch response returned by the request client.
 * @returns The normalized chart response, or undefined when the request fails or is not CSV text.
 */
export function parseChartCsvResponse(
    aApiResponse: ChartFetchApiResponse,
): ChartFetchResponse | undefined {
    if (aApiResponse.status >= 400) {
        showRequestError(aApiResponse);
        return undefined;
    }

    if (typeof aApiResponse.data !== 'string') {
        return undefined;
    }

    return {
        data: {
            column: ['TIME', 'VALUE'],
            rows: TagzCsvParser(aApiResponse.data),
        },
    };
}
