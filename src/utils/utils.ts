// import { getWebStatus, getDataStatus, getReportStatus, getCacheStatus } from '@/api/repository/userManagement';
// const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

import moment from 'moment';
import { DAY, FORMAT_FULL_DATE, HOUR, MINUTE, SECOND } from './constants';
import { PanelInfo } from '@/interface/chart';
import { TempNewChartData } from '@/interface/tagView';
import { COLOR_SET } from './constants';
import { MAX_TAG_COUNT } from '@/components/popup-list/popup/constant';

const utils = {};
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

function toTimeUtcChart(date: string | number) {
    if (typeof date === 'string') {
        const newDate = date.split(' ');
        const newFormat: string[] = newDate.join(' ').replace(/-|:|T/gi, ' ').split(' ');
        return Date.UTC(Number(newFormat[0]), Number(newFormat[1]) - 1, Number(newFormat[2]), Number(newFormat[3]), Number(newFormat[4]), Number(newFormat[5]));
    } else {
        return date;
    }
}

function formatColors(colors: string) {
    const newFormat = colors.split(',').map((i) => '#' + i);
    return newFormat;
}

function convertChartType(aType: number) {
    let show_point = 'Y';
    let stroke = 0;
    switch (aType) {
        case 0:
            show_point = 'N';
            stroke = 1;
            break;
        case 1:
            show_point = 'Y';
            stroke = 0;
            break;
        case 2:
            show_point = 'Y';
            stroke = 1;
            break;
    }
    return {
        show_point,
        stroke,
    };
}
function convertTagChartType(aTags: []) {
    return aTags.map((a) => {
        return {
            max: 0,
            min: 0,
            use_y2: 'N',
            alias: '',
            weight: 1,
            table: 'TAG',
            ...a,
        };
    });
}

function convertChartDefault(aChartDefault: PanelInfo, aTag: TempNewChartData): PanelInfo {
    const chart = convertChartType(aTag.chartType);
    const tagSet = convertTagChartType(aTag.tagSet);
    // const timeout = 20000;
    return {
        ...aChartDefault,
        color_set: COLOR_SET,
        show_point: chart.show_point,
        stroke: chart.stroke,
        fill: 0,
        tag_set: tagSet,
    };
}
const getPaginationPages = (items: any): any => {
    let lastItemOnPage = MAX_TAG_COUNT;
    let currentItemIndex = 0;
    const numberOfChunks = Math.ceil(items.length / lastItemOnPage);
    const paginationItems = [];

    for (let currentChunk = 0; currentChunk < numberOfChunks; currentChunk += 1) {
        paginationItems.push(items.slice(currentItemIndex, lastItemOnPage));
        currentItemIndex += MAX_TAG_COUNT;
        lastItemOnPage += MAX_TAG_COUNT;
    }
    console.log("🚀 ~ file: utils.ts:147 ~ getPaginationPages ~ paginationItems:", paginationItems)
    return paginationItems;
};

export { utils, splitTimeDuration, formatDate, toTimeUtcChart, formatColors, convertChartDefault, convertChartType, convertTagChartType, getPaginationPages };
