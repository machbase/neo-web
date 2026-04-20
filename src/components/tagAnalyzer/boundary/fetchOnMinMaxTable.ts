import request from '@/api/core';
import { Toast } from '@/design-system/components';
import { createMinMaxQuery } from '@/utils';
import type { SeriesColumns } from '../common/modelTypes';

type TagAnalyzerMinMaxSeries = {
    table: string;
    sourceTagName: string | undefined;
    colName: SeriesColumns | undefined;
};

type TagAnalyzerTableTagMap = {
    table: string;
    tags: string[];
    cols: SeriesColumns | undefined;
};

export type TagAnalyzerMinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
};

/**
 * Groups TagAnalyzer series configs by table while preserving sourceTagName as
 * the canonical internal tag identifier.
 * @param aTableTagInfo The series configs used to build the min/max query.
 * @returns The grouped table-tag structure consumed by the shared query builder.
 */
function createTagAnalyzerTableTagMap<T extends TagAnalyzerMinMaxSeries>(
    aTableTagInfo: T[],
): TagAnalyzerTableTagMap[] {
    const sMap: Record<
        string,
        {
            tags: string[];
            cols: SeriesColumns | undefined;
        }
    > = {};

    aTableTagInfo.forEach((aInfo) => {
        const sExistingEntry = sMap[aInfo.table];
        const sTagName = aInfo.sourceTagName || '';

        if (sExistingEntry) {
            sExistingEntry.tags.push(sTagName);
            return;
        }

        sMap[aInfo.table] = {
            tags: [sTagName],
            cols: aInfo.colName,
        };
    });

    return Object.keys(sMap).map((aTable) => ({
        table: aTable,
        tags: sMap[aTable].tags,
        cols: sMap[aTable].cols,
    }));
}

/**
 * Queries the min/max seed table for TagAnalyzer series using sourceTagName directly.
 * @param aTableTagInfo The TagAnalyzer series configs to query.
 * @param aUserName The current user name used by the query builder.
 * @returns The repository response for the min/max seed query.
 */
export async function fetchTagAnalyzerMinMaxTable<T extends TagAnalyzerMinMaxSeries>(
    aTableTagInfo: T[],
    aUserName: string,
): Promise<TagAnalyzerMinMaxTableResponse> {
    const sTableTagMap = createTagAnalyzerTableTagMap(aTableTagInfo);
    const sQuery = createMinMaxQuery(sTableTagMap, aUserName);
    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(sQuery)}`,
    });

    if (sData.status >= 400) {
        if (typeof sData.data === 'object') {
            Toast.error(sData.data.reason);
        } else {
            Toast.error(sData.data);
        }
    }

    return sData as TagAnalyzerMinMaxTableResponse;
}
