import moment from 'moment';
import { DAY, FORMAT_FULL_DATE, HOUR, MINUTE, SECOND } from './constants';
import { COLOR_SET } from './constants';
import { getId } from '.';

const utils = {};

const getWindowOs = () => {
    if (navigator.platform.toUpperCase().indexOf('WIN') !== -1) {
        return true;
    } else if (navigator.platform.toUpperCase().indexOf('MAC') !== -1) {
        return false;
    }
    return true;
};

const formatDate = (date: Date | string): string => {
    let dateStr;
    if (typeof date === 'string') dateStr = date;
    else dateStr = date?.toISOString();
    const [yyyy, mm, dd, hh, mi, se] = dateStr?.split(/[/:\-T. ]/) || [];
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${se}`;
};

const changeNumberType = (aNumber: string) => {
    if (!/\d+\.?\d*e[+-]*\d+/i.test(aNumber)) {
        return aNumber;
    }

    const numberSign = Math.sign(Number(aNumber));
    aNumber = Math.abs(Number(aNumber)).toString();

    const [coefficient, exponent] = aNumber.toLowerCase().split('e');
    let zeros = Math.abs(Number(exponent));
    const exponentSign = Math.sign(Number(exponent));
    const [integer, decimals] = (coefficient.indexOf('.') != -1 ? coefficient : `${coefficient}.`).split('.');

    if (exponentSign === -1) {
        zeros -= integer.length;
        aNumber = zeros < 0 ? integer.slice(0, zeros) + '.' + integer.slice(zeros) + decimals : '0.' + '0'.repeat(zeros) + integer + decimals;
    } else {
        if (decimals) zeros -= decimals.length;
        aNumber = zeros < 0 ? integer + decimals.slice(0, zeros) + '.' + decimals.slice(zeros) : integer + decimals + '0'.repeat(zeros);
    }

    return numberSign < 0 ? '-' + aNumber : aNumber;
};

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

function toTimeUtcChart(date: string | number): number {
    if (typeof date === 'string') {
        const newDate = date.split(' ');

        const newFormat: string[] = newDate.join(' ').replace(/-|:|T/gi, ' ').split(' ');
        return Date.UTC(Number(newFormat[0]), Number(newFormat[1]) - 1, Number(newFormat[2]), Number(newFormat[3]), Number(newFormat[4]), Number(newFormat[5]));
    } else {
        return date;
    }
}

function getTimeZoneValue() {
    return new Date().getTimezoneOffset();
}

function rawtoTimeUtcChart(date: string | number): number {
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
        return moment.utc(date).format(FORMAT_FULL_DATE) + ' ' + String(Math.floor(date)).substring(10, 13);
    }
    return moment.utc(date).format(FORMAT_FULL_DATE);
}

function changeNaNoToDate(date: number) {
    return moment.utc(new Date(Number(String(date).substring(0, 13)))).format(FORMAT_FULL_DATE);
}

function formatColors(colors: string) {
    const newFormat = colors.split(',').map((i) => '#' + i);
    return newFormat;
}

function convertChartType(aType: string) {
    let show_point = 'Y';
    let stroke = 0;
    let fill = 0;
    switch (aType) {
        case 'Zone':
            show_point = 'N';
            stroke = 1;
            fill = 0.15;
            break;
        case 'Dot':
            show_point = 'Y';
            stroke = 0;
            fill = 0;
            break;
        case 'Line':
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
function convertTagChartType(aTags: any) {
    return aTags.map((a: any) => {
        return {
            key: aTags.key,
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

function convertChartDefault(aChartDefault: any, aTag: any): any {
    const chart = convertChartType(aTag.chartType);
    const tagSet = convertTagChartType(aTag.tagSet);
    return {
        ...aChartDefault,
        index_key: getId(),
        default_range: aTag.defaultRange,
        color_set: COLOR_SET,
        show_point: chart.show_point,
        stroke: chart.stroke,
        fill: chart.fill,
        chart_type: aTag.chartType,
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
const isJsonString = (aString: string) => {
    try {
        const json = JSON.parse(aString);
        return typeof json === 'object';
    } catch {
        return false;
    }
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
    changeNumberType,
    changeNaNoToDate,
    getWindowOs,
    getTimeZoneValue,
    isJsonString,
};
