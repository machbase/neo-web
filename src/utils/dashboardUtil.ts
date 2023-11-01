import { getId } from '.';

export const convertToMachbaseIntervalMs = (intervalMs: number) => {
    let ms = '';
    let unit = '';
    if (intervalMs < 1000) {
        ms = intervalMs.toString();
        unit = 'msec';
    } else if (intervalMs < 60 * 1000) {
        ms = Math.ceil(intervalMs / 1000).toString();
        unit = 'sec';
    } else if (intervalMs < 60 * 60 * 1000) {
        ms = Math.ceil(intervalMs / 1000 / 60).toString();
        unit = 'min';
    } else if (intervalMs < 60 * 60 * 24 * 1000) {
        ms = Math.ceil(intervalMs / 1000 / 60 / 60).toString();
        unit = 'hour';
    } else {
        ms = Math.ceil(intervalMs / 1000 / 60 / 60 / 24).toString();
        unit = 'day';
    }
    return ms + ' ' + unit;
};

export const checkValueBracket = (value: string) => {
    if (value.includes('(') && value.includes(')')) {
        return true;
    } else {
        return false;
    }
};

export const setUnitTime = (aTime: any) => {
    if (aTime === 'now') return new Date().getTime();
    else if (!isNaN(Number(aTime))) return Number(aTime);
    else {
        let sAggrPlus = true;

        if (aTime.includes('-')) sAggrPlus = false;

        const sCalcTime = aTime.slice(0, -1).split(sAggrPlus ? '+' : '-')[1];

        let sSecTime = -1;
        switch (aTime.slice(-1)) {
            case 's':
                sSecTime = sCalcTime * 1000;
                break;
            case 'm':
                sSecTime = sCalcTime * 1000 * 60;
                break;
            case 'h':
                sSecTime = sCalcTime * 1000 * 3600;
                break;
            case 'd':
                sSecTime = sCalcTime * 1000 * 24 * 3600;
                break;
            case 'y':
                sSecTime = sCalcTime * 1000 * 24 * 3600 * 365;
                break;
        }

        return new Date().getTime() - sSecTime;
    }
};

export const createQuery = (aInfo: any, aTime: any, aStart: number, aEnd: number) => {
    if (aInfo.useRollup && aTime.IntervalType === 'day' && aInfo.type === 'tag' && aInfo.useCustom && aInfo.aggregator !== 'none') {
        let sTime = '';
        let sValue = '';
        let sSubQuery = '';
        let sFilter = '';
        const sWhereTime = `${aInfo.time} between ${aStart}000000 and ${aEnd}000000`;

        let sRollupValue = 1;
        if (aTime.IntervalType === 'sec') {
            sRollupValue = 1;
        } else if (aTime.IntervalType === 'min') {
            sRollupValue = 60;
        } else if (aTime.IntervalType === 'hour') {
            sRollupValue = 3600;
        }
        const sTimeValue = sRollupValue * 1000000000;
        sTime = `${aInfo.time} / ${sTimeValue} * ${sTimeValue} AS TIME`;

        const sList = aInfo.values.map((aItem: any) => {
            let sAlias;
            let sInfoValue;
            if (aItem.aggregator === 'avg') {
                sInfoValue = `sum(SVAL)/ sum(CVAL)`;
            } else if (aInfo.aggregator === 'sum' || aInfo.aggregator === 'count' || aInfo.aggregator === 'sumsq') {
                sInfoValue = `${aInfo.aggregator}(SVAL)`;
            } else if (aInfo.aggregator === 'min' || aInfo.aggregator === 'max') {
                sInfoValue = `${aInfo.aggregator}(SVAL)`;
            }

            if (!aItem.alias) {
                sAlias = `${aItem.aggregator}(${aItem.value})`;
            } else {
                sAlias = aItem.alias;
            }
            if (aItem.aggregator === 'none') return `${aItem.value} as "${sAlias}"`;
            return `${sInfoValue} as "${sAlias}"`;
        });
        sValue = sList.join(', ');

        let sSubQTime = '';
        let sSubQValue = '';

        sSubQTime = `${aInfo.time} ROLLUP 1 HOUR as TIME`;

        if (aInfo.aggregator === 'avg') {
            sSubQValue = `sum(${aInfo.value}) as SVAL, count(${aInfo.value}) as CVAL`;
        } else {
            sSubQValue = `${aInfo.aggregator}(${aInfo.value}) as CVAL`;
        }

        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });

                if (
                    sTableInfo &&
                    (sTableInfo[1] === 4 ||
                        sTableInfo[1] === 8 ||
                        sTableInfo[1] === 12 ||
                        sTableInfo[1] === 16 ||
                        sTableInfo[1] === 20 ||
                        sTableInfo[1] === 104 ||
                        sTableInfo[1] === 108 ||
                        sTableInfo[1] === 112)
                ) {
                    sValue = `${aItem.value}`;
                } else {
                    sValue = `'${aItem.value}'`;
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        sFilter = sFilterList.join(' AND ');

        sSubQuery = `SELECT ${sSubQTime}, ${sSubQValue} FROM ${aInfo.userName}.${aInfo.table} WHERE ${sWhereTime} AND ${sFilter} GROUP BY TIME`;

        const sQuery = `SELECT ${sTime}, ${sValue} FROM (${sSubQuery}) GROUP BY TIME ORDER BY TIME`;

        return sQuery;
    } else {
        let sTime = '';
        let sValue = '';
        const sTableName = `${aInfo.userName}.${aInfo.table}`;
        let sWhereTime = '';
        let sFilter = '';
        let useGroupBy = true;

        if (aInfo.useRollup) {
            sTime = `${aInfo.time} ROLLUP ${aTime.IntervalValue} ${aTime.IntervalType} AS TIME`;
        } else {
            let sRollupValue = 1;
            if (aTime.IntervalType === 'sec') {
                sRollupValue = 1;
            } else if (aTime.IntervalType === 'min') {
                sRollupValue = 60;
            } else if (aTime.IntervalType === 'hour') {
                sRollupValue = 3600;
            }
            const sTimeValue = sRollupValue * 1000000000;
            sTime = `${aInfo.time} / ${sTimeValue} * ${sTimeValue} AS TIME`;
        }

        if (aInfo.type === 'tag') {
            if (aInfo.useCustom) {
                let sAlias;
                if (!aInfo.values[0].alias) {
                    sAlias = `${aInfo.values[0].aggregator}(${aInfo.values[0].value})`;
                } else {
                    sAlias = aInfo.values[0].alias;
                }
                sValue =
                    aInfo.values[0].aggregator === 'none' ? `${aInfo.values[0].value} as "${sAlias}"` : `${aInfo.values[0].aggregator}(${aInfo.values[0].value}) as "${sAlias}"`;
                if (aInfo.values[0].aggregator === 'none') useGroupBy = false;
            } else {
                sValue =
                    aInfo.aggregator === 'none'
                        ? `${aInfo.value} as "${aInfo.aggregator}(${aInfo.value})"`
                        : `${aInfo.aggregator}(${aInfo.value}) as "${aInfo.aggregator}(${aInfo.value})"`;
            }
            if (aInfo.aggregator === 'none') {
                useGroupBy = false;
                sValue = `${aInfo.value} as "${'raw'}(${aInfo.value})"`;
            }
        } else {
            const sList = aInfo.values.map((aItem: any) => {
                let sAlias;
                if (!aItem.alias) {
                    sAlias = `${aItem.aggregator}(${aItem.value})`;
                } else {
                    sAlias = aItem.alias;
                }
                if (aItem.aggregator === 'none') {
                    useGroupBy = false;

                    return `${aItem.value} as "${sAlias}"`;
                }
                return `${aItem.aggregator}(${aItem.value}) as "${sAlias}"`;
            });
            sValue = sList.join(', ');
        }

        sWhereTime = `${aInfo.time} between ${aStart}000000 and ${aEnd}000000`;

        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });

                if (
                    sTableInfo &&
                    (sTableInfo[1] === 4 ||
                        sTableInfo[1] === 8 ||
                        sTableInfo[1] === 12 ||
                        sTableInfo[1] === 16 ||
                        sTableInfo[1] === 20 ||
                        sTableInfo[1] === 104 ||
                        sTableInfo[1] === 108 ||
                        sTableInfo[1] === 112)
                ) {
                    sValue = `${aItem.value}`;
                } else {
                    sValue = `'${aItem.value}'`;
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        sFilter = sFilterList.join(' AND ');

        const sQuery = `SELECT ${sTime}, ${sValue} FROM ${sTableName} WHERE ${sWhereTime} ${aInfo.useCustom ? '' : `AND NAME = ` + `'` + aInfo.tag + `'`} ${
            aInfo.useCustom ? (sFilter ? 'AND ' + sFilter : '') : ``
        } ${!useGroupBy ? '' : 'GROUP BY TIME'} ORDER BY TIME`;

        sQuery.replace('CHART_LINE', 'CHART_LINE');

        return sQuery;
    }
};

export const tagTableValue = () => {
    return {
        id: getId(),
        table: '',
        color: '#73BF69',
        userName: '',
        tableInfo: [],
        type: 'tag',
        filter: [{ id: getId(), column: '', operator: '=', value: '', useFilter: true }],
        values: [{ id: getId(), alias: '', value: '', aggregator: 'avg' }],
        useRollup: false,
        name: '',
        time: '',
        useCustom: false,
        aggregator: 'avg',
        tag: '',
        value: '',
    };
};

export const tagAggregatorList = ['none', 'sum', 'count', 'min', 'max', 'avg', 'sumsq'];

export const refreshTimeList = ['Off', '3 seconds', '5 seconds', '10 seconds', '30 seconds', '1 minute', '5 minutes', '10 minutes', '1 hour'];

export const defaultTimeSeriesData = (aTable: any, aUser: string) => {
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
        dataZoomType: 'slider',
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
        start: '',
        end: '',
        refresh: '',
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
        theme: 'westeros',
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
        useCustomTime: false,
        timeRange: {
            start: '',
            end: '',
            refresh: 'Off',
        },
        // query
        series: [{ ...tagTableValue(), userName: aUser, table: aTable ? aTable[3] : '' }],
    };
    return sData;
};

export const calcRefreshTime = (aTime: string) => {
    const sTime = aTime.split(' ')[0];
    const sType = aTime.split(' ')[1];
    if (sType === 'seconds') return Number(sTime) * 1000;
    else if (sType === 'minute' || sType === 'minutes') return Number(sTime) * 1000 * 60;
    else return Number(sTime) * 1000 * 60 * 60;
};

export const calcInterval = (aBgn: number, aEnd: number, aWidth: number): { IntervalType: string; IntervalValue: number } => {
    const sDiff = aEnd - aBgn;
    const sSecond = Math.floor(sDiff / 1000);
    const sCalc = sSecond / (aWidth / 3);
    const sRet = { type: 'sec', value: 1 };
    if (sCalc > 60 * 60 * 12) {
        // interval > 12H
        sRet.type = 'day';
        sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
    } else if (sCalc > 60 * 60 * 6) {
        // interval > 6H
        sRet.type = 'hour';
        sRet.value = 12;
    } else if (sCalc > 60 * 60 * 3) {
        // interval > 3H
        sRet.type = 'hour';
        sRet.value = 6;
    } else if (sCalc > 60 * 60) {
        // interval > 1H
        sRet.type = 'hour';
        sRet.value = Math.ceil(sCalc / (60 * 60));
    } else if (sCalc > 60 * 30) {
        // interval > 30M
        sRet.type = 'hour';
        sRet.value = 1;
    } else if (sCalc > 60 * 20) {
        // interval > 20M
        sRet.type = 'min';
        sRet.value = 30;
    } else if (sCalc > 60 * 15) {
        // interval > 15M
        sRet.type = 'min';
        sRet.value = 20;
    } else if (sCalc > 60 * 10) {
        // interval > 10M
        sRet.type = 'min';
        sRet.value = 15;
    } else if (sCalc > 60 * 5) {
        // interval > 5M
        sRet.type = 'min';
        sRet.value = 10;
    } else if (sCalc > 60 * 3) {
        // interval > 3M
        sRet.type = 'min';
        sRet.value = 5;
    } else if (sCalc > 60) {
        // interval > 1M
        sRet.type = 'min';
        sRet.value = Math.ceil(sCalc / 60);
    } else if (sCalc > 30) {
        // interval > 30S
        sRet.type = 'min';
        sRet.value = 1;
    } else if (sCalc > 20) {
        // interval > 20S
        sRet.type = 'sec';
        sRet.value = 30;
    } else if (sCalc > 15) {
        // interval > 15S
        sRet.type = 'sec';
        sRet.value = 20;
    } else if (sCalc > 10) {
        // interval > 10S
        sRet.type = 'sec';
        sRet.value = 15;
    } else if (sCalc > 5) {
        // interval > 5S
        sRet.type = 'sec';
        sRet.value = 10;
    } else if (sCalc > 3) {
        // interval > 3S
        sRet.type = 'sec';
        sRet.value = 5;
    } else {
        sRet.type = 'sec';
        sRet.value = Math.ceil(sCalc);
    }
    if (sRet.value < 1) {
        sRet.value = 1;
    }
    return {
        IntervalType: sRet.type,
        IntervalValue: sRet.value,
    };
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
