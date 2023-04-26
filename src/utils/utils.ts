// import { getWebStatus, getDataStatus, getReportStatus, getCacheStatus } from '@/api/repository/userManagement';
// const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

import moment from 'moment';
import { DAY, FORMAT_FULL_DATE, HOUR, MINUTE, SECOND } from './constants';
import { PanelInfo, TagSet } from '@/interface/chart';
import { TempNewChartData } from '@/interface/tagView';
import { COLOR_SET } from './constants';
import { MAX_TAG_COUNT } from '@/components/popup-list/popup/constant';
import { YorN } from '@/interface/constants';
import { string } from 'joi';

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

function toTimeUtcChart(date: string | number, a?: any): number {
    if (typeof date === 'string') {
        const newDate = date.split(' ');

        const newFormat: string[] = newDate.join(' ').replace(/-|:|T/gi, ' ').split(' ');
        return Date.UTC(Number(newFormat[0]), Number(newFormat[1]) - 1, Number(newFormat[2]), Number(newFormat[3]), Number(newFormat[4]), Number(newFormat[5]));
    } else {
        return date;
    }
}

function rawtoTimeUtcChart(date: string | number, a?: any): number {
    if (typeof date === 'string') {
        const newDate = date.split(' ');

        const sMillisec = newDate[2].split(':')[0];
        const newFormat: string[] = newDate.join(' ').replace(/-|:|T/gi, ' ').split(' ');
        return Number(
            Date.UTC(Number(newFormat[0]), Number(newFormat[1]) - 1, Number(newFormat[2]), Number(newFormat[3]), Number(newFormat[4]), Number(newFormat[5])) / 1000 + sMillisec
        );
    } else {
        return date;
    }
}

function makeNanoTime(aDate: number, aForm: string) {
    if (String(aDate).length >= 13) {
        return Number(Math.floor(aDate / 1000) + String(aForm).split(' ')[2].replaceAll(':', ''));
    } else {
        return aDate;
    }
}

function makeMilliTime(aTime: number | string) {
    if (typeof aTime === 'string') return aTime;
    if (String(aTime).length === 19) {
        return Number(Math.floor(aTime / 1000000));
    } else if (String(aTime).length === 16) {
        return Number(Math.floor(aTime / 1000000) * 1000);
    } else {
        return aTime;
    }
}

function toDateUtcChart(date: number, aMilli?: boolean) {
    if (aMilli) {
        return moment.utc(date).format(FORMAT_FULL_DATE) + ' ' + String(Math.floor(date)).substring(9, 12);
    }
    return moment.utc(date).format(FORMAT_FULL_DATE);
}

function formatColors(colors: string) {
    const newFormat = colors.split(',').map((i) => '#' + i);
    return newFormat;
}

function convertChartType(aType: number) {
    let show_point = 'Y';
    let stroke = 0;
    let fill = 0;
    switch (aType) {
        case 0:
            show_point = 'N';
            stroke = 1;
            fill = 0.15;
            break;
        case 1:
            show_point = 'Y';
            stroke = 0;
            fill = 0;
            break;
        case 2:
            show_point = 'Y';
            stroke = 1;
            fill = 0;
            break;
    }
    return {
        show_point,
        stroke,
        fill,
    };
}
function convertTagChartType(aTags: TagSet[]) {
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
        default_range: aTag.defaultRange,
        color_set: COLOR_SET,
        show_point: chart.show_point as YorN,
        stroke: chart.stroke,
        fill: chart.fill,
        tag_set: tagSet,
    };
}
const getPaginationPages = (items: any, pageSize: number): any => {
    let lastItemOnPage = pageSize;
    let currentItemIndex = 0;
    const numberOfChunks = Math.ceil(items.length / lastItemOnPage);
    const paginationItems = [];
    for (let currentChunk = 0; currentChunk < numberOfChunks; currentChunk += 1) {
        paginationItems.push(items.slice(currentItemIndex, lastItemOnPage));
        currentItemIndex += pageSize;
        lastItemOnPage += pageSize;
    }
    return paginationItems;
};
export {
    utils,
    splitTimeDuration,
    makeNanoTime,
    formatDate,
    toTimeUtcChart,
    makeMilliTime,
    formatColors,
    convertChartDefault,
    convertChartType,
    convertTagChartType,
    getPaginationPages,
    toDateUtcChart,
    rawtoTimeUtcChart,
};
