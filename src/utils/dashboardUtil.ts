import { NONAME } from 'dns';
import { getId } from '.';

export const tagTableValue = () => {
    return {
        id: getId(),
        table: '',
        type: 'tag',
        aggregator: '',
        tag: '',
        filter: [{ id: getId(), column: '', operator: '', value: '' }],
        name: '',
        time: '',
        values: [{ id: getId(), alias: '', value: '', aggregator: '' }],
        useRollup: '',
    };
};

export const tagAggregatorList = ['none', 'sum', 'count', 'min', 'max', 'avg', 'sumsq'];

const logTableValue = () => {
    return {
        id: getId(),
        table: '',
        aggregator: '',
        alias: '',
        filter: [],
        values: [],
    };
};

export const defaultTimeSeriesData = (aTable: any) => {
    const sData = {
        //default Option
        panelName: 'chart Title',
        dataType: 'timeSeries',
        chartType: 'line',
        i: getId(),
        x: 0,
        y: 0,
        w: 7,
        h: 7,
        // Info
        useDataZoom: false,
        dataZoomType: 'silder',
        dataZoomMin: 0,
        dataZoomMax: 100,
        useOpacity: false,
        opacity: 1,
        useAutoRotate: false,
        autoRotate: 0,
        useGridSize: false,
        gridSizeWidth: 100,
        gridSizeHeight: 100,
        gridSizeDepth: 100,
        useVisualMap: false,
        visualMapMin: 0,
        visualMapMax: 1,
        useMarkArea: false,
        markArea: [
            {
                id: getId(),
                coord0: 'now+1s',
                coord1: 'now+2s',
                label: 'Error',
                color: '#ff000033',
                opacity: 0,
            },
        ],
        theme: 'vintage',
        // otherInfo
        // showXTickline: true,
        // showYTickline: true,
        // pixelsPerTick: 3,
        // zeroBase: false,
        // useCustom: false,
        // lineWidth: 1,
        // useCustomMin: 0,
        // useCustomMax: 0,
        // showPoint: false,
        // pointRadius: 1,
        // showYaxisRightTickline: false,
        // zeroBaseRightYaxis: false,
        // useRightYaxis: false,
        // useCustomRightYaxis: false,
        // useCustomRightYaxisMin: 0,
        // useCustomRightYaxisMax: 0,

        //timeRange
        timeRange: {
            start: new Date().getTime() - 30000,
            end: new Date().getTime(),
            refreshTime: 0,
        },
        // query
        series: [getTableType(aTable[4]) === 'tag' ? { ...tagTableValue(), table: aTable[3] } : { ...logTableValue(), table: aTable[3] }],
    };
    return sData;
};

export const getTableType = (aTypeNumber: number) => {
    switch (aTypeNumber) {
        case 0:
            return 'log';
        case 1:
            return 'fixed';
        case 3:
            return 'volatile';
        case 4:
            return 'lookup';
        case 5:
            return 'kv';
        case 6:
            return 'tag';
        default:
            return '';
    }
};

export const getColumnType = (columnId: number) => {
    switch (columnId) {
        case 104:
            return 'ushort';
        case 8:
            return 'integer';
        case 108:
            return 'uinteger';
        case 12:
            return 'long';
        case 112:
            return 'ulong';
        case 16:
            return 'float';
        case 20:
            return 'double';
        case 5:
            return 'varchar';
        case 49:
            return 'text';
        case 53:
            return 'clob';
        case 57:
            return 'blob';
        case 97:
            return 'binary';
        case 6:
            return 'datetime';
        case 32:
            return 'ipv4';
        case 36:
            return 'ipv6';
        case 61:
            return 'json';
        default:
            return 'unknown ' + `(${columnId})`;
    }
};
