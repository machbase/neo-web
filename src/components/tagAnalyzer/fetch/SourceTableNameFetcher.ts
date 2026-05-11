import request from '@/api/core';
import { parseTables } from '@/utils';
import { showRequestError } from './helper/FetchRequestErrorPresenter';
import type {
    RawTableListData,
    TableListFetchResponse,
} from './FetchContracts';

export async function fetchAvailableSourceTableNames(): Promise<string[] | undefined> {
    const response = await request({
        method: 'GET',
        url: '/api/tables',
    }) as TableListFetchResponse;
    showRequestError(response);

    if (response.success === false) {
        return undefined;
    }

    if (typeof response.status === 'number' && response.status >= 400) {
        return undefined;
    }

    return parseTables(response.data as RawTableListData);
}
