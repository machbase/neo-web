import { isNumericBaseTimeSourceColumns } from '@/components/tagAnalyzer/domain/SeriesDomain';
import { TABLE_COLUMN_TYPE } from '@/utils/constants';
import { createTagAnalyzerColumnInfo, type TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { E_COLUMN_FLAG, type STR_NUM_ARR_TYPE } from './utils';

const TAG_ANALYZER_UNSUPPORTED_DEFAULT_VALUE_TYPES = new Set(['json', 'binary', '61', '97']);
const DB_EXPLORER_COLUMN_NAME_INDEX = 0;
const DB_EXPLORER_COLUMN_TYPE_INDEX = 1;
const DB_EXPLORER_LEGACY_COLUMN_FLAG_INDEX = 2;
const DB_EXPLORER_RAW_COLUMN_FLAG_INDEX = 3;
const DB_EXPLORER_DISPLAY_COLUMN_DESC_INDEX = 4;
const NANOSECONDS_PER_MILLISECOND = 1000000;
const TAG_ANALYZER_COLUMN_TYPE_BY_LABEL = new Map(
    TABLE_COLUMN_TYPE.map((column) => [column.value.toLowerCase(), column.key])
);

type TagNameFromMetaRowOptions = {
    row: STR_NUM_ARR_TYPE;
    metaColumns: string[] | undefined;
    sourceNameColumn: string;
    fallbackNameColumn: string;
};

function normalizeDbExplorerColumnType(typeValue: string | number | undefined): number {
    if (typeof typeValue === 'number') {
        return typeValue;
    }

    const normalizedType = String(typeValue ?? '').trim().toLowerCase();
    const numericType = Number(normalizedType);

    if (normalizedType !== '' && Number.isFinite(numericType)) {
        return numericType;
    }

    return TAG_ANALYZER_COLUMN_TYPE_BY_LABEL.get(normalizedType) ?? NaN;
}

function normalizeDbExplorerColumnFlag(row: STR_NUM_ARR_TYPE): number {
    const displayDesc = String(row[DB_EXPLORER_DISPLAY_COLUMN_DESC_INDEX] ?? '').trim().toLowerCase();

    if (displayDesc !== '') {
        return displayDesc.includes('basetime') ? E_COLUMN_FLAG.BASETIME : 0;
    }

    if (row.length > DB_EXPLORER_DISPLAY_COLUMN_DESC_INDEX) {
        return 0;
    }

    const rawFlag = Number(row[DB_EXPLORER_RAW_COLUMN_FLAG_INDEX]);
    if (Number.isFinite(rawFlag) && (rawFlag & E_COLUMN_FLAG.BASETIME) > 0) {
        return rawFlag;
    }

    const legacyFlag = Number(row[DB_EXPLORER_LEGACY_COLUMN_FLAG_INDEX]);
    if (Number.isFinite(legacyFlag) && (legacyFlag & E_COLUMN_FLAG.BASETIME) > 0) {
        return legacyFlag;
    }

    return 0;
}

function toFiniteNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
        return NaN;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : NaN;
}

export function createTagAnalyzerColumnsFromDbExplorer(
    columnRows: STR_NUM_ARR_TYPE[] | undefined,
): TagAnalyzerColumnInfo {
    const columnsForTagAnalyzer = (columnRows ?? []).map((row) => [
        String(row[DB_EXPLORER_COLUMN_NAME_INDEX] ?? '').trim(),
        normalizeDbExplorerColumnType(row[DB_EXPLORER_COLUMN_TYPE_INDEX]),
        normalizeDbExplorerColumnFlag(row),
    ]);

    return createTagAnalyzerColumnInfo(columnsForTagAnalyzer);
}

export function canOpenTagAnalyzerFromMetaColumns(columnRows?: STR_NUM_ARR_TYPE[]): boolean {
    const defaultValueColumn = columnRows?.[2];

    if (!defaultValueColumn) return false;

    const defaultValueType = defaultValueColumn[DB_EXPLORER_COLUMN_TYPE_INDEX];
    const normalizedDefaultValueType = String(defaultValueType ?? '')
        .trim()
        .toLowerCase();

    if (TAG_ANALYZER_UNSUPPORTED_DEFAULT_VALUE_TYPES.has(normalizedDefaultValueType)) {
        return false;
    }

    const columns = createTagAnalyzerColumnsFromDbExplorer(columnRows);
    return columns.name !== '' && columns.time !== '' && columns.value !== '';
}

export function getTagNameFromMetaRow({
    row,
    metaColumns,
    sourceNameColumn,
    fallbackNameColumn,
}: TagNameFromMetaRowOptions): string {
    const candidateIndexes = [
        metaColumns?.indexOf(sourceNameColumn) ?? -1,
        metaColumns?.indexOf(fallbackNameColumn) ?? -1,
        1,
    ];

    for (const candidateIndex of candidateIndexes) {
        if (candidateIndex < 0) continue;

        const value = row[candidateIndex];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value);
        }
    }

    return '';
}

export function createDefaultTagTimeRange(
    minMaxRow: unknown[] | undefined,
    sourceColumns: TagAnalyzerColumnInfo,
): { min: number; max: number } {
    const min = toFiniteNumber(minMaxRow?.[0]);
    const max = toFiniteNumber(minMaxRow?.[1]);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return { min: NaN, max: NaN };
    }

    if (isNumericBaseTimeSourceColumns(sourceColumns)) {
        return { min, max };
    }

    return {
        min: Math.floor(min / NANOSECONDS_PER_MILLISECOND),
        max: Math.floor(max / NANOSECONDS_PER_MILLISECOND),
    };
}
