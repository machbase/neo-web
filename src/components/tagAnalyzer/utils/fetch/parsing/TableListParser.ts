import { parseTables } from '@/utils';
import type {
    RawTableListData,
    TableListFetchResponse,
} from '../FetchTypes';

/**
 * Parses the table-list response returned by the table repository endpoint.
 * Intent: Keep backend response guards out of the repository transport function.
 *
 * @param response The raw table-list response from the fetch client.
 * @returns The parsed table names, or undefined when the response is not usable.
 */
export function parseFetchTableListResponse(
    response: TableListFetchResponse,
): string[] | undefined {
    if (response.success === false) {
        return undefined;
    }

    if (typeof response.status === 'number' && response.status >= 400) {
        return undefined;
    }

    return parseTables(response.data as RawTableListData);
}
