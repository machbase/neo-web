import { parseTables } from '@/utils';
import type {
    RawTableListData,
    TableListFetchResponse,
} from '../FetchTypes';

/**
 * Parses the table-list response returned by the table repository endpoint.
 * Intent: Keep backend response guards out of the repository transport function.
 *
 * @param aResponse The raw table-list response from the fetch client.
 * @returns The parsed table names, or undefined when the response is not usable.
 */
export function parseFetchTableListResponse(
    aResponse: TableListFetchResponse,
): string[] | undefined {
    if (aResponse.success === false) {
        return undefined;
    }

    if (typeof aResponse.status === 'number' && aResponse.status >= 400) {
        return undefined;
    }

    return parseTables(aResponse.data as RawTableListData);
}
