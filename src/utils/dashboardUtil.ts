import { NONAME } from 'dns';
import { getId } from '.';

export const tagTableValue = () => {
    return {
        id: getId(),
        table: '',
        aggregator: '',
        tag: '',
        filter: [],
        name: '',
        time: '',
        values: [{ id: getId(), alias: '', value: '' }],
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
        dataType: 'timeSeries',
        chartType: 'line',
        timeRange: {
            start: new Date().getTime() - 30000,
            end: new Date().getTime(),
            refreshTime: 0,
        },
        i: getId(),
        x: 0,
        y: 0,
        w: 7,
        h: 7,
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
