import { compareVersions, isValidVersion } from '@/utils/version/utils';

export const TAZ_FORMAT_VERSION = '2.0.0';

export type PersistedTazPanelShape = 'legacy' | 'mapped';

/**
 * Resolves which persisted panel structure a `.taz` file uses from its root version field.
 * Intent: Make the storage format decision explicit at the file boundary instead of inferring it from panel contents.
 * @param {string | undefined} aVersion The optional `.taz` file version.
 * @returns {PersistedTazPanelShape} The persisted panel structure for the file.
 */
export function getPersistedTazPanelShape(
    aVersion: string | undefined,
): PersistedTazPanelShape {
    if (!aVersion || !isValidVersion(aVersion)) {
        return 'legacy';
    }

    return compareVersions(aVersion, TAZ_FORMAT_VERSION) >= 0 ? 'mapped' : 'legacy';
}
