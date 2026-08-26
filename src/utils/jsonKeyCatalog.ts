import { getJsonPathSegments, jsonPathToSqlPath, normalizeJsonPath } from './dashboardJsonValue';

/**
 * Addressing the keys inside a JSON value column.
 *
 * A JSON value is a document, so a tag alone does not name a series — a key has to be picked before
 * there is anything to chart. The keys are not stored or discovered ahead of time: the row the user
 * opened carries its own complete key set, and parsing that row is the whole of it.
 */

/**
 * Human label for a type character, or an empty string when there is nothing worth saying.
 *
 * No `ARRAY`: an array is a container, and the only caller reaches this having already established
 * that the value is not one.
 */
export const jsonKeyTypeLabel = (type: string | undefined): string =>
    type === 'n' ? 'NUMBER' : type === 's' ? 'STRING' : type === 'b' ? 'BOOLEAN' : '';

/**
 * A json path Machbase can follow.
 *
 * The same string the path is handed over as — `$['key']`, the form the Machbase docs use. There is
 * deliberately no second spelling for queries: a receiver that re-parses the path and a database
 * that reads it now agree, which is what lets any key be addressed everywhere.
 */
export const jsonKeyPathToSql = (path: string): string => jsonPathToSqlPath(path);

/**
 * Longest text Tag Analyzer accepts for a value field.
 *
 * A handoff-only limit: querying a longer key is fine, so it is checked when the key is handed over
 * rather than when it is found.
 */
export const TAG_ANALYZER_MAX_JSON_KEY_TEXT = 256;

/** A path in the form Tag Analyzer takes, or the reason it cannot be handed over. */
export const toTagAnalyzerJsonKeyPath = (path: string): { ok: true; path: string } | { ok: false; reason: string } => {
    const normalized = normalizeJsonPath(path);
    if (!normalized) return { ok: false, reason: 'A JSON key is required.' };
    if (normalized.length > TAG_ANALYZER_MAX_JSON_KEY_TEXT) {
        return { ok: false, reason: `JSON key is too long for Tag Analyzer (max ${TAG_ANALYZER_MAX_JSON_KEY_TEXT - 2} characters).` };
    }
    return { ok: true, path: normalized };
};

/**
 * The key a bracket path names, for display.
 *
 * The shared path parser reads quoted segments, so a key containing brackets — an OPC UA node is
 * free to be called `[TEST] RENAME_1`, whose path is `[[TEST] RENAME_1]` — survives the round trip
 * and does not have to be recovered by hand here.
 */
export const jsonKeyPathLabel = (path: string): string => {
    const segments = getJsonPathSegments(path);
    if (segments.length === 0) return '';
    // A nested path reads better dotted; a single key is shown exactly as it is named.
    return segments.length === 1 ? segments[0] : segments.join('.');
};
