import { fetchTqlWithoutConsole } from './database';
import { createArrayColumnMetadata, type ArrayColumnMetadata } from '@/utils/arrayValue';

export type ArrayMetadataParams = { dbName: string; userName: string; tableName: string; valueColumn: string; signal?: AbortSignal };
const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** M$SYS_COLUMNS.LENGTH is ARRAY cardinality (verified on dev-4158).
 * Keep this optional enrichment separate from NAME/TYPE/FLAG so old schemas still work.
 */
export async function fetchArrayColumnMetadata({ dbName, userName, tableName, valueColumn, signal }: ArrayMetadataParams): Promise<ArrayColumnMetadata> {
    const sql = `SELECT MC.TYPE, MC.LENGTH, MC.PRECISION, MC.SCALE FROM M$SYS_COLUMNS MC, M$SYS_TABLES MT, M$SYS_USERS MU WHERE MC.TABLE_ID = MT.ID AND MC.DATABASE_ID = MT.DATABASE_ID AND MT.USER_ID = MU.USER_ID AND MT.DATABASE_NAME = UPPER(${literal(dbName)}) AND MU.NAME = UPPER(${literal(userName)}) AND MT.NAME = UPPER(${literal(tableName)}) AND MC.NAME = UPPER(${literal(valueColumn)})`;
    const { svrState, svrData, svrReason } = await fetchTqlWithoutConsole(sql, undefined, signal);
    if (!svrState) throw new Error(svrReason || 'Unable to read ARRAY metadata.');
    const row = svrData?.rows?.[0];
    if (!Array.isArray(row)) throw new Error('ARRAY column metadata was not found.');
    return createArrayColumnMetadata(row[0], row[1], row[2], row[3]);
}
