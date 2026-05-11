import { isNumberTypeColumn } from './dashboardUtil';
import { isJsonTypeColumn, normalizeJsonPath, parseJsonValueField } from './dashboardJsonValue';
import { DATETIME_COLUMN_TYPE, getDefaultTimeFieldColumn, isBaseTimeColumn, isNonDateTimeBaseTimeColumn, isTimeFieldColumn } from './timeFieldColumns';

const columnName = (aColumn: any) => String(aColumn?.[0] ?? '');
const columnType = (aColumn: any) => Number(aColumn?.[1]);

const findColumn = (aColumns: any[] = [], aName: string) => {
    const sName = String(aName ?? '').toUpperCase();
    return aColumns.find((aColumn) => columnName(aColumn).toUpperCase() === sName);
};

const valueColumnName = (aValue: string) => parseJsonValueField(aValue)?.column ?? String(aValue ?? '');
const jsonKeyFromValue = (aValue: string, aJsonKey?: string) => normalizeJsonPath(aJsonKey || parseJsonValueField(aValue)?.path || '');

const isValueColumn = (aColumn: any) => !isBaseTimeColumn(aColumn) && (isNumberTypeColumn(columnType(aColumn)) || isJsonTypeColumn(columnType(aColumn)));
const isFilterColumn = (aColumn: any) => columnType(aColumn) === 5;

const getDefaultNameColumn = (aColumns: any[] = []) => {
    return columnName(aColumns.find(isFilterColumn) ?? aColumns[0]);
};

const getDefaultValueColumn = (aColumns: any[] = []) => {
    return columnName(aColumns.find((aColumn) => !isBaseTimeColumn(aColumn) && isNumberTypeColumn(columnType(aColumn))) ?? aColumns.find(isValueColumn));
};

const repairValue = (aValue: string, aJsonKey: string | undefined, aColumns: any[], aDefaultValue: string) => {
    const sColumn = valueColumnName(aValue);
    const sColumnInfo = findColumn(aColumns, sColumn);
    if (sColumn && sColumnInfo && isValueColumn(sColumnInfo)) {
        return {
            value: sColumn,
            jsonKey: isJsonTypeColumn(columnType(sColumnInfo)) ? jsonKeyFromValue(aValue, aJsonKey) : '',
        };
    }

    return {
        value: aDefaultValue,
        jsonKey: '',
    };
};

export const repairDashboardBlockForTableColumns = (aBlock: any, aColumns: any[] = [], aTableType: string) => {
    const sDefaultName = getDefaultNameColumn(aColumns);
    const sDefaultTime = getDefaultTimeFieldColumn(aColumns);
    const sDefaultValue = getDefaultValueColumn(aColumns);
    const sName = findColumn(aColumns, aBlock?.name) ? aBlock.name : sDefaultName;
    const sTimeColumn = findColumn(aColumns, aBlock?.time);
    const sTime = sTimeColumn && isTimeFieldColumn(sTimeColumn) ? aBlock.time : sDefaultTime;
    const sValue = repairValue(aBlock?.value, aBlock?.jsonKey, aColumns, sDefaultValue);
    const sShouldClearViewFilter = aTableType === 'view' && aBlock?.type !== 'view';
    const sValueList =
        aBlock?.values?.length > 0
            ? aBlock.values
            : [
                  {
                      id: aBlock?.id,
                      alias: aBlock?.alias ?? '',
                      value: aBlock?.value,
                      jsonKey: aBlock?.jsonKey,
                      diff: aBlock?.diff ?? 'none',
                      aggregator: aBlock?.aggregator ?? 'avg',
                  },
              ];

    return {
        ...aBlock,
        type: aTableType,
        useCustom: aTableType === 'view' ? true : aBlock?.useCustom,
        name: sName,
        time: sTime,
        value: sValue.value,
        jsonKey: sValue.jsonKey,
        tableInfo: aColumns,
        values: sValueList.map((aValue: any) => {
            const sRepairedValue = repairValue(aValue?.value, aValue?.jsonKey, aColumns, sDefaultValue);
            return {
                ...aValue,
                value: sRepairedValue.value,
                jsonKey: sRepairedValue.jsonKey,
            };
        }),
        filter: (aBlock?.filter?.length ? aBlock.filter : [{}]).map((aFilter: any) => {
            const sColumn = findColumn(aColumns, aFilter?.column) ? aFilter.column : sDefaultName;
            const sShouldClear = sShouldClearViewFilter || sColumn !== aFilter?.column;
            return {
                ...aFilter,
                column: sColumn,
                value: sShouldClear ? '' : aFilter?.value,
                useFilter: sShouldClear ? false : aFilter?.useFilter ?? false,
                useTyping: sShouldClear ? false : aFilter?.useTyping ?? false,
                typingValue: sShouldClear ? '' : aFilter?.typingValue,
            };
        }),
    };
};

export const convertDashboardMinMaxRows = (aRows: any[], aBlock: any): { min: number; max: number } | undefined => {
    const sMin = Number(aRows?.[0]?.[0]);
    const sMax = Number(aRows?.[0]?.[1]);
    if (!Number.isFinite(sMin) || !Number.isFinite(sMax)) return undefined;

    const sUseNumericBaseTime =
        isNonDateTimeBaseTimeColumn(aBlock?.tableInfo, aBlock?.time) || (Boolean(aBlock?.timeBaseTime) && Number(aBlock?.timeType) !== DATETIME_COLUMN_TYPE);

    if (sUseNumericBaseTime) {
        return {
            min: sMin,
            max: sMax,
        };
    }

    return {
        min: Math.floor(sMin / 1000000),
        max: Math.floor(sMax / 1000000),
    };
};
