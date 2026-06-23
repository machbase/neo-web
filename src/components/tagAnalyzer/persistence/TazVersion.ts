export enum TazVersion {
    Legacy = 'legacy',
    V200 = '2.0.0',
    V201 = '2.0.1',
    V202 = '2.0.2',
    V203 = '2.0.3',
    V204 = '2.0.4',
    V205 = '2.0.5',
    V210 = '2.1.0',
}

export const TAZ_FORMAT_VERSION = TazVersion.V210;

export const SUPPORTED_PERSISTED_TAZ_VERSIONS = [
    TazVersion.V200,
    TazVersion.V201,
    TazVersion.V202,
    TazVersion.V203,
    TazVersion.V204,
    TazVersion.V205,
    TazVersion.V210,
] as const;

const TAZ_VERSION_LOOKUP: Record<string, TazVersion> = Object.values(TazVersion)
    .reduce<Record<string, TazVersion>>((lookup, version) => {
        lookup[version] = version;
        return lookup;
    }, {});

export function isTazVersion(value: unknown): value is TazVersion {
    return typeof value === 'string' && value in TAZ_VERSION_LOOKUP;
}