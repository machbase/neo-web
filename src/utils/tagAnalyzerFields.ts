import { isNumberTypeColumn } from './dashboardUtil';
import { isJsonTypeColumn, normalizeJsonPath, parseJsonValueField } from './dashboardJsonValue';
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

const columnName = (aColumn: any) => String(aColumn?.name ?? aColumn?.[0] ?? '');
const columnType = (aColumn: any) => Number(aColumn?.type ?? aColumn?.[1]);

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

export const createTagAnalyzerColumnInfoFromDashboardBlock = (aBlock: any): TagAnalyzerColumnInfo => {
    const sColumns = aBlock?.tableInfo ?? [];
    const sParsedValue = parseJsonValueField(aBlock?.value ?? '');
    const sExplicitValue = sParsedValue?.column || String(aBlock?.value ?? '');
    const sTime = aBlock?.time || getDefaultTimeFieldColumn(sColumns) || columnName(sColumns[1]);
    const sTimeColumn = findColumnByName(sColumns, sTime);

    return {
        name: aBlock?.name || columnName(sColumns[0]),
        time: sTime,
        timeType: sTimeColumn ? getColumnType(sTimeColumn) : DATETIME_COLUMN_TYPE,
        timeBaseTime: sTimeColumn ? isBaseTimeColumn(sTimeColumn) : false,
        value: sExplicitValue || columnName(sColumns[2]) || '',
        jsonKey: normalizeJsonPath(sExplicitValue ? aBlock?.jsonKey || sParsedValue?.path || '' : ''),
    };
};

export const canUseTagAnalyzerRollup = (aColName?: Partial<TagAnalyzerColumnInfo>) => {
    if (!aColName) return true;
    return String(aColName.time ?? '').toUpperCase() === 'TIME';
};

/**
 * Whether a dashboard panel block is something the Tag Analyzer can actually take.
 *
 * A TAZ series is one NAME value read out of a table, so only a collapsed tag block crosses over:
 * it must name a tag (`type === 'tag'`, not expanded, not a hand-typed query) and be drawn. The
 * v8.7 tagless types can never qualify — a view inherits no TAGNAME flag and a transaction table
 * has no `_<TABLE>_META`, so `repairDashboardBlockForTableColumns` forces `useCustom` on them and
 * their `type` is not `tag` either. See `TAGLESS_TABLE_TYPES` in `dashboardTableKind`.
 *
 * `customFullTyping` is read defensively: boards saved before that field existed carry no object.
 */
export const isTagAnalyzerEligibleBlock = (aBlock: any): boolean =>
    aBlock?.type === 'tag' && !aBlock?.useCustom && !!aBlock?.isVisible && !aBlock?.customFullTyping?.use;

/**
 * Whether a panel holds any block the Tag Analyzer can take.
 *
 * The panel menu's show condition, and the same predicate the hand-off itself filters by — a menu
 * entry that only ever answers with an error toast is worse than no entry.
 */
export const hasTagAnalyzerEligibleBlock = (aBlockList: any[] = []): boolean => (aBlockList ?? []).some(isTagAnalyzerEligibleBlock);
