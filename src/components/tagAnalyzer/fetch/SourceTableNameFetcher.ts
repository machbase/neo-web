import request from '@/api/core';
import { parseTables } from '@/utils';
import { showRequestError } from './helper/FetchRequestErrorPresenter';
import type {
    RawTableListData,
    TableListFetchResponse,
} from './FetchContracts';

async function fetchSourceTableNameResponse(): Promise<TableListFetchResponse> {
    const response = await request({
        method: 'GET',
        url: '/api/tables',
    });
    showRequestError(response);

    return response as TableListFetchResponse;
}

function parseSourceTableNamesResponse(
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

export async function fetchAvailableSourceTableNames(): Promise<string[] | undefined> {
    return parseSourceTableNamesResponse(await fetchSourceTableNameResponse());
}
