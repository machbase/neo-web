import { createCurrentDatabaseResolver } from '@/utils/currentDatabaseResolver';
import { executeQuery } from './publicQuery';

/**
 * The public view's resolver, over this tree's unauthenticated transport.
 *
 * Same resolution as the editor's — literally the same function, built here over `/db/query`.
 * Borrowing the editor's resolver answered 401, and the failure was silent in the worst way: the
 * catch left `hasLogicalDatabases()` false, so on a v8.7 server every public board scoped its SQL
 * to `DATABASE_ID = -1` (no rows) and took the pre-v8.7 rollup join (NULL `root_table`) while
 * looking, from the outside, like a board with no data rather than a board asking the wrong
 * question.
 *
 * `V$DATABASES` and `CURRENT_DATABASE()` are both readable on `/db/query`, so nothing about the
 * resolution itself has to change — only where it is sent.
 */
const sResolver = createCurrentDatabaseResolver(async (aSql: string) => {
    const sRes: any = await executeQuery(aSql);
    return { svrState: sRes?.success ?? false, svrData: sRes?.data };
});

export const ensureCurrentDatabase = sResolver.ensureCurrentDatabase;

/** Test seam. Not used by application code. */
export const __resetCurrentDatabaseResolver = sResolver.reset;
