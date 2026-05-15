import { compare as semverCompare, valid as semverValid } from 'semver';
import { E_VERSIONED_EXTENSION, NEWEST_VERSION, VERSION_PATTERN, VersionChangeReason, VERSIONED_EXTENSION_TYPE } from './constants';

// NOTE: We intentionally import from the 'semver' main namespace (not 'semver/functions/compare')
// because the repo currently resolves a transitive semver@6.3.1 at runtime, which does not expose
// the v7-style sub-path entry points. The main namespace exports work for both v6 and v7, so we
// keep this form for portability. Once the lockfile is regenerated and semver@7 is hoisted to the
// top level, callers may switch to sub-path imports for smaller bundles.

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

/**
 * Normalizes a package version string to a canonical SemVer form.
 * Trims whitespace, strips a leading `v`, and validates with semver.valid().
 *
 * Used by AppStore PKG update-badge logic. Do NOT use this for dashboard panel
 * migration version comparisons (those rely on the strict 3-segment x.y.z pattern
 * from `VERSION_PATTERN` — see `isValidVersion` / `compareVersions`).
 *
 * @param v - Raw version string (may include leading `v`, prerelease, build metadata)
 * @returns Canonical SemVer string, or null if input is empty, undefined, or non-SemVer
 */
export function normalizePkgVersion(v: string): string | null {
    if (v === undefined || v === null) return null;
    const trimmed = String(v).trim();
    if (trimmed.length === 0) return null;
    const stripped = trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed.slice(1) : trimmed;
    return semverValid(stripped);
}

/**
 * Compares two package versions using full SemVer precedence (including prerelease
 * ordering and build-metadata ignoring per SemVer §11).
 *
 * AppStore PKG version comparison only. For dashboard panel migration, use
 * `compareVersions` from this same file (which enforces strict x.y.z and returns
 * 0 for invalid inputs rather than null).
 *
 * @param installed - Currently installed package version
 * @param latest - Latest available package version
 * @returns -1 if installed < latest, 0 if equal, 1 if installed > latest, or null
 *          if either argument is not a valid SemVer string
 */
export function comparePkgVersions(installed: string, latest: string): -1 | 0 | 1 | null {
    const normInstalled = normalizePkgVersion(installed);
    const normLatest = normalizePkgVersion(latest);
    if (normInstalled === null || normLatest === null) return null;
    return semverCompare(normInstalled, normLatest) as -1 | 0 | 1;
}

// Module-scoped dedup guard so the same (pkg, installed, latest) tuple does not
// flood the console when multiple AppStore components inspect the same package.
const __warnedPkgVersionKeys = new Set<string>();

/**
 * Emits a single console.warn per unique (pkgName, installed, latest) tuple when
 * AppStore decides to hide the update badge because the version strings are not
 * SemVer-comparable. Importing this helper from a single shared module ensures
 * `item.tsx` and `info.tsx` (and any future caller) share one dedup set instead
 * of warning twice for the same package.
 *
 * @param pkgName - Package name for the log line
 * @param installed - Raw installed version string (as observed from package metadata)
 * @param latest - Raw latest version string (as observed from release feed)
 */
export function warnOncePkgVersion(pkgName: string, installed: string, latest: string): void {
    const key = `${pkgName}|${installed}|${latest}`;
    if (__warnedPkgVersionKeys.has(key)) return;
    __warnedPkgVersionKeys.add(key);
    // eslint-disable-next-line no-console
}

/**
 * Strips a single leading `v` (or `V`) from a version string for display purposes.
 * The AppStore UI prepends its own `v` prefix, so we must avoid double-prefixing
 * when the package metadata itself already carries one (e.g. `"v1.0.4-rc.1"`).
 *
 * This is a *display* helper only — it does not validate SemVer and works with any
 * input (returns empty string for null/undefined). For comparison or normalization,
 * use `normalizePkgVersion` / `comparePkgVersions` instead.
 *
 * @param v - Raw version string from package metadata
 * @returns Version string with leading `v`/`V` removed; empty string if v is falsy
 */
export function stripVPrefix(v: string | undefined | null): string {
    if (!v) return '';
    return String(v).replace(/^v/i, '');
}
