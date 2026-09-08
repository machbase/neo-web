/**
 * The comparison operators a dashboard panel's Filter row offers, and the one it starts on.
 *
 * The list used to live inline in `Filter.tsx` while the *default* lived nowhere: every
 * `Default*TableOption` seeded `operator: ''`, and only `HandleFold` — reachable on tag tables
 * alone — ever wrote a real one. A block that opens expanded (log, view, transaction, `V$_STAT`,
 * Geomap) therefore drew an empty operator select, and `Filter.tsx` could not fall back for it
 * because `??` does not catch `''`.
 *
 * The empty operator was not only a blank control. `changeValueOption` turns a filter on only when
 * column, operator and value are all non-empty, and `UseFilter` puts only those into the WHERE
 * clause — so a filter typed against a blank operator was dropped from the query with nothing said.
 * Hence a normalizer rather than a display fallback: the value the select shows and the value the
 * SQL is built from have to be the same one.
 */
export const FILTER_OPERATORS = ['=', '<>', '>', '>=', '<', '<=', 'in', 'like'] as const;

/**
 * `=` rather than `in`, because it is what the rest of the screen already uses: `addFilter()` seeds
 * a second Filter row with `=`, as does `tagTableValue()`. `in` stays the operator the collapsed
 * (per-tag) path writes, where multi-value is the whole point.
 */
export const DEFAULT_FILTER_OPERATOR = '=';

/** A stored operator, or the default for one a saved board (or an old default) left empty. */
export const normalizeFilterOperator = (aOperator: unknown): string => String(aOperator ?? '').trim() || DEFAULT_FILTER_OPERATOR;
