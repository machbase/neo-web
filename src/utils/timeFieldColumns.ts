export const DATETIME_COLUMN_TYPE = 6;
export const BASETIME_COLUMN_FLAG = 0x01000000;

const columnName = (aColumn: any) => String(aColumn?.[0] ?? '');
const columnType = (aColumn: any) => Number(aColumn?.[1]);
const columnFlag = (aColumn: any, aFlagIndex = 4) => Number(aColumn?.[aFlagIndex] ?? 0);

export const getColumnType = (aColumn: any) => columnType(aColumn);

export const isBaseTimeColumn = (aColumn: any, aFlagIndex = 4) => {
    const sFlag = columnFlag(aColumn, aFlagIndex);
    return Number.isFinite(sFlag) && (sFlag & BASETIME_COLUMN_FLAG) > 0;
};

export const isDateTimeColumn = (aColumn: any) => {
    return columnType(aColumn) === DATETIME_COLUMN_TYPE;
};

export const isTimeFieldColumn = (aColumn: any, aFlagIndex = 4) => {
    return isDateTimeColumn(aColumn) || isBaseTimeColumn(aColumn, aFlagIndex);
};

export const findColumnByName = (aColumns: any[] = [], aColumnName: string) => {
    return aColumns.find((aColumn) => columnName(aColumn).toUpperCase() === String(aColumnName ?? '').toUpperCase());
};

export const isNonDateTimeBaseTimeColumn = (aColumns: any[] = [], aColumnName: string, aFlagIndex = 4) => {
    const sColumn = findColumnByName(aColumns, aColumnName);
    return Boolean(sColumn) && isBaseTimeColumn(sColumn, aFlagIndex) && !isDateTimeColumn(sColumn);
};

export const getTimeFieldColumns = (aColumns: any[] = [], aFlagIndex = 4): [string, number][] => {
    return aColumns.filter((aColumn) => isTimeFieldColumn(aColumn, aFlagIndex)).map((aColumn) => [columnName(aColumn), columnType(aColumn)]);
};

export const getDefaultTimeFieldColumn = (aColumns: any[] = [], aFlagIndex = 4) => {
    const sBaseTimeColumn = aColumns.find((aColumn) => isBaseTimeColumn(aColumn, aFlagIndex));
    const sDateTimeColumn = aColumns.find((aColumn) => columnType(aColumn) === DATETIME_COLUMN_TYPE);
    return columnName(sBaseTimeColumn ?? sDateTimeColumn);
};
