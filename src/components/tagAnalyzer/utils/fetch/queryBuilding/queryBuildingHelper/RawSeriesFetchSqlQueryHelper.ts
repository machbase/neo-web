import type { RawFetchSampling } from '../../FetchTypes';

export function buildRawSeriesSamplingHint(aSampling: RawFetchSampling): string {
    return aSampling.kind === 'enabled' ? `/*+ SAMPLING(${aSampling.value}) */` : '';
}

export function buildRawSeriesOrderBySqlClause(aSortDirection: number | undefined): string {
    if (aSortDirection === 1) {
        return ' ORDER BY 1 desc';
    }

    if (aSortDirection === 2) {
        return ' ORDER BY 1';
    }

    return '';
}

export function applyRawSeriesFetchLimit(
    aSqlQuery: string,
    aRowCount: number,
    aSampling: RawFetchSampling,
): string {
    if (aSampling.kind === 'enabled') {
        return `select * from (${aSqlQuery}) LIMIT 200000`;
    }

    if (aRowCount > 0) {
        return `${aSqlQuery} LIMIT ${aRowCount}`;
    }

    return aSqlQuery;
}
