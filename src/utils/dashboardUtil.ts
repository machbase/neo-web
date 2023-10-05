import { NONAME } from 'dns';
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

export const isNumberType = (type: number) => {
    const colType = ColumnType.find((item) => item.key === type);
    const Numbers = ['SHORT', 'INTEGER', 'LONG', 'FLOAT', 'DOUBLE', 'USHORT', 'UINTEGER', 'ULONG'];
    if (colType && Numbers.some((item) => item === colType.value)) {
        return true;
    } else {
        return false;
    }
};

export const checkValueBracket = (value: string) => {
    if (value.includes('(') && value.includes(')')) {
        return true;
    } else {
        return false;
    }
};
// export const createQuery = (aInfo: any) => {
//     console.log(aInfo);
//      `   SELECT ${aInfo.time} AS TIME,
//      ${aInfo.values[0].value} AS '${aInfo.values[0].alias}' FROM(
//         SELECT DATE_TRUNC('${aInfo.values[0].aggregator}', ${aInfo.time}, 5) AS TIME,
//         ${aInfo.values[0].aggregator}(${aInfo.values[0].value}) AS VALUE FROM ${aInfo.table} WHERE TIME BETWEEN FROM_TIMESTAMP(1483196400000000000)AND FROM_TIMESTAMP(1483538400000000000)GROUP BY TIME
//     )ORDER BY TIME LIMIT 2976`
// };
// export const createQuery = (aSeries: any) => {
//     // const rangeFrom: string = (request.range.from.valueOf() * 1000000).toString(10);
//     // const rangeTo: string = (request.range.to.valueOf() * 1000000).toString(10);
//     // const intervalMs: string = convertToMachbaseIntervalMs(request.intervalMs);

//     let subQueryFlag = false;
//     let isRollup = target.rollupTable;
//     let customTitle = '';

//     // query var
//     let selectQuery = '';
//     let rollupTimeQuery = '';
//     let timeQuery = '';
//     let andQuery = '';
//     let groupByQuery = '';
//     let orderByQuery = '';
//     let limitQuery = '';
//     let baseQuery = '';
//     let resultQuery = '';

//     const andQueryList: string[] = [];

//     // Use subquery if more than one day
//     if (request.intervalMs >= 60 * 60 * 24 * 1000) {
//         subQueryFlag = true;
//     }

//     if (target.hide) {
//         continue;
//     }

//     // check Time Column exists
//     if (!target.timeField || target.timeField === '') {
//         continue;
//     }

//     // setting title
//     customTitle = target.title ? "'" + target.title + "'" : '';
//     if (target.valueType === 'select') {
//         customTitle = 'VALUE';
//     }

//     // check raw data for aggr
//     if (checkValueBracket(target.valueField!) && target.valueType === 'input') {
//         selectQuery = ' ' + target.valueField;
//         if (customTitle !== '') {
//             selectQuery += ' AS ' + customTitle;
//         }
//         groupByQuery = 'GROUP BY TIME';
//     } else if (target.aggrFunc !== '' && target.aggrFunc !== 'none') {
//         if (target.aggrFunc === 'count(*)') {
//             selectQuery = ' ' + target.aggrFunc + ' AS VALUE ';
//         } else if (target.aggrFunc === 'first' || target.aggrFunc === 'last') {
//             selectQuery = ' ' + target.aggrFunc + '(' + target.timeField + ',' + target.valueField + ') AS VALUE ';
//         } else {
//             selectQuery = ' ' + target.aggrFunc + '(' + target.valueField + ') ';
//             if (customTitle !== '') {
//                 selectQuery += ' AS ' + customTitle;
//             }
//         }
//         groupByQuery = 'GROUP BY TIME';
//     } else {
//         selectQuery = ' ' + target.valueField;
//         if (customTitle !== '') {
//             selectQuery += ' AS ' + customTitle;
//         }
//         rollupTimeQuery = target.timeField + ' AS TIME ';
//     }

//     // existed time field
//     if (target.timeField !== '') {
//         if (intervalMs.split(' ')[1] === 'msec' || groupByQuery === '') {
//             isRollup = false;
//         }
//         // use rollup
//         if (isRollup) {
//             if (subQueryFlag) {
//                 if (target.aggrFunc?.toUpperCase() === 'AVG') {
//                     selectQuery =
//                         ' ' + target.aggrFunc + '(' + target.valueField + ') AS VALUE, SUM(' + target.valueField + ') AS SUMVAL, COUNT(' + target.valueField + ') AS CNTVAL';
//                 }
//                 rollupTimeQuery = target.timeField + ' ROLLUP ' + '1 hour' + ' AS TIME ';
//             } else {
//                 rollupTimeQuery = target.timeField + ' ROLLUP ' + intervalMs + ' AS TIME ';
//             }
//             // not use rollup
//         } else {
//             if (subQueryFlag) {
//                 const nanoSec = request.intervalMs * 1000 * 1000;
//                 rollupTimeQuery = `${target.timeField} / ${nanoSec} * ${nanoSec} AS TIME`;
//             } else {
//                 const intervalSplit = intervalMs.split(' ');
//                 rollupTimeQuery = "DATE_TRUNC('" + intervalSplit[1] + "', " + target.timeField + ', ' + intervalSplit[0] + ') AS TIME ';
//             }
//         }
//     }

//     // create time (where query)
//     timeQuery = ' WHERE ' + target.timeField + ' BETWEEN FROM_TIMESTAMP(' + rangeFrom + ') AND FROM_TIMESTAMP(' + rangeTo + ') ';

//     // create filter (and query)
//     if (target.filters) {
//         target.filters.map((v: any) => {
//             if (!v.isStr && (v.key === 'none' || v.value === '')) {
//                 return;
//             }
//             if (v.isStr && v.condition === '') {
//                 return;
//             }
//             if (!v.isStr) {
//                 let queryStr = '';
//                 if (v.op === 'in') {
//                     if (!v.value.startsWith('$')) {
//                         v.value = v.value
//                             .split(',')
//                             .map((val: any) => {
//                                 const trimVal = val.trim();
//                                 return trimVal.startsWith("'") ? trimVal : "'" + trimVal + "'";
//                             })
//                             .join(',');
//                     }
//                     v.value = '(' + v.value + ')';
//                     queryStr = ' AND ' + v.key + ' ' + v.op + ' ' + v.value;
//                 } else {
//                     if (!v.value.startsWith('$')) {
//                         queryStr = ' AND ' + v.key + v.op;
//                         if (!isNumberType(parseInt(v.type, 10)) && !v.value.startsWith("'")) {
//                             queryStr += "'" + v.value + "'";
//                         } else {
//                             queryStr += v.value;
//                         }
//                     } else {
//                         queryStr = ' AND ' + v.key + v.op + v.value;
//                     }
//                 }
//                 andQueryList.push(queryStr + ' ');
//             } else {
//                 andQueryList.push(' AND ' + v.condition + ' ');
//             }
//         });
//         andQuery = andQueryList.join(' ');
//     }

//     // order by query
//     orderByQuery = ' ORDER BY TIME ';

//     // limit query
//     if (groupByQuery === '' || request.maxDataPoints === 0) {
//         limitQuery = 'LIMIT 5000';
//     } else {
//         limitQuery = 'LIMIT ' + request.maxDataPoints! * 2;
//     }

//     // base query
//     baseQuery = rollupTimeQuery + ', ' + selectQuery + ' FROM ' + target.tableName + timeQuery + andQuery + groupByQuery;

//     // result query
//     if (target.valueType === 'input') {
//         resultQuery = 'SELECT ' + baseQuery + ' ' + orderByQuery + ' ' + limitQuery;
//     } else {
//         customTitle = "'" + target.aggrFunc + '(' + target.valueField + ')' + "'";
//         // if (target.aggrFunc === 'count(*)') {
//         //   customTitle = '\'' + target.aggrFunc + '\'';
//         // }
//         if (target.aggrFunc === 'none') {
//             customTitle = "'" + target.valueField + "'";
//         }
//         if (
//             target.tableType === 6 &&
//             target.aggrFunc !== 'none' &&
//             target.filters &&
//             target.filters.length > 0 &&
//             target.filters[0].value !== '' &&
//             target.filters[0].key !== 'none' &&
//             !target.filters[0].isStr
//         ) {
//             customTitle = "'" + target.filters[0].value.replace(/'/gi, '') + '(' + target.aggrFunc + ")'";
//         }
//         if (target.title !== '') {
//             customTitle = "'" + target.title + "'";
//         }
//         if (isRollup && subQueryFlag) {
//             const nanoSec = request.intervalMs * 1000 * 1000;
//             if (target.aggrFunc === 'sum' || target.aggrFunc === 'sumsq' || target.aggrFunc === 'count') {
//                 resultQuery = `SELECT TIME / ${nanoSec} * ${nanoSec} AS TIME, SUM(VALUE) AS ${customTitle} FROM (SELECT ${baseQuery}) ${groupByQuery} ${orderByQuery} ${limitQuery}`;
//             } else if (target.aggrFunc === 'min' || target.aggrFunc === 'max') {
//                 resultQuery = `SELECT TIME / ${nanoSec} * ${nanoSec} AS TIME, ${target.aggrFunc}(VALUE) AS ${customTitle} FROM (SELECT ${baseQuery}) ${groupByQuery} ${orderByQuery} ${limitQuery}`;
//             } else if (target.aggrFunc === 'avg') {
//                 resultQuery = `SELECT TIME / ${nanoSec} * ${nanoSec} AS TIME, SUM(SUMVAL) / SUM(CNTVAL) AS ${customTitle} FROM (SELECT ${baseQuery}) ${groupByQuery} ${orderByQuery} ${limitQuery}`;
//             }
//         } else {
//             // SELECT TIME AS TIME, VALUE AS {{TITLE}} FROM ({{BASEQUERY}}) {{ORDERBY}} {{LIMIT}}
//             resultQuery = 'SELECT TIME AS TIME, VALUE AS ' + customTitle + ' FROM (SELECT ' + baseQuery + ') ' + orderByQuery + ' ' + limitQuery;
//         }
//     }

//     // console.log('result query ', resultQuery)

//     // Interpolate variables. set default format to 'sqlstring'. use 'raw' in numeric var name (ex : ${servers:raw})
//     console.log(resultQuery);
//     // target.queryText = getTemplateSrv().replace(resultQuery, request.scopedVars, 'sqlstring');
//     // targets.push(target);

//     // return targets
// };
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
        useRollup: false,
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
