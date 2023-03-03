import moment from 'moment';
import { getPixelsPerTickOfBar, isBar, isLine } from './chart';
import { PanelInfo, BoardInfo, RangeData, startTimeToendTimeType, TimeInfo } from '@/interface/chart';
import { store } from '@/store';
import { ActionTypes } from '@/store/actions';

const _convertTimeToObject = (aDuration: any) => {
    const tM = (aDuration || 0) / 60;
    const tH = tM / 60;
    const tD = tH / 24;
    if (Math.floor(tD) > 0) return { IntervalType: 'day', IntervalValue: Math.ceil(tD) };
    else if (Math.floor(tH) > 0) return { IntervalType: 'hour', IntervalValue: Math.ceil(tH) };
    else if (Math.floor(tM) > 0) return { IntervalType: 'min', IntervalValue: Math.ceil(tM) };
    else return { IntervalType: 'sec', IntervalValue: aDuration || 1 };
};
const _convertTimeToFullDate = (aTime: string) => {
    if (aTime.indexOf('now') === -1) {
        const [dmy, hms] = aTime.split(' ');
        return `${dmy}T${hms}`;
    }
    const subtime = aTime.split('-')[1];
    if (subtime) {
        const timeNumber = parseInt(subtime);
        const timeUnit: any = subtime.match(/[a-zA-Z]/g)?.join('');
        return moment().subtract(timeNumber, timeUnit).format('YYYY-MM-DDTHH:mm:ss');
    } else return moment().format('YYYY-MM-DDTHH:mm:ss');
};
const setTimeRange = async (aPanelInfo: PanelInfo, aDashboard: BoardInfo) => {
    let timeRange = {} as RangeData;
    if (!aDashboard.range_end || !aDashboard.range_bgn) {
        // timeRange = await tag.actions.getTimeRange();
        timeRange = store.state.gRangeData;
    }
    const startTime = _convertTimeToFullDate(aPanelInfo.range_bgn || aDashboard.range_bgn || timeRange.MIN);
    const endTime = _convertTimeToFullDate(aPanelInfo.range_end || aDashboard.range_end || timeRange.MAX);
    return { startTime, endTime };
};
const getDateRange = async (aPanelInfo: PanelInfo, aDashboard: BoardInfo, aCustomRange = undefined as startTimeToendTimeType | undefined): Promise<TimeInfo> => {
    // @TODO changeTextToUtc를 사용해서, utc timestamp로 변환해서 api 요청을 날리도록 한다.
    const { startTime, endTime } = aCustomRange || ((await setTimeRange(aPanelInfo, aDashboard)) as startTimeToendTimeType);
    return {
        startTime: startTime as string,
        endTime: endTime as string,
    };
};

const stringParseNewDate = (aItem: string | number) => {
    if (typeof aItem === 'string') {
        return aItem.split(/[-T: ]/);
    } else if (typeof aItem === 'number') {
        const sTime = String(aItem).length === 10 ? moment.unix(aItem) : moment.unix(aItem / 1000);

        return [
            moment(sTime).get('year'),
            moment(sTime).get('month') + 1,
            moment(sTime).get('date'),
            moment(sTime).get('hour'),
            moment(sTime).get('minute'),
            moment(sTime).get('second'),
        ];
    } else {
        return aItem;
    }
};
const changeUtcToText = (aUtcDate: number): string => {
    const sNumberArr = stringParseNewDate(aUtcDate * 1000);
    if (
        typeof sNumberArr[0] === 'number' &&
        typeof sNumberArr[1] === 'number' &&
        typeof sNumberArr[2] === 'number' &&
        typeof sNumberArr[3] === 'number' &&
        typeof sNumberArr[4] === 'number' &&
        typeof sNumberArr[5] === 'number'
    ) {
        const sMyDate = new Date(sNumberArr[0], sNumberArr[1] - 1, sNumberArr[2], sNumberArr[3], sNumberArr[4], sNumberArr[5]);
        return moment(sMyDate).format('YYYY-MM-DD HH:mm:ss');
    } else return moment().format('YYYY-MM-DD HH:mm:ss');
};

const setChangeUtcTime = (aUtcTime: number, atimezone: string): number => {
    const newDate = new Date();
    newDate.setTime(aUtcTime * 1000);

    const sArr = newDate.toISOString().split(/[T -/ : .]/g);

    const sNumberArr = sArr.map((aItem) => {
        return Number(aItem);
    });

    const sThisDate = new Date(sNumberArr[0], sNumberArr[1] - 1, sNumberArr[2], sNumberArr[3], sNumberArr[4], sNumberArr[5]);

    const sParseTimezone = { timezone_value: atimezone };
    const sArray = [];
    // 시간과 분에 나눠서 자름
    sArray.push(sParseTimezone.timezone_value.substr(0, 3));
    sArray.push(sParseTimezone.timezone_value.substr(3, 5));
    const sAddHoursTime = sThisDate.setHours(sThisDate.getHours() + Number(sArray[0])) / 1000;

    return sAddHoursTime;
};
const setUtcTime = (aDate: number, atimezone?: string) => {
    const sString = moment(aDate).format('YYYY-MM-DD HH:mm:ss');

    const sArr = sString.split(/[-/ :]/);

    const sNumberArr = sArr.map((aItem) => {
        return Number(aItem);
    });

    const sThisDate = new Date(sNumberArr[0], sNumberArr[1] - 1, sNumberArr[2], sNumberArr[3], sNumberArr[4], sNumberArr[5]);

    const sTimezone = atimezone ? atimezone : localStorage.getItem('timezone');
    if (sTimezone) {
        const sParseTimezone = atimezone ? { timezone_value: sTimezone } : JSON.parse(sTimezone);
        const sArray = [];
        // 시간과 분에 나눠서 자름
        sArray.push(sParseTimezone.timezone_value.substr(0, 3));
        sArray.push(sParseTimezone.timezone_value.substr(3, 5));
        const sAddHoursTime = sThisDate.setHours(sThisDate.getHours() + Number(sArray[0]));

        const sHourParseArr = stringParseNewDate(sAddHoursTime);
        let sDateAddHoursTime;
        if (
            typeof sHourParseArr[0] === 'number' &&
            typeof sHourParseArr[1] === 'number' &&
            typeof sHourParseArr[2] === 'number' &&
            typeof sHourParseArr[3] === 'number' &&
            typeof sHourParseArr[4] === 'number' &&
            typeof sHourParseArr[5] === 'number'
        ) {
            sDateAddHoursTime = new Date(sHourParseArr[0], sHourParseArr[1] - 1, sHourParseArr[2], sHourParseArr[3], sHourParseArr[4], sHourParseArr[5]);
        }
        if (sDateAddHoursTime) {
            const sAddMinutesTime = sDateAddHoursTime.setMinutes(sDateAddHoursTime.getMinutes() + Number(sArray[0].substring(0, 1) + sArray[1]));
            const sParseMinutesTime = stringParseNewDate(sAddMinutesTime);

            if (
                typeof sParseMinutesTime[0] === 'number' &&
                typeof sParseMinutesTime[1] === 'number' &&
                typeof sParseMinutesTime[2] === 'number' &&
                typeof sParseMinutesTime[3] === 'number' &&
                typeof sParseMinutesTime[4] === 'number' &&
                typeof sParseMinutesTime[5] === 'number'
            ) {
                const sDateAddMinutesTime = new Date(
                    sParseMinutesTime[0],
                    sParseMinutesTime[1] - 1,
                    sParseMinutesTime[2],
                    sParseMinutesTime[3],
                    sParseMinutesTime[4],
                    sParseMinutesTime[5]
                );
                return sDateAddMinutesTime;
            }
        }
    }
    return aDate;
};

const getIntervalTime = (aChartWidth: number, aPanelInfo: any, aStart: any, aEnd: any, aIsZoomData: any) => {
    const tags = aPanelInfo.tag_set || [];
    if (aPanelInfo.interval_type && !aIsZoomData && tags[0].calculation_mode !== 'raw') {
        return {
            IntervalType: aPanelInfo.interval_type,
            IntervalValue: aPanelInfo.interval_value || 1,
        };
    } else {
        const panelType = aPanelInfo.panel_type;
        // bar, line 타입 차트가 아니면 pixelsPerTick은 무조건 1.
        // numberOfTick은 panel에 몇 분할할건지(divisions_number) 기본값은 100.
        // 사용자가 입력하게 한다. 기본값은 100이다.
        const pixelsPerTick = 1;
        const numberOfTick = aPanelInfo.divisions_number;
        // if (isLine(panelType) || isBar(panelType)) {
        //     pixelsPerTick = isBar(panelType) ? getPixelsPerTickOfBar(aPanelInfo) : aPanelInfo.pixels_per_tick || 3;
        //     numberOfTick = Math.floor(((isLine(panelType) ? aChartWidth - 60 : aChartWidth) - 16) / pixelsPerTick);
        // }
        if (tags[0].calculation_mode === 'raw') return { count: numberOfTick };
        const rangeTime = moment(aEnd).diff(moment(aStart), 's');
        //첫번째 날과 두번 째날의 차이를 구함
        // 계산된 timestamp 시간 300 / 50 numberOfTick 패널이 표시 될 개수
        const intervalTime = _convertTimeToObject(Math.round(rangeTime / numberOfTick));
        return { ...intervalTime, count: numberOfTick };
    }
};
const changeTextToUtc = (aTextDate: string) => {
    // localStorage.getItem('timezone');

    const sArr = stringParseNewDate(aTextDate);
    let sReturnDate;

    const sArrList: any = [];

    sArr.forEach((aItem: string | number) => {
        sArrList.push(Number(aItem));
    });

    if (
        typeof sArrList[0] === 'number' &&
        typeof sArrList[1] === 'number' &&
        typeof sArrList[2] === 'number' &&
        typeof sArrList[3] === 'number' &&
        typeof sArrList[4] === 'number' &&
        typeof sArrList[5] === 'number'
    ) {
        sReturnDate = new Date(sArrList[0], sArrList[1] - 1, sArrList[2], sArrList[3], sArrList[4], sArrList[5]).getTime() / 1000;
    }

    return sReturnDate;
};
const convertDurationToSecond = (aDuration: any) => {
    const timeNumber = parseInt(aDuration);
    const timeUnit = aDuration.match(/[a-zA-Z]/g).join('');
    switch (timeUnit) {
        case 's':
            return timeNumber;
        case 'm':
            return timeNumber * 60;
        case 'h':
            return timeNumber * 3600;
        case 'd':
            return timeNumber * 24 * 3600;
    }
};

export { stringParseNewDate, changeUtcToText, setChangeUtcTime, setUtcTime, getIntervalTime, getDateRange, changeTextToUtc, convertDurationToSecond, _convertTimeToFullDate };
