import { CheckObjectKey, E_VISUAL_LOAD_ID } from '../dashboardUtil';

export enum TqlResType {
    CSV = 'csv',
    VISUAL = 'visual', // MAP, CHART
    MRK = 'mrk',
    XHTML = 'xhtml',
    TEXT = 'text',
    NDJSON = 'ndjson',
    JSON = 'json',
}
export enum E_TQL_SCR {
    TQL = 'tql',
    WRK = 'wrk',
    DSH = 'dsh',
}

export const DetermineTqlResultType = (
    type: E_TQL_SCR,
    aResult: { status: number; headers: any; data: any }
): { parsedStatus: boolean; parsedType: TqlResType; parsedData: any } => {
    let sStatus = false;
    let sType = TqlResType.TEXT;
    let sData = undefined;

    if (aResult?.status === 200) sStatus = true;
    else sData = typeof aResult?.data === 'object' ? (aResult?.data?.reason ? aResult.data.reason : JSON.stringify(aResult?.data)) : aResult?.data;

    if (sStatus) {
        if (aResult?.headers && (aResult?.headers['x-chart-type'] === 'echarts' || aResult?.headers['x-chart-type'] === 'geomap')) {
            if (aResult?.data && (CheckObjectKey(aResult?.data, E_VISUAL_LOAD_ID.CHART) || CheckObjectKey(aResult?.data, E_VISUAL_LOAD_ID.MAP))) {
                sType = TqlResType.VISUAL;
                sData = aResult.data;
            } else sData = JSON.stringify(aResult.data);
        } else if (aResult?.headers['content-type']?.includes('markdown')) {
            if (aResult?.data && typeof aResult?.data === 'string') {
                sType = TqlResType.MRK;
                sData = aResult.data;
            } else sData = JSON.stringify(aResult?.data);
        } else if (aResult?.headers['content-type']?.includes('csv')) {
            if (typeof aResult?.data === 'object') sData = JSON.stringify(aResult?.data);
            else {
                sType = TqlResType.CSV;
                sData = typeof aResult?.data === 'string' ? aResult?.data : JSON.stringify(aResult?.data);
            }
        } else if (aResult?.headers['content-type']?.includes('xhtml+xml')) {
            if (aResult?.data && typeof aResult?.data === 'string') {
                sType = TqlResType.XHTML;
                sData = aResult.data;
            } else sData = JSON.stringify(aResult?.data);
        } else if (aResult?.headers['content-type']?.includes('text/plain')) {
            if (aResult?.data && typeof aResult?.data === 'string') sData = aResult.data;
            else sData = typeof aResult?.data === 'object' ? JSON.stringify(aResult?.data) : aResult?.data;
        } else if (aResult?.headers['content-type']?.includes('ndjson')) {
            if (aResult?.data && typeof aResult?.data === 'string') {
                sType = TqlResType.NDJSON;
                sData = aResult.data;
            } else sData = typeof aResult?.data === 'object' ? JSON.stringify(aResult?.data) : aResult?.data;
        } else if (aResult?.headers['content-type']?.includes('json')) {
            if (aResult?.data && typeof aResult?.data === 'object' && aResult?.data?.success) {
                if (type === E_TQL_SCR.WRK) sData = JSON.stringify(WrkJsonParser(aResult?.data));
                if (type === E_TQL_SCR.TQL) sData = JSON.stringify(aResult?.data);
                if (type === E_TQL_SCR.DSH) sData = JSON.stringify(aResult?.data);
            } else sData = typeof aResult?.data === 'object' ? JSON.stringify(aResult?.data) : aResult?.data;
        } else sData = typeof aResult?.data === 'object' ? JSON.stringify(aResult?.data) : aResult?.data;
    }

    return { parsedStatus: sStatus, parsedType: sType, parsedData: sData };
};

const WrkJsonParser = (aData: any) => {
    if (aData && typeof aData === 'object' && aData.success) {
        if (aData.data.rows && aData.data.rows.length > 10) {
            const sLength = aData.data.rows.length;
            aData.data.rows = aData.data.rows.filter((_: number[], aIdx: number) => aIdx < 6 || sLength - 6 < aIdx);
            aData.data.rows.splice(5, 0, '....');
        }
    }
};
