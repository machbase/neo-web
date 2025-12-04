import { E_VERSIONED_EXTENSION, NEWEST_VERSION, VERSION_PATTERN, VersionChangeReason, VERSIONED_EXTENSION_TYPE } from './constants';

/**
 * Validates if a version string follows semantic versioning format (x.y.z)
 * @param version - Version string to validate
 * @returns true if valid semantic version format, false otherwise
 */
export function isValidVersion(version: string): boolean {
    return VERSION_PATTERN.test(version);
}

/**
 * Compares two version strings
 * @param v1 - First version string
 * @param v2 - Second version string
 * @returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
    // Validate both versions
    if (!isValidVersion(v1) || !isValidVersion(v2)) return 0;

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }

    return 0;
}

/**
 * Determines the version change reason by comparing two versions
 * @param fromVersion - Original version
 * @param toVersion - Target version
 * @returns VersionChangeReason enum indicating the type of change
 */
export function getVersionChangeReason(fromVersion: string, toVersion: string): VersionChangeReason {
    if (!isValidVersion(fromVersion) || !isValidVersion(toVersion)) {
        return VersionChangeReason.PATCH;
    }

    const [major1, minor1, patch1] = fromVersion.split('.').map(Number);
    const [major2, minor2, patch2] = toVersion.split('.').map(Number);

    if (major2 > major1) return VersionChangeReason.MAJOR;
    if (minor2 > minor1) return VersionChangeReason.MINOR;
    if (patch2 > patch1) return VersionChangeReason.PATCH;
    return VersionChangeReason.PATCH;
}

/**
 * Gets the default version for a file based on its extension
 * @param extension - File extension (e.g., 'sql', 'dsh')
 * @returns Default version string
 */
export function getDefaultVersionForExtension(extension: VERSIONED_EXTENSION_TYPE): string {
    // Currently all extensions use the same default version
    // This can be customized per extension if needed in the future
    return NEWEST_VERSION[extension?.toUpperCase() as VERSIONED_EXTENSION_TYPE];
}

/**
 * Migrate To Newest version
 * @param panel
 * @param fromVersion
 * @returns
 */
export function migrateToNewest(extension: VERSIONED_EXTENSION_TYPE, fromVersion: string, panel: any): any {
    let migratedPanel = JSON.parse(JSON.stringify(panel));

    switch (extension?.toUpperCase()) {
        case E_VERSIONED_EXTENSION.DSH:
            if (compareVersions(fromVersion, NEWEST_VERSION.DSH) < 0) migratedPanel = dshMig(migratedPanel);
            break;
        case E_VERSIONED_EXTENSION.TAZ:
            if (compareVersions(fromVersion, NEWEST_VERSION.TAZ) < 0) migratedPanel = tazMig(migratedPanel);
            break;
        case E_VERSIONED_EXTENSION.WRK:
            if (compareVersions(fromVersion, NEWEST_VERSION.WRK) < 0) migratedPanel = wrkMig(migratedPanel);
            break;
        case E_VERSIONED_EXTENSION.TQL:
            if (compareVersions(fromVersion, NEWEST_VERSION.TQL) < 0) migratedPanel = tqlMig(migratedPanel);
            break;
        case E_VERSIONED_EXTENSION.SQL:
            if (compareVersions(fromVersion, NEWEST_VERSION.SQL) < 0) migratedPanel = sqlMig(migratedPanel);
            break;
    }
    return migratedPanel;
}

function dshMig(panel: any) {
    return panel;
}

function tazMig(panel: any) {
    return panel;
}

function wrkMig(panel: any) {
    return panel;
}

function tqlMig(panel: any) {
    return panel;
}

function sqlMig(panel: any) {
    return panel;
}

/**
 * Gets version from object by key, returns default version if key not found
 * @param versionObject - Object containing version keys and values
 * @param defaultVersion - Default version to return if key not found (defaults to DEFAULT)
 * @returns Version value if key exists, otherwise default version
 */
export function getVersionByKey(versionObject: Record<string, string>, defaultVersion: string = NEWEST_VERSION.DEFAULT): string {
    // Return the value if key exists, otherwise return default version
    return versionObject?.['version'] || defaultVersion;
}
