import { meanBy } from 'lodash';
import { PanelInfo, SampleType } from './../interface/chart';
const barTypeArr = ['bar', 'stackedBar'];

const isBar = (aType: string) => {
    return barTypeArr.includes(aType);
};

const lineTypeArr = ['line', 'areaLine', 'pointLine', 'point', 'stock'];

const isLine = (aType: string) => {
    return lineTypeArr.includes(aType);
};

const pieChartTypes = {
    PIE: 'pie',
    SEMI_CHART: 'semiCircleDonut',
    GRADIENT_PIE: 'gradientPie',
};

const groupChartSelectCountTypes = {
    GROUP: 'Group',
    GROUP_ALL: 'Group-all',
    EQUIPMENT: 'Equipment',
    EQUIPMENT_ALL: 'Equipment-all',
    ADDRESS: 'address',
    WEATHER: 'weather',
    LIVE_EQUIP: 'liveEquip',
    DEAD_EQUIP: 'deadEquip',
    ANALOG_CLOCK: 'analog-clock',
    DIGITAL_CLOCK: 'digital-clock',
    ALL_ALARM: 'All Alarm',
    NEW_ALARM: 'New Alarm',
};

const isPieChart = (aType: string) => {
    return [pieChartTypes.GRADIENT_PIE, pieChartTypes.PIE, pieChartTypes.SEMI_CHART].includes(aType);
};

const isGaugeChart = (aType: string) => {
    return aType === 'gauge';
};

const isTextChart = (aType: string) => {
    return aType === 'text';
};

const isCaptionChart = (aType: string) => {
    return aType === 'caption';
};

const isInformationChart = (aType: string) => {
    return aType === 'info';
};

const isImageChart = (aType: string) => {
    return aType === 'image';
};

const isWeatherChart = (aType: string) => {
    return aType === 'weather';
};

const isGroupChart = (aType: string) => {
    return aType === 'group';
};

const getDefaultHeight = (aType: string, aIsMin?: boolean, aGroupType?: string) => {
    switch (aType) {
        case 'line':
        case 'areaLine':
        case 'bar':
        case 'stackedBar':
            return aIsMin ? 4 : 5;
        case 'stock':
            return aIsMin ? 8 : 8;
        case 'pie':
        case 'gradientPie':
        case 'semiCircleDonut':
        case 'gauge':
            return aIsMin ? 7 : 7;
        case 'text':
            return 3;
        case 'grid':
            return 3;
        case 'group':
            switch (aGroupType) {
                case 'Equipment-all':
                case 'Equipment':
                case 'Group':
                case 'Group-all':
                    return aIsMin ? 3 : 3;
                case 'address':
                    return 2;
                case 'weather':
                    return 4;
                case 'analog-clock':
                    return 5;
                case 'digital-clock':
                    return 3;
                case 'Map':
                    return 8;
            }
            return aIsMin ? 3 : 3;
        case 'pointLine':
        case 'point':
            return aIsMin ? 6 : 6;
        case 'image':
            return aIsMin ? 6 : 6;
        case 'group-grid':
            return aIsMin ? 15 : 15;
    }
};

const getDefaultWidth = (aType: string, aIsMin?: boolean, aGroupType?: string) => {
    switch (aType) {
        case 'line':
        case 'areaLine':
        case 'stock':
        case 'bar':
        case 'stackedBar':
            return aIsMin ? 5 : 8;
        case 'pie':
        case 'gauge':
        case 'gradientPie':
        case 'semiCircleDonut':
            return aIsMin ? 6 : 6;
        case 'text':
            return aIsMin ? 4 : 4;
        case 'grid':
            return aIsMin ? 12 : 12;

        case 'group':
            switch (aGroupType) {
                case 'Equipment-all':
                case 'Equipment':
                case 'Group':
                case 'Group-all':
                    return aIsMin ? 5 : 5;
                case 'address':
                    return 10;
                case 'weather':
                    return 8;
                case 'analog-clock':
                    return 5;
                case 'digital-clock':
                    return 7;
                case 'Map':
                    return 8;
            }
            return aIsMin ? 5 : 5;

        case 'pointLine':
        case 'point':
            return aIsMin ? 8 : 8;
        case 'group-grid':
            return aIsMin ? 19 : 19;
    }
};

const getMinValue = (aSamples: SampleType[]) => {
    let sMin = aSamples[0].Value;

    for (const aItem of aSamples) {
        if (aItem.Value < sMin) {
            sMin = aItem.Value;
        }
    }
    return sMin;
};

const getMaxValue = (aSamples: SampleType[]) => {
    let sMax = 0;

    for (const aItem of aSamples) {
        if (aItem.Value > sMax) {
            sMax = aItem.Value;
        }
    }
    return sMax;
};

const getCalculatedValue = (aSamples: SampleType[], aCalculationType: string) => {
    if (!aSamples?.length) return 0;
    switch (aCalculationType) {
        case 'last':
            return aSamples[aSamples.length - 1]?.Value;
        case 'first':
            return aSamples[0].Value;
        case 'sum':
            return aSamples.reduce((acc: any, cur: any) => acc + cur.Value, 0);
        case 'count':
            return aSamples.length;
        case 'average':
            return meanBy(aSamples, 'Value');
        case 'min':
            return getMinValue(aSamples);
        case 'max':
            return getMaxValue(aSamples);
    }
};

const getPixelsPerTickOfBar = (aData: any) => {
    const seriesLength = (aData.tag_set || []).length;
    const minBarWidth = aData.min_width || 8;
    const minTotalWidth = minBarWidth * seriesLength;
    const totalWidth = aData.total_width ? (aData.total_width < minTotalWidth ? minTotalWidth : aData.total_width) : minTotalWidth;
    const barWidth = aData.bar_width
        ? aData.bar_width < minBarWidth
            ? minBarWidth
            : aData.bar_width
        : totalWidth / seriesLength < minBarWidth
        ? minBarWidth
        : totalWidth / seriesLength;
    const pixelsPerTick = barWidth * seriesLength + 10;
    return pixelsPerTick;
};

const getConnectionQueryString = (aPanelInfo: PanelInfo) => {
    if (aPanelInfo?.connect_info?.connect_info !== undefined) {
        const { http_port: sHttpPort, id: sUser, ip: sIp, pass: sPass } = aPanelInfo?.connect_info?.connectInfo;
        return `?ip=${sIp}&http_port=${sHttpPort}&user=${sUser}&pass=${sPass}`;
    }
    return '';
};

export {
    isBar,
    isLine,
    isPieChart,
    isGaugeChart,
    isTextChart,
    isCaptionChart,
    isInformationChart,
    isImageChart,
    isWeatherChart,
    isGroupChart,
    getDefaultHeight,
    getDefaultWidth,
    getPixelsPerTickOfBar,
    getConnectionQueryString,
    getCalculatedValue,
    pieChartTypes,
    groupChartSelectCountTypes,
};
