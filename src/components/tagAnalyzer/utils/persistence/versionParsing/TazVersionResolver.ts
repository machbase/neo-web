export const TAZ_FORMAT_VERSION = '2.0.0';

export type PersistedTazVersion = typeof TAZ_FORMAT_VERSION;

/**
 * Resolves the only supported persisted `.taz` format version.
 * Intent: Keep TagAnalyzer on one explicit storage contract before production.
 * @param {string | undefined} version The persisted `.taz` version field.
 * @returns {PersistedTazVersion} The current supported `.taz` version.
 */
export function resolvePersistedTazVersion(
    version: string | undefined,
): PersistedTazVersion {
    if (version === TAZ_FORMAT_VERSION) {
        return TAZ_FORMAT_VERSION;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${version ?? 'missing'}`,
    );
}
