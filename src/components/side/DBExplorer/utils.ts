import { getId } from '@/utils';
import { concatTagSet } from '@/utils/helpers/tags';
import { convertChartDefault } from '@/utils/utils';
import { DEFAULT_CHART as TAZ_DEFAULT } from '@/utils/constants';
import { getColumnType } from '@/utils/dashboardUtil';

export const TableTypeOrderList: string[] = ['tag', 'log', 'fixed', 'volatile', 'lookup', 'keyValue'];

export type STR_NUM_ARR_TYPE = (string | number)[];
export type FetchCommonType = {
    columns: string[];
    rows: (string | number)[][];
    types: string[];
};
export enum E_TABLE_TYPE {
    LOG = 'LOG',
    FIXED = 'FIXED', // MEAT | VIRTUAL
    VOLATILE = 'VOLATILE',
    LOOKUP = 'LOOKUP',
    KV = 'KV',
    TAG = 'TAG',
}
export enum E_TABLE_INFO {
    DB_NM = 0,
    USER_NM = 1,
    TB_ID = 2,
    TB_NM = 3,
    TB_TYPE = 4,
    TB_FLAG = 5,
    DB_ID = 6,
    PRIV = 7,
}
export enum E_TABLE_TYPE_COLOR {
    LOG = 'rgb(252, 121, 118)',
    FIXED = '#ffdc72',
    LOOKUP = '#ffdc72',
    VOLATILE = 'rgb(255, 202, 40)',
    KV = 'rgb(92, 226, 220)',
    TAG = 'rgb(92, 163, 220)',
}
export enum E_COLUMN_FLAG {
    TAGNAME = 0x08000000, // 134217728
    BASETIME = 0x01000000, // 16777216
    SUMMARIZED = 0x02000000, // 33554432
    METACOLUMN = 0x04000000, // 67108864
    LSL = 0x00004000, // LSL mask 67,125,248
    USL = 0x00008000, // USL mask 67,141,632
    PK = 0x00400000,
}
export const COLUMN_HIDDEN_REGEX = /^_.*/;
export const DATA_NUMBER_TYPE = ['short', 'ushort', 'integer', 'uinteger', 'long', 'ulong', 'float', 'double'];
export const CheckTableFlag = (aTableFlag: number): string => {
    switch (aTableFlag) {
        case 0:
            return E_TABLE_TYPE.LOG;
        case 1:
            return E_TABLE_TYPE.FIXED;
        case 3:
            return E_TABLE_TYPE.VOLATILE;
        case 2:
        case 4:
            return E_TABLE_TYPE.LOOKUP;
        case 5:
            return E_TABLE_TYPE.KV;
        case 6:
            return E_TABLE_TYPE.TAG;
        default:
            return 'UNKWON';
    }
};
export const CheckIndexFlag = (aIndexFlag: number) => {
    switch (aIndexFlag) {
        case 1:
            return 'BITMAP';
        case 2:
            return 'KEYWORD';
        case 3:
            return 'REDBLACK';
        case 6:
            return 'LSM';
        case 8:
            return 'REDBLACK';
        case 9:
            return 'KETWORD_LSM';
        case 11:
            return 'TAG';
        default:
            return '';
    }
};
export const GettColumnFlag = (aColFlag: number) => {
    if ((aColFlag & E_COLUMN_FLAG.PK) > 0) return 'PK';
    if ((aColFlag & E_COLUMN_FLAG.TAGNAME) > 0) return 'tag name';
    if ((aColFlag & E_COLUMN_FLAG.BASETIME) > 0) return 'basetime';
    if ((aColFlag & E_COLUMN_FLAG.SUMMARIZED) > 0) return 'summarized';
    if ((aColFlag & E_COLUMN_FLAG.METACOLUMN) > 0) {
        if ((aColFlag & E_COLUMN_FLAG.LSL) > 0) return 'meta (lsl)';
        if ((aColFlag & E_COLUMN_FLAG.USL) > 0) return 'meta (usl)';
        return 'meta';
    }
    return '';
};

const getColumnIndex = (columns: string[], target: string) => columns.indexOf(target);

const getColumnIndexByAliases = (columns: string[], targets: string[]) => {
    const normalizedTargets = targets.map((target) => target.toUpperCase());

    return columns.findIndex((column) => normalizedTargets.includes(column.toUpperCase()));
};

const getCellValue = (row: (string | number)[], index: number) => (index >= 0 ? row[index] : '');

const formatColumnType = (typeValue: string | number) => {
    if (typeof typeValue === 'number' && !Number.isNaN(typeValue)) {
        return getColumnType(typeValue);
    }

    return `${typeValue ?? ''}`.toLowerCase();
};

const formatColumnDesc = (descValue: string | number) => {
    if (typeof descValue === 'number' && !Number.isNaN(descValue)) {
        return GettColumnFlag(descValue);
    }

    return `${descValue ?? ''}`;
};

const toNumericValue = (value: string | number) => {
    if (typeof value === 'number') return value;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
};

const toNumber = (value: string | number) => {
    if (typeof value === 'number') {
        return Number.isNaN(value) ? undefined : value;
    }

    if (value.trim() === '') return undefined;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

export const normalizeLogicalLengthInfo = (columnInfo?: FetchCommonType): FetchCommonType | undefined => {
    if (!columnInfo?.columns || !columnInfo?.rows) return undefined;

    const nameIdx = getColumnIndexByAliases(columnInfo.columns, ['NAME', 'COLUMN']);
    const lengthIdx = getColumnIndexByAliases(columnInfo.columns, ['LENGTH']);

    if (nameIdx < 0 || lengthIdx < 0 || columnInfo.rows.length === 0) return undefined;

    const rows = columnInfo.rows
        .filter((row) => {
            const name = getCellValue(row, nameIdx);
            const length = toNumber(getCellValue(row, lengthIdx));

            return name !== '' && length !== undefined;
        })
        .map((row) => {
            const nextRow = [...row];
            nextRow[lengthIdx] = toNumber(getCellValue(row, lengthIdx)) as number;
            return nextRow;
        });

    if (rows.length === 0) return undefined;

    const types = columnInfo.columns.map((_, index) => {
        if (columnInfo.types?.[index]) return index === lengthIdx ? 'number' : columnInfo.types[index];
        return index === lengthIdx ? 'number' : 'string';
    });
    const columns = [...columnInfo.columns];

    columns[nameIdx] = 'NAME';

    return {
        ...columnInfo,
        columns,
        rows,
        types,
    };
};

const getFilteredDisplayColumnRows = (
    columnInfo: FetchCommonType,
    opt: { includeMeta: boolean; hideHidden: boolean }
) => {
    const nameIdx = getColumnIndex(columnInfo.columns, 'NAME');
    const descIdx = getColumnIndex(columnInfo.columns, 'DESC');

    return columnInfo.rows.filter((row) => {
        const columnName = String(getCellValue(row, nameIdx));
        const desc = String(getCellValue(row, descIdx));
        const isMetaColumn = desc.includes('meta');
        const isHiddenColumn = COLUMN_HIDDEN_REGEX.test(columnName);

        if (opt.includeMeta !== isMetaColumn) return false;
        if (!opt.includeMeta && opt.hideHidden && isHiddenColumn) return false;

        return true;
    });
};

const getColumnNames = (columnInfo: FetchCommonType) => {
    const nameIdx = getColumnIndex(columnInfo.columns, 'NAME');

    if (nameIdx < 0) return [];

    return columnInfo.rows.map((row) => String(getCellValue(row, nameIdx))).filter((columnName) => columnName !== '');
};

const getLogicalLengthMatchCount = (targetColumnNames: string[], descColumnInfo?: FetchCommonType) => {
    if (!descColumnInfo?.columns || !descColumnInfo?.rows) return 0;

    const descNameIdx = getColumnIndex(descColumnInfo.columns, 'NAME');

    if (descNameIdx < 0) return 0;

    const descColumnNames = new Set(
        descColumnInfo.rows.map((row) => String(getCellValue(row, descNameIdx))).filter((columnName) => columnName !== '')
    );

    return targetColumnNames.filter((columnName) => descColumnNames.has(columnName)).length;
};

export const resolveLogicalLengthInfo = (
    targetColumnNames: string[],
    logicalLengthCandidates: Array<FetchCommonType | undefined>
): { logicalLengthInfo?: FetchCommonType; status: 'missing' | 'partial' | 'complete' } => {
    const totalColumnCount = targetColumnNames.length;

    if (totalColumnCount === 0) {
        return { logicalLengthInfo: undefined, status: 'complete' };
    }

    let bestLogicalLengthInfo: FetchCommonType | undefined;
    let bestMatchedColumnCount = 0;

    logicalLengthCandidates.forEach((logicalLengthCandidate) => {
        const matchedColumnCount = getLogicalLengthMatchCount(targetColumnNames, logicalLengthCandidate);

        if (matchedColumnCount > bestMatchedColumnCount) {
            bestMatchedColumnCount = matchedColumnCount;
            bestLogicalLengthInfo = logicalLengthCandidate;
        }
    });

    if (!bestLogicalLengthInfo || bestMatchedColumnCount === 0) {
        return { logicalLengthInfo: undefined, status: 'missing' };
    }

    if (bestMatchedColumnCount === totalColumnCount) {
        return { logicalLengthInfo: bestLogicalLengthInfo, status: 'complete' };
    }

    return { logicalLengthInfo: bestLogicalLengthInfo, status: 'partial' };
};

export const resolveDisplayColumnInfo = (
    rawColumnInfo: FetchCommonType,
    logicalLengthCandidates: Array<FetchCommonType | undefined>,
    opt: { includeMeta: boolean; hideHidden: boolean }
): { columnInfo: FetchCommonType; status: 'missing' | 'partial' | 'complete' } => {
    const rawDisplayColumnInfo = buildDisplayColumnInfo(rawColumnInfo);
    const filteredRawDisplayColumnInfo = {
        ...rawDisplayColumnInfo,
        rows: getFilteredDisplayColumnRows(rawDisplayColumnInfo, opt),
    };
    const logicalLengthResolution = resolveLogicalLengthInfo(getColumnNames(filteredRawDisplayColumnInfo), logicalLengthCandidates);
    const displayColumnInfo = buildDisplayColumnInfo(rawColumnInfo, logicalLengthResolution.logicalLengthInfo);

    return {
        columnInfo: {
            ...displayColumnInfo,
            rows: getFilteredDisplayColumnRows(displayColumnInfo, opt),
        },
        status: logicalLengthResolution.status,
    };
};

export const buildDisplayColumnInfo = (rawColumnInfo: FetchCommonType, descColumnInfo?: FetchCommonType): FetchCommonType => {
    const rawNameIdx = getColumnIndex(rawColumnInfo.columns, 'NAME');
    const rawTypeIdx = getColumnIndex(rawColumnInfo.columns, 'TYPE');
    const rawLengthIdx = getColumnIndex(rawColumnInfo.columns, 'LENGTH');
    const rawDescIdx = getColumnIndex(rawColumnInfo.columns, 'DESC');

    const descNameIdx = descColumnInfo ? getColumnIndex(descColumnInfo.columns, 'NAME') : -1;
    const descLengthIdx = descColumnInfo ? getColumnIndex(descColumnInfo.columns, 'LENGTH') : -1;
    const descLengthMap = new Map<string, string | number>();

    descColumnInfo?.rows.forEach((row) => {
        const name = getCellValue(row, descNameIdx);
        const length = getCellValue(row, descLengthIdx);

        if (name !== '') {
            descLengthMap.set(String(name), length);
        }
    });

    return {
        columns: ['NAME', 'TYPE', 'LENGTH', 'BYTE', 'DESC'],
        rows: rawColumnInfo.rows.map((row) => {
            const columnName = getCellValue(row, rawNameIdx);
            const byteLength = toNumericValue(getCellValue(row, rawLengthIdx));
            const logicalLength = toNumericValue(descLengthMap.get(String(columnName)) ?? byteLength);

            return [
                columnName,
                formatColumnType(getCellValue(row, rawTypeIdx)),
                logicalLength,
                byteLength,
                formatColumnDesc(getCellValue(row, rawDescIdx)),
            ];
        }),
        types: ['string', 'string', 'number', 'number', 'string'],
    };
};

export const GenTazDefault = ({ aTag, aTime, aTableInfo, aColType }: { aTag: string; aTime: { min: number; max: number }; aTableInfo: any; aColType: string[] }) => {
    const sTags: any[] = [
        {
            key: getId(),
            tagName: aTag,
            table: `${aTableInfo[E_TABLE_INFO.DB_NM]}.${aTableInfo[E_TABLE_INFO.USER_NM]}.${aTableInfo[E_TABLE_INFO.TB_NM]}`,
            calculationMode: 'avg',
            alias: '',
            weight: 1.0,
            colName: { name: aColType[0], time: aColType[1], value: aColType[2] },
        },
    ];
    const sNewData = {
        chartType: 'Line',
        tagSet: concatTagSet([], sTags),
        defaultRange: { min: aTime.min ? aTime.min : 'now-1h', max: aTime.max ? aTime.max : 'now' },
    };
    const sId = getId();
    const sBoardInfo = {
        id: sId,
        path: '',
        type: 'taz',
        name: `TAG ANALYZER`,
        panels: [convertChartDefault(TAZ_DEFAULT, sNewData)],
        code: '',
        savedCode: false,
        range_bgn: '',
        range_end: '',
        shell: { icon: 'chart-line', theme: '', id: 'TAZ' },
    };

    return sBoardInfo;
};

export const TABLE_PERMISSION = {
    SELECT: 1,
    INSERT: 2,
    DELETE: 4,
    UPDATE: 8,
} as const;

export const hasTablePermission = (permissions: number, permission: number): boolean => {
    return (permissions & permission) === permission;
};
