export const TAZ_FORMAT_VERSION = '2.0.0';

export type PersistedTazVersion = typeof TAZ_FORMAT_VERSION;

/**
 * Resolves the only supported persisted `.taz` format version.
 * Intent: Keep TagAnalyzer on one explicit storage contract before production.
 * @param {string | undefined} aVersion The persisted `.taz` version field.
 * @returns {PersistedTazVersion} The current supported `.taz` version.
 */
export function resolvePersistedTazVersion(
    aVersion: string | undefined,
): PersistedTazVersion {
    if (aVersion === TAZ_FORMAT_VERSION) {
        return TAZ_FORMAT_VERSION;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${aVersion ?? 'missing'}`,
    );
}
