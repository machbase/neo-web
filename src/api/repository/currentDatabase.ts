import { fetchQuery } from '@/api/repository/database';
import { createCurrentDatabaseResolver } from '@/utils/currentDatabaseResolver';

/**
 * The editor's resolver: `/web/api/query` with the session's bearer token.
 *
 * The logic lives in `@/utils/currentDatabaseResolver` because the public dashboard needs the
 * same resolution over a different transport — see `src/public-dashboard/api/repository/currentDatabase.ts`.
 */
const sResolver = createCurrentDatabaseResolver(fetchQuery);

export const ensureCurrentDatabase = sResolver.ensureCurrentDatabase;

/** Test seam. Not used by application code. */
export const __resetCurrentDatabaseResolver = sResolver.reset;

export {
    getCurrentDatabase,
    getCurrentDatabaseId,
    getCurrentDatabaseName,
    hasLogicalDatabases,
    getDatabases,
    findDatabaseById,
    isDatabaseWritable,
    isMountedDatabase,
    isMountedDatabaseName,
    findDatabaseByName,
    normalizeDatabaseId,
    isSameDatabaseId,
} from '@/utils/currentDatabaseState';
export type { CurrentDatabase, DatabaseEntry, DatabaseId } from '@/utils/currentDatabaseState';
