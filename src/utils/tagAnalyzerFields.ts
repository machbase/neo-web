import { isNumberTypeColumn } from './dashboardUtil';
import { isJsonTypeColumn, normalizeJsonPath } from './dashboardJsonValue';

export type TagAnalyzerColumn = [string, number];

export type TagAnalyzerColumnInfo = {
    name: string;
    time: string;
    value: string;
    jsonKey?: string;
};

const DATETIME_COLUMN_TYPE = 6;

const columnName = (aColumn: any) => String(aColumn?.[0] ?? '');
const columnType = (aColumn: any) => Number(aColumn?.[1]);

export const getTagAnalyzerTimeColumns = (aColumns: any[] = []): TagAnalyzerColumn[] => {
    return aColumns.filter((aColumn) => columnType(aColumn) === DATETIME_COLUMN_TYPE).map((aColumn) => [columnName(aColumn), columnType(aColumn)]);
};

export const getTagAnalyzerValueColumns = (aColumns: any[] = []): TagAnalyzerColumn[] => {
    return aColumns.filter((aColumn) => isNumberTypeColumn(columnType(aColumn)) || isJsonTypeColumn(columnType(aColumn))).map((aColumn) => [columnName(aColumn), columnType(aColumn)]);
};

export const isTagAnalyzerJsonValue = (aColumns: any[] = [], aValue: string) => {
    return aColumns.some((aColumn) => columnName(aColumn) === aValue && isJsonTypeColumn(columnType(aColumn)));
};

export const createTagAnalyzerColumnInfo = (aColumns: any[] = [], aCurrent?: Partial<TagAnalyzerColumnInfo>): TagAnalyzerColumnInfo => {
    const sTimeColumns = getTagAnalyzerTimeColumns(aColumns);
    const sValueColumns = getTagAnalyzerValueColumns(aColumns);
    const sNumericColumn = aColumns.find((aColumn) => isNumberTypeColumn(columnType(aColumn)));

    const sCurrentName = aCurrent?.name && aColumns.some((aColumn) => columnName(aColumn) === aCurrent.name) ? aCurrent.name : '';
    const sCurrentTime = aCurrent?.time && sTimeColumns.some((aColumn) => aColumn[0] === aCurrent.time) ? aCurrent.time : '';
    const sCurrentValue = aCurrent?.value && sValueColumns.some((aColumn) => aColumn[0] === aCurrent.value) ? aCurrent.value : '';

    return {
        name: sCurrentName || columnName(aColumns[0]),
        time: sCurrentTime || sTimeColumns[0]?.[0] || '',
        value: sCurrentValue || columnName(sNumericColumn) || '',
        jsonKey: normalizeJsonPath(aCurrent?.jsonKey ?? ''),
    };
};

export const canUseTagAnalyzerRollup = (aColName?: Partial<TagAnalyzerColumnInfo>) => {
    if (!aColName) return true;
    if (normalizeJsonPath(aColName.jsonKey ?? '')) return false;
    return String(aColName.time ?? '').toUpperCase() === 'TIME';
};
