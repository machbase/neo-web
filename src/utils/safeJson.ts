/**
 * `JSON.stringify` that answers undefined instead of throwing.
 *
 * Serializing nests one call per level, so a document a few thousand levels deep overflows the
 * engine's call stack — measured: Chrome 153 gives up at 5,118 levels once indentation is asked
 * for, Firefox 155 at 3,773 levels either way. `JSON.parse` takes the same document a million
 * levels deep without complaint, so "it parsed" says nothing about "it can be printed back".
 *
 * Callers that only want to show the value fall back to the text they already have, which is why
 * this answers rather than throws.
 */
export const stringifyJsonSafely = (aValue: unknown, aSpace?: number | string): string | undefined => {
    try {
        return JSON.stringify(aValue, null, aSpace);
    } catch {
        return undefined;
    }
};

/** Why a JSON format control is disabled for a value `stringifyJsonSafely` could not indent. */
export const JSON_TOO_DEEP_TO_FORMAT = 'Nested too deeply to format as JSON';
