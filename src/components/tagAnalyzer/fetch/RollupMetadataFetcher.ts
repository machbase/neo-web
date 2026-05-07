import request from '@/api/core';
import { showRequestError } from './helper/FetchRequestErrorPresenter';
import type { RollupTableMap } from './FetchContracts';

export async function fetchRollupMetadata(): Promise<RollupTableMap | []> {
    const sRollupVersion = localStorage.getItem('V$ROLLUP_VER');
    let sUrl = `select t1.user_name as user_name, 
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
        sUrl = `select u.name as user_name, root_table, interval_time, column_name, ext_type 
from v$rollup as v, m$sys_users as u 
where v.user_id = u.user_id 
group by root_table, interval_time, user_name, column_name, ext_type 
order by user_name, root_table asc, interval_time desc`;
    }

    const sData = await request({
        method: 'GET',
        url: `/api/query?q=${sUrl}`,
    });
    showRequestError(sData);

    const sRollupMap: RollupTableMap = {};
    if (!sData?.data || !('rows' in sData.data) || !Array.isArray(sData.data.rows)) {
        return [];
    }

    for (const [user, table, value, column, extType] of sData.data.rows as Array<
        [string, string, string, string, string]
    >) {
        sRollupMap[user] ??= {};
        sRollupMap[user][table] ??= {};
        sRollupMap[user][table][column] ??= [];
        sRollupMap[user][table].EXT_TYPE ??= [];
        sRollupMap[user][table].EXT_TYPE.push(extType);
        sRollupMap[user][table][column].push(value);
    }

    return Object.keys(sRollupMap).length === 0 ? [] : sRollupMap;
}
