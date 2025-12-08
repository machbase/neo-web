// File extensions that support versioning
export const VERSIONED_EXTENSIONS = ['.sql', '.tql', '.wrk', '.dsh', '.taz'] as const;
export enum E_VERSIONED_EXTENSION {
    SQL = 'SQL',
    TQL = 'TQL',
    WRK = 'WRK',
    DSH = 'DSH',
    TAZ = 'TAZ',
}
export type VERSIONED_EXTENSION_TYPE = keyof typeof E_VERSIONED_EXTENSION;

// Default version for files without version information (legacy files)
const DEFAULT_FILE_VERSION = '1.0.0';
const DSH_NEWEST_VERSION = '1.0.1';
const TAZ_NEWEST_VERSION = '1.0.0';
const WRK_NEWEST_VERSION = '1.0.0';
const TQL_NEWEST_VERSION = '1.0.0';
const SQL_NEWEST_VERSION = '1.0.0';

// Newest version
export const NEWEST_VERSION = {
    DEFAULT: DEFAULT_FILE_VERSION,
    DSH: DSH_NEWEST_VERSION,
    TAZ: TAZ_NEWEST_VERSION,
    WRK: WRK_NEWEST_VERSION,
    TQL: TQL_NEWEST_VERSION,
    SQL: SQL_NEWEST_VERSION,
};

// Version validation pattern (semantic versioning: x.y.z)
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

// Panel version information interface
export interface PanelVersion {
    version: string;
}

// Version change reason enum
export enum VersionChangeReason {
    MAJOR = 'major',
    MINOR = 'minor',
    PATCH = 'patch',
}
