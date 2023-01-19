// import { getWebStatus, getDataStatus, getReportStatus, getCacheStatus } from '@/api/repository/userManagement';
// const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

import { DAY, HOUR, MINUTE, SECOND } from './constants';

const utils = {
    // delay,
};
const formatDate = (date: Date): string => {
    const dateStr = date.toISOString();
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

export { utils, splitTimeDuration, formatDate };
