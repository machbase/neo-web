import { compareVersions, isValidVersion } from '@/utils/version/utils';

export const TAZ_FORMAT_VERSION = '2.0.7';

export type PersistedTazVersion =
    | 'legacy'
    | '2.0.0'
    | '2.0.1'
    | '2.0.2'
    | '2.0.3'
    | '2.0.4'
    | '2.0.5'
    | '2.0.6'
    | '2.0.7';

/**
 * Resolves the supported persisted `.taz` format version from the root version field.
 * Intent: Make the storage format decision explicit at the file boundary instead of inferring it from panel contents.
 * @param {string | undefined} aVersion The optional `.taz` file version.
 * @returns {PersistedTazVersion} The supported persisted format bucket for the file.
 */
export function resolvePersistedTazVersion(
    aVersion: string | undefined,
): PersistedTazVersion {
    if (!aVersion || !isValidVersion(aVersion)) {
        return 'legacy';
    }

    if (compareVersions(aVersion, '2.0.7') >= 0) {
        return '2.0.7';
    }

    if (compareVersions(aVersion, '2.0.6') >= 0) {
        return '2.0.6';
    }

    if (compareVersions(aVersion, '2.0.5') >= 0) {
        return '2.0.5';
    }

    if (compareVersions(aVersion, '2.0.4') >= 0) {
        return '2.0.4';
    }

    if (compareVersions(aVersion, '2.0.3') >= 0) {
        return '2.0.3';
    }

    if (compareVersions(aVersion, '2.0.2') >= 0) {
        return '2.0.2';
    }

    if (compareVersions(aVersion, '2.0.1') >= 0) {
        return '2.0.1';
    }

    if (compareVersions(aVersion, '2.0.0') >= 0) {
        return '2.0.0';
    }

    return 'legacy';
}
