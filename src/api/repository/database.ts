import { SQL_BASE_LIMIT } from '@/utils/sqlFormatter';
import request from '../core';

const parseTqlResponse = (data: any) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    return data;
};

const getReasonText = (data: any) => {
    const parsedData = parseTqlResponse(data?.data ?? data);
    const reason = parsedData?.reason ?? data?.reason;
    if (typeof reason === 'string') return reason;
    if (reason === null || reason === undefined) return data?.toString?.() ?? '';
    try {
        return JSON.stringify(reason);
    } catch {
        return String(reason);
    }
};

const wrapSqlForTql = (sql: string) => `SQL(\`${sql.replace(/`/g, '\\`')}\`)\nJSON()`;

export const fetchQuery = async (query: string) => {
    const sData: any = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(query),
    });
    return { svrState: sData?.success ?? false, svrData: sData?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
};
/**
 * Run SQL through TQL over POST.
 *
 * The body carries the statement, so nothing about its length reaches a URL — which is what makes
 * this the transport for queries whose size is driven by user selection (a JSON key projection adds
 * one `->` expression per selected key, and `fetchQuery` would percent-encode all of it into
 * `?q=`). `signal` abandons a read the caller has already moved on from.
 */
export const fetchTqlWithoutConsole = async (aSql: string, signal?: AbortSignal) => {
    const query = wrapSqlForTql(aSql);
    const consoleId = localStorage.getItem('consoleId');

    const requestConfig: any = {
        method: 'POST',
        url: `/api/tql`,
        data: query,
        signal,
    };

    requestConfig.headers = {
        'X-Console-Id': consoleId + ', console-log-level=NONE' || '',
        'X-Console-Log-Level': 'NONE',
    };

    const sData: any = await request(requestConfig);
    const parsedData = parseTqlResponse(sData?.data);

    return { svrState: parsedData?.success ?? false, svrData: parsedData?.data, svrReason: getReasonText(sData) };
};

export const fetchTqlQuery = async (aSql: string, aPage: number, aTake: number | undefined = SQL_BASE_LIMIT) => {
    const query = 'SQL(' + '`' + aSql + '`)\n' + 'DROP(' + aPage * SQL_BASE_LIMIT + `)\nTAKE(${aTake})\nJSON()`;
    const sData: any = await request({
        method: 'POST',
        url: `/api/tql/dsh`,
        data: query,
    });

    return { svrState: sData?.data?.success ?? false, svrData: sData?.data?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
};
