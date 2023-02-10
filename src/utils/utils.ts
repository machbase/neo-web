// import { getWebStatus, getDataStatus, getReportStatus, getCacheStatus } from '@/api/repository/userManagement';
// const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

import moment from 'moment';
import { DAY, FORMAT_FULL_DATE, HOUR, MINUTE, SECOND } from './constants';

const utils = {
    // delay,
};
const formatDate = (date: Date | string): string => {
    let dateStr;
    if (typeof date === 'string') dateStr = date;
    else dateStr = date?.toISOString();
    // let dateStr = date.toISOString();
    const [yyyy, mm, dd, hh, mi, se] = dateStr?.split(/[/:\-T. ]/) || [];
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${se}`;
};
// const getStatusTimeCheck = async (aType: string) => {
//     let webTimeS = 0;
//     let webTimeE = 0;
//     switch (aType) {
//         case 'web':
//             webTimeS = performance.now();
//             await getWebStatus();
//             webTimeE = performance.now();
//             return (webTimeE - webTimeS).toFixed();
//         case 'data':
//             webTimeS = performance.now();
//             await getDataStatus();
//             webTimeE = performance.now();
//             return (webTimeE - webTimeS).toFixed();
//         case 'report':
//             webTimeS = performance.now();
//             await getReportStatus();
//             webTimeE = performance.now();
//             return (webTimeE - webTimeS).toFixed();
//         case 'cache':
//             webTimeS = performance.now();
//             await getCacheStatus();
//             webTimeE = performance.now();
//             return (webTimeE - webTimeS).toFixed();
//         default:
//             return 0;
//     }
// };

function splitTimeDuration(aTime: string) {
    const sRet = { type: '', value: 1, error: '' };
    const sTemp = aTime.trim().toLowerCase();
    if (sTemp != '' && sTemp != 'off') {
        const sUnitS = sTemp.slice(-1);
        if (![DAY, HOUR, MINUTE, SECOND].includes(sUnitS)) {
            sRet.type = '';
            sRet.value = 1;
            sRet.error = 'type';
        } else {
            sRet.type = sUnitS;

            const sVals = parseInt(sTemp.slice(0, -1).trim());
            if (isNaN(sVals)) {
                sRet.value = 1;
                sRet.error = 'value';
            } else {
                sRet.value = sVals;
            }
        }
    } else {
        sRet.type = '';
        sRet.value = 1;
        sRet.error = 'empty';
    }

    return sRet;
}

function toTimeUtcChart(date: string) {
    const newDate = date.split(' ');
    const newFormat: string[] = newDate.join(' ').replace(/-|:|T/gi, ' ').split(' ');
    return Date.UTC(Number(newFormat[0]), Number(newFormat[1]) - 1, Number(newFormat[2]), Number(newFormat[3]), Number(newFormat[4]), Number(newFormat[5]));
}
export { utils, splitTimeDuration, formatDate, toTimeUtcChart };
