/**
 * The one place a runtime value becomes text inside a SQL or TQL statement.
 *
 * Each layer a value can land in has exactly one function here, and every builder in the tree
 * goes through it — `src/public-dashboard` included, which imports this file directly. The
 * layers nest (a SQL literal inside a TQL string inside a URL), so a builder applies them
 * innermost first and never escapes by hand.
 *
 * Every rule below was measured against the engine (machbase-neo 8.7.2), not taken from docs:
 *
 * - A SQL string literal treats backslash as an escape: `'\n'` is one newline and `'a\'` does
 *   not close. Doubling the quote alone therefore corrupts `a\nb` and breaks on a trailing
 *   backslash; doubling the backslash as well round-trips every value. An unknown escape such
 *   as `\x` stays as written, so the doubled form matches what the single one matched before.
 * - LIKE escapes its wildcards with a backslash and has no ESCAPE clause (that is a syntax
 *   error). Its case-insensitive match is the behaviour the search boxes rely on, which is why a
 *   literal search stays a LIKE rather than moving to INSTR, which is case-sensitive.
 * - An identifier may be double-quoted, with `""` for a quote of its own, in every position the
 *   app uses — table, `db.user.table`, `METADATA`, `_X_META`, `V$X_STAT`, `show table` inside
 *   TQL. The engine upper-cases a quoted name like a bare one, and a table such as `"Q-1545"`
 *   can be created, so a name the catalogue lists is one these builders must be able to write.
 * - A TQL string literal is double-quoted with backslash escapes. A raw newline inside one does
 *   not parse; a backtick-quoted one cannot carry a backtick at all (`\`` is rejected).
 *
 * The SQL editor (`sqlFormatter`) is the one TQL writer that does not use `tqlString`: it binds
 * `named()` values, where its author measured a double-quoted value binding NULL. That did not
 * reproduce in 180 fresh binds on 8.7.2, but two unexplained NULLs in a select-list bind did turn
 * up, so that path keeps its single-quoted form until the cause is known.
 */

const PLAIN_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

const sqlStringLiteral = (aText: string) => `'${aText.replace(/'/g, "''").replace(/"(?=")/g, '\\"')}'`;

/**
 * A SQL string value: a literal for any value without a backslash, otherwise an expression that
 * evaluates to the value.
 *
 * Inside a literal the engine treats `""` as one `"` (measured: `'a""'` reads back `a"`, and
 * `{"a":""}` would lose a quote), so a double quote followed by another is written `\"`; a lone
 * one stays as it is. A backslash cannot be written into a literal reliably at all: the
 * tokenizer reads `\\'` as an escaped quote and runs on to the next quote in the statement
 * (`name in ('tail\\', 'p50')` is ERR-2010), and a literal inside a function argument is
 * unescaped and re-read, so `SUBSTR('#''a\\x', 2)` breaks too. What does hold is a literal
 * holding only backslashes and a trailing space, trimmed — `RTRIM('\\ ')` — so each run of
 * backslashes becomes one of those and the rest stays plain literals, joined with `||`.
 *
 * Measured on 8.7.2: every string of up to five characters from `a n \ ' " space` (9330 values)
 * reads back exactly in a select list followed by another literal, and the expression form also
 * holds in `=`, `IN`, `LIKE`, `REGEXP`, `->`, INSERT, UPDATE SET and DELETE, METADATA included.
 * One engine gap remains: `UPDATE … METADATA … WHERE name = (a || b)` matches no row, while
 * `WHERE name IN ((a || b))` does — which is how the metadata editor writes its UPDATE.
 */
export const sqlString = (aValue: unknown): string => {
    const sValue = String(aValue ?? '');
    if (!sValue.includes('\\')) return sqlStringLiteral(sValue);
    const sParts = (sValue.match(/\\+|[^\\]+/g) ?? []).map((aPart) =>
        aPart.startsWith('\\') ? `RTRIM('${'\\\\'.repeat(aPart.length)} ')` : sqlStringLiteral(aPart)
    );
    return `(${sParts.join(' || ')})`;
};

/** `LIKE` operand matching names that contain the text as typed — `%` and `_` included. */
export const sqlContains = (aValue: unknown): string => sqlString(`%${String(aValue ?? '').replace(/[\\%_]/g, '\\$&')}%`);

/**
 * One identifier segment. A plain name is written as it is, so every statement over ordinary
 * names stays byte-identical; anything else is double-quoted.
 */
export const sqlIdentifier = (aName: unknown): string => {
    const sName = String(aName ?? '');
    return PLAIN_IDENTIFIER.test(sName) ? sName : `"${sName.replace(/"/g, '""')}"`;
};

/**
 * `db.user.table` from its parts, skipping empty ones. A part that is itself dotted is the
 * stored `database.owner.table` form panels carry, and is split the same way.
 */
export const sqlIdentifierPath = (...aParts: unknown[]): string =>
    aParts
        .flatMap((aPart) => String(aPart ?? '').split('.'))
        .map((aPart) => aPart.trim())
        .filter(Boolean)
        .map(sqlIdentifier)
        .join('.');

/** A TQL string literal, quotes included — what goes inside `SQL(…)`, `use(…)`, `named(…)`. */
export const tqlString = (aValue: unknown): string =>
    `"${String(aValue ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')}"`;

/** The `/api/query` GET url for a statement. */
export const sqlQueryUrl = (aSql: string): string => `/api/query?q=${encodeURIComponent(aSql)}`;
