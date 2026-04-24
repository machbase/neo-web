import { isNumberTypeColumn } from './dashboardUtil';
import { isJsonTypeColumn, normalizeJsonPath } from './dashboardJsonValue';
import { getColumnType, getDefaultTimeFieldColumn, getTimeFieldColumns, isBaseTimeColumn, findColumnByName, DATETIME_COLUMN_TYPE } from './timeFieldColumns';

export type TagAnalyzerColumn = [string, number];

export type TagAnalyzerColumnInfo = {
    name: string;
    time: string;
    timeType?: number;
    timeBaseTime?: boolean;
    value: string;
    jsonKey?: string;
};

const columnName = (aColumn: any) => String(aColumn?.[0] ?? '');
const columnType = (aColumn: any) => Number(aColumn?.[1]);

export const getTagAnalyzerTimeColumns = (aColumns: any[] = []): TagAnalyzerColumn[] => {
    return getTimeFieldColumns(aColumns, 2);
};

export const getTagAnalyzerValueColumns = (aColumns: any[] = []): TagAnalyzerColumn[] => {
    return aColumns.filter((aColumn) => !isBaseTimeColumn(aColumn, 2) && (isNumberTypeColumn(columnType(aColumn)) || isJsonTypeColumn(columnType(aColumn)))).map((aColumn) => [columnName(aColumn), columnType(aColumn)]);
};

export const isTagAnalyzerJsonValue = (aColumns: any[] = [], aValue: string) => {
    return aColumns.some((aColumn) => columnName(aColumn) === aValue && isJsonTypeColumn(columnType(aColumn)));
};

export const createTagAnalyzerColumnInfo = (aColumns: any[] = [], aCurrent?: Partial<TagAnalyzerColumnInfo>): TagAnalyzerColumnInfo => {
    const sTimeColumns = getTagAnalyzerTimeColumns(aColumns);
    const sValueColumns = getTagAnalyzerValueColumns(aColumns);
    const sNumericColumn = aColumns.find((aColumn) => !isBaseTimeColumn(aColumn, 2) && isNumberTypeColumn(columnType(aColumn)));

    const sCurrentName = aCurrent?.name && aColumns.some((aColumn) => columnName(aColumn) === aCurrent.name) ? aCurrent.name : '';
    const sCurrentTime = aCurrent?.time && sTimeColumns.some((aColumn) => aColumn[0] === aCurrent.time) ? aCurrent.time : '';
    const sCurrentValue = aCurrent?.value && sValueColumns.some((aColumn) => aColumn[0] === aCurrent.value) ? aCurrent.value : '';
    const sTime = sCurrentTime || getDefaultTimeFieldColumn(aColumns, 2);
    const sTimeColumn = findColumnByName(aColumns, sTime);

    return {
        name: sCurrentName || columnName(aColumns[0]),
        time: sTime,
        timeType: sTimeColumn ? getColumnType(sTimeColumn) : DATETIME_COLUMN_TYPE,
        timeBaseTime: sTimeColumn ? isBaseTimeColumn(sTimeColumn, 2) : false,
        value: sCurrentValue || columnName(sNumericColumn) || '',
        jsonKey: normalizeJsonPath(aCurrent?.jsonKey ?? ''),
    };
};

export const canUseTagAnalyzerRollup = (aColName?: Partial<TagAnalyzerColumnInfo>) => {
    if (!aColName) return true;
    if (normalizeJsonPath(aColName.jsonKey ?? '')) return false;
    return String(aColName.time ?? '').toUpperCase() === 'TIME';
};
