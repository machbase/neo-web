import { getId } from '@/utils';
import { concatTagSet } from '@/utils/helpers/tags';
import { convertChartDefault } from '@/utils/utils';
import { DEFAULT_CHART as TAZ_DEFAULT } from '@/utils/constants';

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
