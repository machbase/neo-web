/**
 * Recent database usage for display in the SQL/worksheet database menu.
 *
 * Only usage timestamps are kept. A tab's execution target is never saved or restored.
 * Older per-file selections in localStorage are deliberately ignored.
 *
 * Nothing here is authoritative. A cleared browser, a private window or a storage quota error
 * degrades to "no memory", which is the same as a first visit — so every read is guarded and every
 * write is best-effort.
 */

const RECENTS_KEY = 'neo-web.sql.target-db.recents';

/** Keep the recents list short enough that the group stays scannable, and the entry small. */
const RECENTS_LIMIT = 5;

const readMap = <T>(aKey: string): Record<string, T> => {
    try {
        const sRaw = localStorage.getItem(aKey);
        if (!sRaw) return {};
        const sParsed = JSON.parse(sRaw);
        return sParsed && typeof sParsed === 'object' && !Array.isArray(sParsed) ? sParsed : {};
    } catch {
        return {};
    }
};

const writeMap = (aKey: string, aValue: Record<string, unknown>) => {
    try {
        localStorage.setItem(aKey, JSON.stringify(aValue));
    } catch {
        // Storage is full or blocked. The chip still works for this session.
    }
};

/** `{ FACTORY_A: 1756704000000 }` — when each database was last picked. */
export const readRecentDatabases = (): Record<string, number> => {
    const sMap = readMap<number>(RECENTS_KEY);
    const sClean: Record<string, number> = {};
    Object.entries(sMap).forEach(([aName, aAt]) => {
        if (typeof aAt === 'number' && Number.isFinite(aAt)) sClean[aName] = aAt;
    });
    return sClean;
};

export const touchRecentDatabase = (aDatabase: string) => {
    if (!aDatabase) return;
    const sMap = readRecentDatabases();
    sMap[aDatabase] = Date.now();
    const sTrimmed = Object.entries(sMap)
        .sort((aLeft, aRight) => aRight[1] - aLeft[1])
        .slice(0, RECENTS_LIMIT);
    writeMap(RECENTS_KEY, Object.fromEntries(sTrimmed));
};

/**
 * "used 4 min ago" — the meta line under a recently used database.
 *
 * Written here rather than borrowed from `elapsedTime` in `@/utils` because the menu wants a space
 * between the number and the unit (`4 min ago`, not `4min ago`), and five other screens already
 * depend on that function's exact wording.
 */
export const formatUsedAgo = (aAt: number, aNow: number = Date.now()): string => {
    const sSeconds = Math.max(0, Math.floor((aNow - aAt) / 1000));
    if (sSeconds < 60) return 'used just now';

    const sMinutes = Math.floor(sSeconds / 60);
    if (sMinutes < 60) return `used ${sMinutes} min ago`;

    const sHours = Math.floor(sMinutes / 60);
    if (sHours < 24) return `used ${sHours} hr ago`;

    const sDays = Math.floor(sHours / 24);
    if (sDays < 30) return `used ${sDays} ${sDays === 1 ? 'day' : 'days'} ago`;

    const sMonths = Math.floor(sDays / 30);
    return `used ${sMonths} ${sMonths === 1 ? 'month' : 'months'} ago`;
};
