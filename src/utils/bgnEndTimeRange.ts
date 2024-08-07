import { fetchVirtualStatTable } from '@/api/repository/machiot';
import moment from 'moment';

interface TIME_RANGE_TYPE {
    bgn: string | number;
    end: string | number;
}

/**
 * For taganalyzer
 * @TIME_RANGE_TYPE { bgn: string | number; end: string | number; }
 * @param boardTime TIME_RANGE_TYPE
 * @param panelTime TIME_RANGE_TYPE
 * @returns
 */
export const getBgnEndTimeRange = async (baseTable: any, boardTime: TIME_RANGE_TYPE, panelTime: TIME_RANGE_TYPE) => {
    const sUseCustomTime: boolean = panelTime.bgn !== '' && panelTime.end !== '';
    const sBaseTimeRange: TIME_RANGE_TYPE = sUseCustomTime ? panelTime : boardTime;
    // const sBaseTimeRange: TIME_RANGE_TYPE = boardTime;
    const sResult = {
        bgn_min: sBaseTimeRange.bgn,
        bgn_max: sBaseTimeRange.bgn,
        end_min: sBaseTimeRange.end,
        end_max: sBaseTimeRange.end,
    };
    if (typeof sBaseTimeRange.bgn === 'string' && sBaseTimeRange.bgn.includes('last') && typeof sBaseTimeRange.end === 'string' && sBaseTimeRange.end.includes('last')) {
        const sBaseTable = baseTable[0];
        const sTagList = baseTable.filter((aTable: any) => sBaseTable.table === aTable.table);
        const sVirtualStatInfo = await fetchVirtualStatTable(
            sBaseTable.table,
            sTagList.map((aTag: any) => aTag.tagName),
            sBaseTable
        );
        if (sVirtualStatInfo && sVirtualStatInfo.length > 0) {
            const sBgnList = sVirtualStatInfo.map((aStat: any) => aStat[0]).sort((pre: number, cur: number) => pre - cur);
            const sEndList = sVirtualStatInfo.map((aStat: any) => aStat[1]).sort((pre: number, cur: number) => pre - cur);
            // bgn_min, bgn_max, end_min, end_max
            sResult.bgn_min = sBgnList[0];
            sResult.bgn_max = sBgnList.at(-1);
            sResult.end_min = sEndList[0];
            sResult.end_max = sEndList.at(-1);
        }
        return sResult;
    } else return sResult;
};

/**
 * For taganalyzer & dashboard
 * @param aTime number
 * @param aSubtract string (ex - 1m, 1h, 1d...)
 * @returns time - subtract (milli sec)
 */
export const subtractTime = (aTime: number, aSubtract: string) => {
    const sSubtract = aSubtract.split('-')[1];
    let sResult = Math.floor(aTime / 1000000); // Set ms
    if (sSubtract) {
        const sTimeNumber = parseInt(sSubtract);
        const sTimeUnit = sSubtract.match(/[a-zA-Z]/g)?.join('');
        sResult =
            moment(aTime / 1000000)
                .subtract(sTimeNumber, sTimeUnit as any)
                .unix() * 1000;
    }
    return sResult;
};

export const timeMinMaxConverter = (aStart: string | number, aEnd: string | number, aSvrRes: { min: number; max: number }) => {
    let sTimeMinMax: any = undefined;
    if (typeof aStart === 'string' && typeof aEnd === 'string') {
        if (aStart === '') sTimeMinMax = aSvrRes;
        if (aStart.includes('last') || aEnd.includes('last')) sTimeMinMax = { min: subtractTime(aSvrRes.max * 1000000, aStart), max: subtractTime(aSvrRes.max * 1000000, aEnd) };
        if (aStart.includes('now') || aEnd.includes('now')) {
            const sNowTime = moment().unix() * 1000;
            sTimeMinMax = { min: subtractTime(sNowTime * 1000000, aStart), max: subtractTime(sNowTime * 1000000, aEnd) };
        }
    }
    if (typeof aStart === 'number') sTimeMinMax = { min: aStart, max: aEnd };
    return sTimeMinMax;
};
