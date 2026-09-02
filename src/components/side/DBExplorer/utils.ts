import { getColumnType } from '@/utils/dashboardUtil';
import { formatDistanceReadout } from '@/utils/distanceRange';
import { DATETIME_COLUMN_TYPE } from '@/utils/timeFieldColumns';
import moment from 'moment';

// Doubles as the tree's bucket order and as the sort key for getTableType results, so the
// entries must match DBExplorer's TableTypeConverter output exactly. 'transaction' sits
// next to 'log' because that is what it replaced for unqualified CREATE TABLE on v8.7.
export const TableTypeOrderList: string[] = ['tag', 'log', 'transaction', 'fixed', 'volatile', 'lookup', 'keyValue', 'view', 'exception'];

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
    VIEW = 'VIEW',
    // v8.7. An unqualified `CREATE TABLE` produces this type, where pre-v8.7 servers produced
    // LOG — so it is not a rare corner, it is what most newly created tables now are.
    TRANSACTION = 'TRANSACTION',
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

/**
 * The name to copy, and the name a query can use.
 *
 * Always three parts. The shorter forms this used to produce — `table` for your own tables,
 * `owner.table` for someone else's — are only unambiguous while a server holds one database.
 * v8.7 allows several, and a bare or two-part name silently resolves to the *current* one: ask
 * for `ATABLE` while looking at FACTORY_A's copy and you read MACHBASEDB's instead. That is a
 * wrong answer rather than an error, so the qualified form is the only safe one to hand out.
 *
 * `database.owner.object` also works against the current database and against pre-v8.7 servers,
 * so no version branch is needed. Note that the owner may not be dropped: `database.object`
 * makes the engine read the first part as a user (ERR-2080).
 *
 * Callers still pass `databaseId` / `currentUserName`; they no longer select a name form, and
 * are kept so the signature does not churn across the three call sites.
 */
export const buildQualifiedTableName = ({
    dbName,
    userName,
    tableName,
}: {
    dbName: string;
    userName: string;
    tableName: string;
    databaseId?: string | number;
    currentUserName?: string;
}): string => {
    const sParts = [dbName, userName, tableName].map((aPart) => String(aPart ?? '').trim());
    // A missing database or owner would produce `.SYS.TAG` or `DB..TAG`, neither of which
    // resolves — fall back to whatever parts we actually have rather than emitting a broken name.
    return sParts.every(Boolean) ? sParts.join('.') : sParts.filter(Boolean).join('.');
};
export const E_TABLE_TYPE_COLOR = {
    LOG: 'rgb(252, 121, 118)',
    FIXED: '#ffdc72',
    LOOKUP: '#ffdc72',
    VOLATILE: 'rgb(255, 202, 40)',
    KV: 'rgb(92, 226, 220)',
    TAG: 'rgb(92, 163, 220)',
    VIEW: '#9C8FFF',
    TRANSACTION: 'rgb(157, 196, 133)',
} as const;
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
        case 7:
            return E_TABLE_TYPE.VIEW;
        case 8:
            return E_TABLE_TYPE.TRANSACTION;
        default:
            return 'UNKWON';
    }
};

/**
 * DROP names the object in full, database included.
 *
 * A two-part `owner.table` resolves against the *current* database, so dropping a table the
 * tree showed under another database would delete the same-named table here instead — silently,
 * because both names are valid. Measured: with `ZZDROPTEST` present in MACHBASEDB and
 * FACTORY_A, `DROP TABLE SYS.ZZDROPTEST` issued for the FACTORY_A row removed the MACHBASEDB
 * one. `dbName` is therefore required rather than optional.
 */
export const buildDropObjectQuery = ({
    tableType,
    dbName,
    userName,
    tableName,
    cascade,
}: {
    tableType: number;
    dbName: string;
    userName: string;
    tableName: string;
    cascade: boolean;
}): string => {
    const qualified = buildQualifiedTableName({ dbName, userName, tableName });
    // `buildQualifiedTableName` shortens rather than emitting an empty segment, so a row that
    // carried no database name yields `SYS.ATABLE` — the two-part form described above, which
    // deletes the current database's copy of a table the tree showed under another one. There
    // is no statement that means what the user clicked, so build none and let the caller say so.
    if (qualified.split('.').length < 3) return '';
    if (CheckTableFlag(tableType) === E_TABLE_TYPE.VIEW) return `DROP VIEW ${qualified}`;
    return `DROP TABLE ${qualified}${cascade ? ' CASCADE' : ''}`;
};

export const getTableTypeColor = (aTableType: string) => {
    switch (aTableType) {
        case 'tag':
            return E_TABLE_TYPE_COLOR.TAG;
        case 'keyValue':
            return E_TABLE_TYPE_COLOR.KV;
        case 'log':
            return E_TABLE_TYPE_COLOR.LOG;
        case 'volatile':
            return E_TABLE_TYPE_COLOR.VOLATILE;
        case 'fixed':
            return E_TABLE_TYPE_COLOR.FIXED;
        case 'lookup':
            return E_TABLE_TYPE_COLOR.LOOKUP;
        case 'view':
            return E_TABLE_TYPE_COLOR.VIEW;
        case 'transaction':
            return E_TABLE_TYPE_COLOR.TRANSACTION;
        default:
            return 'darkgray';
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
export const GettColumnFlag = (aColFlag: number, aColType?: number) => {
    if ((aColFlag & E_COLUMN_FLAG.PK) > 0) return 'PK';
    if ((aColFlag & E_COLUMN_FLAG.TAGNAME) > 0) return 'tag name';
    if ((aColFlag & E_COLUMN_FLAG.BASETIME) > 0) {
        // base time and base distance share the same BASETIME flag; the column TYPE disambiguates them.
        // datetime -> base time, otherwise (e.g. double odometer) -> base distance.
        return aColType !== undefined && aColType !== DATETIME_COLUMN_TYPE ? 'base distance' : 'base time';
    }
    if ((aColFlag & E_COLUMN_FLAG.SUMMARIZED) > 0) return 'summarized';
    if ((aColFlag & E_COLUMN_FLAG.METACOLUMN) > 0) {
        if ((aColFlag & E_COLUMN_FLAG.LSL) > 0) return 'meta (lsl)';
        if ((aColFlag & E_COLUMN_FLAG.USL) > 0) return 'meta (usl)';
        return 'meta';
    }
    return '';
};

/** The display DESC `GettColumnFlag` writes for the one column a tag table orders its rows by. */
export const BASE_DISTANCE_DESC = 'base distance';

/**
 * The table header's base column: its name, and whether it measures distance rather than time.
 *
 * Read off the DESC the Column table already shows, because `GettColumnFlag` has decided that
 * question once and a second derivation here could disagree with what the user is looking at. The
 * positional fallback is what a table whose DESC could not be resolved falls back to — index 1 is
 * the base column of every tag table by construction.
 */
export const resolveTableBaseColumn = (aColumnInfo?: FetchCommonType) => {
    const sRows = aColumnInfo?.rows ?? [];
    const sDescIndex = aColumnInfo?.columns?.indexOf('DESC') ?? -1;
    const sDescOf = (aRow?: STR_NUM_ARR_TYPE) => (sDescIndex < 0 ? '' : String(aRow?.[sDescIndex] ?? '').trim().toLowerCase());
    const sBaseRow = sRows.find((aRow) => sDescOf(aRow).startsWith('base')) ?? sRows[1];
    return {
        name: String(sBaseRow?.[0] ?? ''),
        isDistance: sDescOf(sBaseRow) === BASE_DISTANCE_DESC,
    };
};

/**
 * One edge of the table header's data range.
 *
 * A base time is nanoseconds since the epoch; a base distance is a number in the column's own unit,
 * and dividing it by a million and calling it a date is how DISTANCE_SENSOR's 0 .. 999990 came to
 * read `N/A ~ 1970-01-01 09:00:00`. Note which value each axis refuses: 0 is not a timestamp any
 * table holds, but it is the first metre of every odometer.
 */
export const formatTableBaseExtent = (aValue: unknown, aIsDistance: boolean) => {
    if (aValue === null || aValue === undefined || aValue === '') return 'N/A';
    const sNumeric = Number(aValue);
    if (!Number.isFinite(sNumeric)) return 'N/A';
    if (aIsDistance) return formatDistanceReadout(sNumeric);
    return sNumeric > 0 ? moment(sNumeric / 1000000).format('YYYY-MM-DD HH:mm:ss') : 'N/A';
};

export const buildDataViewerColumnConfigFromColumnRows = (columnRows?: STR_NUM_ARR_TYPE[]) => {
    const rows = Array.isArray(columnRows) ? columnRows : [];

    const columnNameAt = (index: number, fallback: string) => {
        const name = rows[index]?.[0];
        return String(name ?? fallback).trim() || fallback;
    };

    const findByFlag = (flag: E_COLUMN_FLAG, label: string) => {
        const normalizedLabel = label.toLowerCase();
        return rows.find((row) => {
            const desc = row[4];
            if (typeof desc === 'number') return (desc & flag) > 0;
            const normalizedDesc = String(desc ?? '').trim().toLowerCase();
            // base time and base distance share the BASETIME flag; both display descs start with 'base'.
            if (flag === E_COLUMN_FLAG.BASETIME) return normalizedDesc.startsWith('base');
            return normalizedDesc === normalizedLabel;
        })?.[0];
    };

    const tagColumn = String(findByFlag(E_COLUMN_FLAG.TAGNAME, 'tag name') ?? columnNameAt(0, 'NAME')).trim() || 'NAME';
    const timeColumn = String(findByFlag(E_COLUMN_FLAG.BASETIME, 'basetime') ?? columnNameAt(1, 'TIME')).trim() || 'TIME';
    const valueColumn = String(findByFlag(E_COLUMN_FLAG.SUMMARIZED, 'summarized') ?? columnNameAt(2, 'VALUE')).trim() || 'VALUE';

    return {
        tagColumn,
        timeColumn,
        valueColumn,
        metaTagColumn: tagColumn,
    };
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

const toColumnTypeCode = (typeValue: string | number): number | undefined => {
    if (typeof typeValue === 'number') return Number.isNaN(typeValue) ? undefined : typeValue;

    const parsed = Number(typeValue);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const formatColumnDesc = (descValue: string | number, typeValue: string | number) => {
    if (typeof descValue === 'number' && !Number.isNaN(descValue)) {
        return GettColumnFlag(descValue, toColumnTypeCode(typeValue));
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
                formatColumnDesc(getCellValue(row, rawDescIdx), getCellValue(row, rawTypeIdx)),
            ];
        }),
        types: ['string', 'string', 'number', 'number', 'string'],
    };
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

/**
 * `M$SYS_USER_ACCESS.PRIV` as a number, whichever encoding the server used.
 *
 * v8.7 types the column `int64` and hands over a bitmask (`1`, `575`, …). Older servers typed
 * it `varchar` and packed two fields into `"<mask>|<label>"`. Calling `.split` on the new form
 * throws — a number has no such method — and that threw inside a render, so the whole explorer
 * went down with it rather than one badge.
 *
 * Anything unparseable answers 0: no privileges, which is the safe reading.
 */
export const parseTablePrivilege = (aPriv: unknown): number => {
    if (typeof aPriv === 'number') return Number.isFinite(aPriv) ? aPriv : 0;
    const sText = String(aPriv ?? '').trim();
    if (!sText) return 0;
    const sMask = Number(sText.includes('|') ? sText.split('|')[0].trim() : sText);
    return Number.isFinite(sMask) ? sMask : 0;
};

/** The granted privileges spelled out, e.g. `SELECT, INSERT`. Empty when none are set. */
export const describeTablePrivilege = (aPriv: unknown): string => {
    const sMask = parseTablePrivilege(aPriv);
    return Object.entries(TABLE_PERMISSION)
        .filter(([, aBit]) => hasTablePermission(sMask, aBit))
        .map(([aName]) => aName)
        .join(', ');
};

/**
 * The database-level privilege bits, as `M$SYS_USER_ACCESS.PRIV` encodes them.
 *
 * Measured on a v8.7 server by granting one privilege at a time to a scratch user and reading
 * the mask back (each grant revoked afterwards). `ALL` is 944 — every bit below except MOUNT,
 * which is instance-scoped and only accepted on MACHBASEDB.
 *
 * These are a different space from `TABLE_PERMISSION` (1/2/4/8): the engine refuses
 * `GRANT SELECT ON DATABASE` with ERR-2186, and refuses `GRANT CONNECT ON TABLE` likewise.
 */
export const DATABASE_PERMISSION = {
    CREATE: 16,
    DROP: 32,
    MOUNT: 64,
    ALTER: 128,
    BACKUP: 256,
    CONNECT: 512,
} as const;

/** Does this `M$SYS_USER_ACCESS.PRIV` mask carry the privilege? */
export const hasDatabasePermission = (aPriv: unknown, aBit: number): boolean => (parseTablePrivilege(aPriv) & aBit) === aBit;

/**
 * Which databases get a node in the tree, in the order they should appear.
 *
 * The tree used to derive this from the table rows themselves, which cannot represent a
 * database holding no tables the user can see — a freshly created one is invisible, and there
 * is no way to tell from the UI that `CREATE DATABASE` did anything at all. (That is also why
 * 'MACHBASEDB' was hardcoded for admins: the one database guaranteed to exist, forced in
 * because the derivation could not be trusted to produce it.)
 *
 * So the catalogue leads and the table rows follow:
 *
 *  - `aCatalogue` is `V$DATABASES`, already resolved for other reasons, ordered by KIND then
 *    DATABASE_ID — active databases first, mounted backups below them, stable across refreshes
 *    where "first seen in the table rows" was not. This function preserves that order rather
 *    than imposing one of its own.
 *  - `aConnectable` restricts it to the databases a non-admin may actually connect to. Pass
 *    `undefined` for an admin, who is not listed in `M$SYS_USER_ACCESS` at all (SYS has zero
 *    rows there) and may see everything.
 *  - `aTableRowDbNames` is unioned in last rather than intersected. A database that has rows in
 *    the table query but is missing from the catalogue must still appear, or its tables vanish
 *    from the tree — reachable for a non-admin whose CONNECT was revoked while they still own
 *    tables there. Losing a table is worse than showing a database node.
 *
 * An empty catalogue means the server has no `V$DATABASES` (pre-v8.7) or would not answer, and
 * the old table-derived behaviour stands.
 */
export const buildDatabaseNodeList = ({
    catalogue,
    connectable,
    tableRowDbNames,
}: {
    catalogue: { name: string }[];
    connectable?: string[];
    tableRowDbNames: string[];
}): string[] => {
    const sKey = (aName: unknown) => String(aName ?? '').trim().toUpperCase();
    const sFromRows = tableRowDbNames.map((aName) => String(aName ?? '').trim()).filter(Boolean);
    const sRowKeys = new Set(sFromRows.map(sKey));

    if (!catalogue.length) return Array.from(new Set(sFromRows));

    const sAllowed = connectable === undefined ? undefined : new Set(connectable.map(sKey));
    const sNames = catalogue
        .map((aDb) => String(aDb.name ?? '').trim())
        .filter(Boolean)
        .filter((aName) => sAllowed === undefined || sAllowed.has(sKey(aName)) || sRowKeys.has(sKey(aName)));

    const sSeen = new Set(sNames.map(sKey));
    for (const aName of sFromRows) {
        if (sSeen.has(sKey(aName))) continue;
        sSeen.add(sKey(aName));
        sNames.push(aName);
    }
    return sNames;
};
