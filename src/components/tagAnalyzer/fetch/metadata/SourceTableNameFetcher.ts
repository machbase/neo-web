import request from '@/api/core';
import { parseTables } from '@/utils';
import type {
    RawTableListData,
    TableListFetchResponse,
} from './MetadataFetchTypes';

export async function fetchAllSourceTableNames(): Promise<string[]> {
    const response = await request({
        method: 'GET',
        url: '/api/tables',
    }) as TableListFetchResponse;

    if (response.success === false) {
        return [];
    }

    if (typeof response.status === 'number' && response.status >= 400) {
        return [];
    }

    return parseTables(response.data as RawTableListData);
}