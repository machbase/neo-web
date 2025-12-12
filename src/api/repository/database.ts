import { SQL_BASE_LIMIT } from '@/utils/sqlFormatter';
import request from '../core';

export const fetchQuery = async (query: string) => {
    const sData: any = await request({
        method: 'GET',
        url: `/api/query?q=` + encodeURIComponent(query),
    });
    return { svrState: sData?.success ?? false, svrData: sData?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
};
export const fetchTqlWithoutConsole = async (aSql: string) => {
    const query = `SQL('${aSql}')\nJSON()`;
    const consoleId = localStorage.getItem('consoleId');

    const requestConfig: any = {
        method: 'POST',
        url: `/api/tql`,
        data: query,
    };

    requestConfig.headers = {
        'X-Console-Id': consoleId + ', console-log-level=NONE' || '',
        'X-Console-Log-Level': 'NONE',
    };

    const sData: any = await request(requestConfig);

    return { svrState: sData?.data?.success ?? false, svrData: sData?.data?.data, svrReason: sData?.data?.reason ?? sData?.reason ?? sData?.toString() };
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
