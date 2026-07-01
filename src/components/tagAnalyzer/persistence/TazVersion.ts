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

const TAZ_VERSION_LOOKUP: Record<string, TazVersion> = Object.values(TazVersion)
    .reduce<Record<string, TazVersion>>((lookup, version) => {
        lookup[version] = version;
        return lookup;
    }, {});

export function isTazVersion(value: unknown): value is TazVersion {
    return typeof value === 'string' && value in TAZ_VERSION_LOOKUP;
}

export function normalizePersistedTazVersion(version: unknown): TazVersion {
    if (version === undefined || version === null) {
        return TazVersion.Legacy;
    }

    const sVersion = String(version).trim();
    if (sVersion === '') {
        return TazVersion.Legacy;
    }

    if (isTazVersion(sVersion)) {
        return sVersion;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${formatPersistedTazVersionForError(version)}`,
    );
}

function formatPersistedTazVersionForError(version: unknown): string {
    return JSON.stringify(version) ?? String(version);
}

// Returns a user-facing warning when a board was loaded from an older .taz
// format that should be re-saved, or undefined when no warning is warranted.
export function getOutdatedTazFormatWarning(
    version: string | undefined,
    panelCount: number,
): string | undefined {
    if (version === TAZ_FORMAT_VERSION) {
        return undefined;
    }

    // A brand-new, empty board has nothing worth migrating.
    if ((version === undefined || version === TazVersion.Legacy) && panelCount === 0) {
        return undefined;
    }

    const sDisplayVersion = version ?? TazVersion.Legacy;
    return `Loaded older TAZ format (${sDisplayVersion}). Current format is ${TAZ_FORMAT_VERSION}. Save the board to update it.`;
}
