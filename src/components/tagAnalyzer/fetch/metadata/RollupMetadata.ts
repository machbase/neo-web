import request from '@/api/core';
import { Toast } from '@/design-system/components';
import type { RollupTableMap } from '../panelData/PanelDataFetchTypes';
import { parseRollupTableName } from './RollupTableNameParsing';

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

function getConfiguredRollupVersion(): string | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    return localStorage.getItem(ROLLUP_VERSION_STORAGE_KEY);
}

export function getRollupMetadataLookupKey(
    tableName: string,
): RollupMetadataLookupKey | undefined {
    const sParsedTableName = parseRollupTableName(tableName);
    if (!sParsedTableName) {
        return undefined;
    }

    const sRollupVersion = getConfiguredRollupVersion();
    if (
        sRollupVersion === 'OLD' &&
        sParsedTableName.databaseName.toUpperCase() !== 'MACHBASEDB'
    ) {
        return undefined;
    }

    const sTableNameForLookup = sRollupVersion === 'RECENT'
        ? `${sParsedTableName.databaseName}.${sParsedTableName.tableName}`
        : sParsedTableName.tableName;

    return {
        userName: sParsedTableName.userName,
        tableName: sTableNameForLookup,
    };
}

export async function fetchAllRollupTableInfo(): Promise<RollupTableMap> {
    const sRollupVersion = getConfiguredRollupVersion();
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
        sRollupMap[user][table][column] ??= [];
        sRollupMap[user][table].EXT_TYPE ??= [];
        sRollupMap[user][table].EXT_TYPE.push(extType);
        sRollupMap[user][table][column].push(value);
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