import request from '@/api/core';
import { Toast } from '@/design-system/components';
import { ADMIN_ID } from '@/utils/constants';
import { ROLLUP_EXT_TYPE_BY_COLUMN } from '@/utils/rollupColumnCandidates';
import { asRecord } from '../../domain/ObjectGuards';
import type { RollupTableMap } from '../panelData/PanelDataFetchTypes';

const ROLLUP_VERSION_STORAGE_KEY = 'V$ROLLUP_VER';

type RollupMetadataResponse = {
    status?: number;
    statusText?: string;
    data?: {
        rows?: Array<[string, string, string, string, string]>;
    };
    reason?: unknown;
    message?: unknown;
};

type RollupMetadataLookupKey = {
    userName: string;
    tableName: string;
};

type ParsedRollupTableName = {
    databaseName: string;
    userName: string;
    tableName: string;
};

type RollupMetadataCacheEntry = {
    rollupVersion: string | null;
    value: RollupTableMap;
};

type PendingRollupMetadataRequest = {
    rollupVersion: string | null;
    promise: Promise<RollupTableMap>;
};

let sCachedRollupMetadata: RollupMetadataCacheEntry | undefined;
let sPendingRollupMetadataRequest: PendingRollupMetadataRequest | undefined;

function getConfiguredRollupVersion(): string | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    return localStorage.getItem(ROLLUP_VERSION_STORAGE_KEY);
}

// A table name is "[database.][user.]table"; missing segments fall back to the
// default database and admin user. An empty or malformed name yields keys that
// simply never match a rollup map entry.
function parseRollupTableName(tableName: string): ParsedRollupTableName {
    const sTableSegments = tableName.split('.');

    return {
        databaseName: sTableSegments.length > 2
            ? sTableSegments[sTableSegments.length - 3]
            : 'MACHBASEDB',
        userName: sTableSegments.length > 1
            ? sTableSegments[sTableSegments.length - 2]
            : ADMIN_ID.toUpperCase(),
        tableName: sTableSegments[sTableSegments.length - 1],
    };
}

// Returns undefined only when rollup lookups do not apply at all: the OLD
// rollup catalog has no entries for mounted (non-MACHBASEDB) databases.
export function getRollupMetadataLookupKey(
    tableName: string,
): RollupMetadataLookupKey | undefined {
    const sParsedTableName = parseRollupTableName(tableName);
    const sRollupVersion = getConfiguredRollupVersion();

    if (
        sRollupVersion === 'OLD' &&
        sParsedTableName.databaseName.toUpperCase() !== 'MACHBASEDB'
    ) {
        return undefined;
    }

    return {
        userName: sParsedTableName.userName,
        tableName: sRollupVersion === 'OLD'
            ? sParsedTableName.tableName
            : `${sParsedTableName.databaseName}.${sParsedTableName.tableName}`,
    };
}

// The rollup map is keyed by names as the server returned them (usually upper
// case), while lookup keys keep the configured casing; probe both spellings.
export function findRollupTableEntry(
    rollupMetadata: unknown,
    tableName: string,
): Record<string, unknown> | undefined {
    const sRollupMetadataRecord = asRecord(rollupMetadata);
    const sLookupKey = getRollupMetadataLookupKey(tableName);
    if (!sRollupMetadataRecord || !sLookupKey) {
        return undefined;
    }

    for (const sUserName of uniqueStrings([
        sLookupKey.userName,
        sLookupKey.userName.toUpperCase(),
    ])) {
        const sUserEntry = asRecord(sRollupMetadataRecord[sUserName]);
        if (!sUserEntry) {
            continue;
        }

        for (const sEntryTableName of uniqueStrings([
            sLookupKey.tableName,
            sLookupKey.tableName.toUpperCase(),
        ])) {
            const sTableEntry = asRecord(sUserEntry[sEntryTableName]);
            if (sTableEntry) {
                return sTableEntry;
            }
        }
    }

    return undefined;
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

export async function fetchAllRollupTableInfo(): Promise<RollupTableMap> {
    const sRollupVersion = getConfiguredRollupVersion();
    if (sCachedRollupMetadata?.rollupVersion === sRollupVersion) {
        return sCachedRollupMetadata.value;
    }

    if (sPendingRollupMetadataRequest?.rollupVersion === sRollupVersion) {
        return sPendingRollupMetadataRequest.promise;
    }

    const sRequestPromise = fetchAllRollupTableInfoUncached(sRollupVersion);
    sPendingRollupMetadataRequest = {
        rollupVersion: sRollupVersion,
        promise: sRequestPromise,
    };

    try {
        const sRollupMetadata = await sRequestPromise;
        sCachedRollupMetadata = {
            rollupVersion: sRollupVersion,
            value: sRollupMetadata,
        };

        return sRollupMetadata;
    } finally {
        if (sPendingRollupMetadataRequest?.promise === sRequestPromise) {
            sPendingRollupMetadataRequest = undefined;
        }
    }
}

async function fetchAllRollupTableInfoUncached(
    sRollupVersion: string | null,
): Promise<RollupTableMap> {
    let sSql = `select t1.user_name as user_name, 
  case when t1.database_id = -1 then 'MACHBASEDB' else t2.MOUNTDB end || '.' || t1.root_table as root_table, 
  t1.interval_time as interval_time, t1.column_name as column_name, t1.ext_type as ext_type 
from (
  select v.database_id, u.name as user_name, root_table, interval_time, column_name, ext_type 
  from v$rollup as v, m$sys_users as u 
  where v.user_id = u.user_id 
  group by v.database_id, root_table, interval_time, user_name, column_name, ext_type 
) as t1 LEFT OUTER JOIN V$STORAGE_MOUNT_DATABASES as t2 ON (t1.database_id = t2.BACKUP_TBSID) 
order by user_name, root_table asc, interval_time desc`;

    if (sRollupVersion === 'OLD') {
        sSql = `select u.name as user_name, root_table, interval_time, column_name, ext_type 
from v$rollup as v, m$sys_users as u 
where v.user_id = u.user_id 
group by root_table, interval_time, user_name, column_name, ext_type 
order by user_name, root_table asc, interval_time desc`;
    }

    const sResponse = await requestRollupMetadataQuery(sSql);
    showRollupMetadataRequestError(sResponse);

    const sRows = sResponse.data?.rows;
    if (!Array.isArray(sRows)) {
        return {};
    }

    const sRollupMap: RollupTableMap = {};
    for (const [user, table, value, column, extType] of sRows) {
        sRollupMap[user] ??= {};
        sRollupMap[user][table] ??= {};
        const sTableRollupMap = sRollupMap[user][table] as Record<string, any>;
        sTableRollupMap[column] ??= [];
        sTableRollupMap.EXT_TYPE ??= [];
        sTableRollupMap[ROLLUP_EXT_TYPE_BY_COLUMN] ??= {};
        sTableRollupMap[ROLLUP_EXT_TYPE_BY_COLUMN][column] ??= [];
        sTableRollupMap.EXT_TYPE.push(extType);
        sTableRollupMap[ROLLUP_EXT_TYPE_BY_COLUMN][column].push(extType);
        sTableRollupMap[column].push(value);
    }

    return sRollupMap;
}

async function requestRollupMetadataQuery(
    querySql: string,
): Promise<RollupMetadataResponse> {
    return request({
        method: 'GET',
        url: `/api/query?q=${encodeURIComponent(querySql)}`,
    }) as Promise<RollupMetadataResponse>;
}

function showRollupMetadataRequestError(response: RollupMetadataResponse): void {
    if (typeof response.status !== 'number' || response.status < 400) {
        return;
    }

    Toast.error(getRollupMetadataErrorMessage(response));
}

function getRollupMetadataErrorMessage(response: RollupMetadataResponse): string {
    if (response.reason !== undefined) {
        return String(response.reason);
    }

    if (response.message !== undefined) {
        return String(response.message);
    }

    return response.statusText ?? `Request failed (${response.status})`;
}
