import { getId } from '.';
import { DefaultLineChartOption, DefaultPieChartOption, DefaultTagTableOption } from '@/utils/eChartHelper';
import { TABLE_COLUMN_TYPE, DB_NUMBER_TYPE, ChartSeriesColorList } from '@/utils/constants';

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

                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
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
                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        sFilter = sFilterList.join(' AND ');
        const sGroupByQuery = useGroupBy ? 'GROUP BY NAME, TIME' : '';
        const sOrderByQuery = 'ORDER BY NAME, TIME';

        const sQuery = `SELECT NAME, ${sTime}, ${sValue} FROM ${sTableName} WHERE ${sWhereTime} ${aInfo.useCustom ? '' : `AND NAME = ` + `'` + aInfo.tag + `'`} ${
            aInfo.useCustom ? (sFilter ? 'AND ' + sFilter : '') : ``
        } ${sGroupByQuery} ${sOrderByQuery}`;

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

export const createDefaultTagTableOption = (aUser: string, aTable: string) => {
    const sOption = [{ ...DefaultTagTableOption, userName: aUser, table: aTable ? aTable[3] : '' }];
    return sOption;
};

export const createSeriesOption = (aOptionInfo: any, aTagList: any) => {
    // common setting
    let sOption = {
        ...aOptionInfo.chartInfo,
        series: setSeries(aOptionInfo, aTagList),
        legend: { show: aOptionInfo.isLegend },
        tooltip: { show: aOptionInfo.isTooltip, trigger: 'item' },
        dataZoom: aOptionInfo.isDataZoom ? [{ type: 'slider' }] : false,
    };

    if (aOptionInfo.type === 'line') {
        sOption = {
            ...sOption,
        };
        if (aOptionInfo.lineChartOptions?.markLine.data.length > 0) {
            sOption = {
                ...sOption,
                visualMap: {
                    ...createLineVisualMapOption(aOptionInfo.lineChartOptions, aTagList),
                },
            };
        }
    }
    // xAxis, yAxis setting
    if (aOptionInfo.type === 'gauge') {
        const { xAxis, yAxis, ...restOption } = sOption;
        sOption = {
            ...restOption,
        };
    } else if (aOptionInfo.type === 'pie') {
        const { xAxis, yAxis, ...restOption } = sOption;
        sOption = {
            ...restOption,
            dataset: {
                source: 'column(0)',
            },
        };
    } else {
        sOption.xAxis = createXAxisOption(aOptionInfo);
        sOption.yAxis = createYAxisOption(aOptionInfo);
    }

    return sOption;
};

export const createXAxisOption = (aOptionInfo: any) => {
    const sXAxisOption = {
        ...aOptionInfo.chartInfo.xAxis,
        // data: 'column(0)',
    };

    return sXAxisOption;
};

export const createYAxisOption = (aOptionInfo: any) => {
    const sYAxisOption = {
        ...aOptionInfo.chartInfo.yAxis,
    };

    return sYAxisOption;
};

export const createLineVisualMapOption = (aOptionInfo: any, aTagList: any) => {
    const sSeriesIndexArray = Array.from(aTagList, (_, aIndex) => aIndex);
    const sPieces = aOptionInfo.markLine.data.reduce((aAcc: any, aCurrent: any, aIndex: number, aArr: any) => {
        if (aIndex % 2 === 0 && aIndex < aArr.length - 1) {
            aAcc.push({ min: aCurrent.xAxis, max: aArr[aIndex + 1].xAxis, color: ChartSeriesColorList[0] });
        }
        return aAcc;
    }, []);

    const sVisualMapOption = {
        ...aOptionInfo.visualMap,
        seriesIndex: sSeriesIndexArray,
        pieces: sPieces,
    };

    return sVisualMapOption;
};

export const setSeries = (aOptionInfo: any, aTagList: any) => {
    const sSeries = [] as any[];
    const sIsGauge = aOptionInfo.type === 'gauge';
    const sIsPie = aOptionInfo.type === 'pie';
    const sIsLine = aOptionInfo.type === 'line';
    if (sIsPie) {
        const { data, ...restOption } = aOptionInfo.chartInfo.series[0];
        const sTempObject = {
            ...restOption,
            ...createPieSeriesOption(aOptionInfo.pieChartOptions ?? DefaultPieChartOption),
            type: aOptionInfo.type,
        };
        sSeries.push(sTempObject);
    } else {
        for (let i = 0; i < aTagList.length; i++) {
            let sTempObject = {
                ...aOptionInfo.chartInfo.series[i],
                type: aOptionInfo.type,
                data: 'column(' + i + ')',
                name: aTagList[i],
            };
            if (sIsLine) {
                sTempObject = {
                    ...sTempObject,
                    ...createLineSeriesOption(aOptionInfo.lineChartOptions ?? DefaultLineChartOption, i),
                };
            }
            if (sIsGauge) {
                sTempObject = {
                    ...sTempObject,
                    ...createGaugeSeriesOption(),
                };
            }
            sSeries.push(sTempObject);
        }
    }
    return sSeries;
};

export const createLineSeriesOption = (aLineOption: any, aIndex: number) => {
    const sLineOption = {
        areaStyle: aLineOption.areaStyle ? { opacity: 0.2 } : null,
        smooth: aLineOption.smooth,
        step: aLineOption.isStep ? 'start' : false,
        lineStyle: aLineOption.markLine ? { color: ChartSeriesColorList[aIndex], width: 2 } : null,
        markLine: aIndex === 0 ? aLineOption.markLine : {},
    };
    return sLineOption;
};

export const createGaugeSeriesOption = () => {
    const sGaugeOption = {
        progress: {
            show: true,
        },
        axisTick: {
            show: false,
        },
        axisLabel: {
            distance: 25,
            color: '#999',
            fontSize: 16,
        },
        splitLine: {
            length: 10,
            distance: -10,
            lineStyle: {
                width: 2,
                color: '#fff',
            },
        },
        detail: {
            fontSize: 22,
            valueAnimation: false,
            formatter: '{value}',
            offsetCenter: [0, '30%'],
        },
    };

    return sGaugeOption;
};

export const createPieSeriesOption = (aPieOption: any) => {
    const sPieOption = {
        datasetIndex: 0,
        radius: [aPieOption.doughnutRatio, '70%'],
        roseType: aPieOption.roseType ? 'area' : false,
        emphasis: {
            itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
        },
    };

    return sPieOption;
};

export const changeXAxisType = (aSeries: any, aType: 'category' | 'time') => {
    return {
        ...aSeries,
        xAxis: {
            ...aSeries.xAxis,
            type: aType,
        },
    };
};

export const removeColumnQuotes = (aStr: string) => {
    return aStr.replace(/"column\((\d+)\)"/g, 'column($1)');
};

export const createMapValueForTag = (aTags: any, aTagNum: number) => {
    let sResultString = '';
    let sMapValueString = '';
    let sPopValueString = '0';
    for (let i = 0; i < aTagNum; i++) {
        // when select name, time, value
        sMapValueString += `MAPVALUE(${i + 3}, value(0) == '${aTags[i]}' ? value(2) : NULL)\n`;
    }
    sResultString = sMapValueString + `POPVALUE(0, 2)\n`;
    sMapValueString = '';
    for (let i = 0; i < aTagNum; i++) {
        sMapValueString += `MAPVALUE(${aTagNum + (i + 1)}, list(value(0), value(${i + 1}) == NULL ? NULL : value(${i + 1})))\n`;
        sPopValueString += ', ' + (i + 1);
    }
    sResultString += sMapValueString + `POPVALUE(${sPopValueString})\n`;
    return sResultString;
};

export const createMapValueForPie = () => {
    return 'MAPVALUE(0, list(value(0), value(1)))\n';
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

export const isNumberTypeColumn = (aType: number) => {
    const colType = TABLE_COLUMN_TYPE.find((item) => item.key === aType);
    if (colType && DB_NUMBER_TYPE.some((item) => item === colType.value)) {
        return true;
    } else {
        return false;
    }
};

export const createGaugeQuery = (aInfo: any, aTime: any, aStart: number, aEnd: number) => {
    const selectQuery = 'SELECT trunc(' + aInfo.aggregator + '(VALUE), 2)';
    const fromQuery = 'FROM ' + aInfo.userName + '.' + aInfo.table;
    const whereTimeQuery = 'WHERE TIME between ' + aStart + '000000' + ' and ' + aEnd + '000000';
    const andNameQuery = `AND NAME = '${aInfo.tag}'`;

    return selectQuery + ' ' + fromQuery + ' ' + whereTimeQuery + ' ' + andNameQuery;
};

export const createPieQuery = (aInfo: any, aTime: any, aStart: number, aEnd: number) => {
    const selectQuery = 'SELECT NAME, ' + aInfo.aggregator + '(VALUE)';
    const fromQuery = 'FROM ' + aInfo.userName + '.' + aInfo.table;
    const whereTimeQuery = 'WHERE TIME between ' + aStart + '000000' + ' and ' + aEnd + '000000';
    let andNameQuery = `AND NAME = '${aInfo.tag}'`;
    const groupByQuery = 'GROUP BY NAME';

    if (aInfo.useCustom) {
        const sFilterList = aInfo.filter.map((aItem: any) => {
            let sValue = '';
            if (aItem.useFilter) {
                const sTableInfo = aInfo.tableInfo.find((bItem: any) => {
                    return bItem[0] === aItem.column;
                });
                if (sTableInfo && isNumberTypeColumn(sTableInfo[1])) {
                    sValue = `${aItem.value}`;
                } else {
                    if (aItem.operator === 'in') {
                        sValue = aItem.value
                            .split(',')
                            .map((val: string) => {
                                const trimVal = val.trim();
                                return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
                            })
                            .join(',');
                        sValue = `(${sValue})`;
                    } else {
                        sValue = `'${aItem.value}'`;
                    }
                }
                return `${aItem.column} ${aItem.operator} ${sValue}`;
            } else {
                return '';
            }
        });
        andNameQuery = ' AND ' + sFilterList.join(' AND ');
    }

    return selectQuery + ' ' + fromQuery + ' ' + whereTimeQuery + ' ' + andNameQuery + ' ' + groupByQuery;
};
