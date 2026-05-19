const ROLLUP_VERSION_STORAGE_KEY = 'V$ROLLUP_VER';

export function getConfiguredRollupVersion(): string | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    return localStorage.getItem(ROLLUP_VERSION_STORAGE_KEY);
}
