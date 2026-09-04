/**
 * The toolbar's target database, folded into the statements the splitter returned.
 *
 * Nothing here writes to the editor. `sql.split` already reports a per-statement `env`, and
 * `sqlBasicFormatter` already turns `env.use` into `SQL(use('DB'), …)` — the only thing that was
 * missing is a second source for that field. This module is that source, applied once between the
 * splitter and everything downstream (`src/components/sql/index.tsx`), so the four consumers that
 * derive from the same statement objects — run, "more rows", CSV download, CHART tab — inherit the
 * value without four separate merges.
 *
 * Applying it at split time also fixes the value for the life of a result: change the chip after a
 * query has run and the next page of rows still comes from the database the first page came from.
 */

/** The `env` the splitter reports, narrowed to what the merge reads. */
type EnvLike = {
    bridge?: string;
    use?: string;
    named?: Record<string, string>;
    error?: string;
};

export type TargetStatementLike = {
    env?: EnvLike | null;
    isComment?: boolean;
};

/**
 * `use()` takes an argument position, not a string literal, so a value that is not a plain
 * identifier is dropped rather than quoted — the rule `sqlFormatter` states for `named()` keys and
 * assumes for `use()`. Every value here comes from the server's own catalogue, so this rejects
 * nothing in practice; it exists so a malformed restored value cannot reach the TQL builder.
 */
const DATABASE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const isDatabaseNameSafe = (aName: unknown): aName is string => typeof aName === 'string' && DATABASE_NAME.test(aName);

/**
 * Does this statement take the chip's value?
 *
 * Three statements do not, and the third is the one the issue does not mention:
 *   - a comment carries no query;
 *   - an explicit `-- env: use=` wins, which is the whole point of the directive;
 *   - a `bridge()` statement leaves for an external system, and
 *     `SQL(bridge('x'), use('db'), …)` asks that system to switch machbase databases. Injecting
 *     there would break every existing `-- env: bridge=` query the moment a chip is set.
 */
const receivesTargetDatabase = (aStatement: TargetStatementLike): boolean =>
    !aStatement?.isComment && !aStatement?.env?.use && !aStatement?.env?.bridge;

/**
 * Merge the chip's value into the statements that accept it.
 *
 * With no target — the default, and every pre-v8.7 server — this returns the array it was given,
 * unchanged and un-cloned, so the TQL that comes out the other side is byte-identical to what it
 * was before this feature existed (`sqlFormatter.test.ts` pins that output).
 */
export const applyTargetDatabase = <T extends TargetStatementLike>(aStatements: T[] | undefined | null, aTargetDb?: string | null): T[] => {
    const sList = aStatements ?? [];
    if (!isDatabaseNameSafe(aTargetDb)) return sList;

    let sApplied = 0;
    const sNext = sList.map((aStatement) => {
        if (!receivesTargetDatabase(aStatement)) return aStatement;
        sApplied += 1;
        return { ...aStatement, env: { ...(aStatement.env ?? {}), use: aTargetDb } };
    });

    // Nothing to change means the caller keeps the array it passed in — see the note above about
    // staying byte-identical when the chip is idle.
    return sApplied === 0 ? sList : sNext;
};
