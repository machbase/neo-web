// issue #1452 — which icon URL the App Store should try, and in what order.
//
// Split out of PkgIcon.tsx rather than co-located with it: the ordering is the
// entire behaviour worth testing, and keeping it in a plain module means the
// rules can be asserted without rendering React (and keeps PkgIcon.tsx a
// component-only file, which is what react-refresh wants).

/**
 * A `/public/` directory name we are willing to build a URL from.
 *
 * Same intent as `isSafePathSegment` in onpremCatalog.ts: the name reaches here
 * from a merged catalog whose `installed` leg is a raw directory listing of a
 * plain web root, so it must never be able to escape the directory or start a
 * protocol-relative URL.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** True for one path segment that cannot escape `/public/` or start a scheme. */
const isSafeSegment = (segment: string): boolean => !segment.includes('..') && SAFE_SEGMENT.test(segment);

/**
 * The file name assumed when nobody could tell us the real one.
 *
 * THE BUG THIS USED TO BE (issue #1452). It was not a fallback, it was the ONLY
 * behaviour — the path was hardcoded to `icon.png`. Extensions are not uniform on
 * a real server:
 *
 *   /public/neo-pkg-opcua-client/icon.png
 *   /public/neo-pkg-dbus/icon.svg          ← the guess 404s
 *
 * so neo-pkg-dbus rendered the glyph with its icon sitting right there, and in
 * local-only mode there was no remote candidate left to recover with. The real
 * name now travels with the catalog (`installed_icon`, filled by the server-side
 * scan); this constant is only what a card carrying NO scan information falls back
 * to, which is exactly the pre-#1452 behaviour and no worse.
 */
export const DEFAULT_ICON_FILE = 'icon.png';

/**
 * `/public/{name}/{file}`, or undefined when either segment is unusable in a path.
 *
 * BOTH segments are validated with the same rule. `name` comes from a directory
 * listing of a plain web root and `file` from a directory listing of one of its
 * sub-directories — both are attacker-chosen by anyone who can write into
 * `/public/`, and both land in an `<img src>`, so `..`, `/`, `\` and a leading dot
 * are refused on either side.
 */
export const localIconPath = (name?: string, file: string = DEFAULT_ICON_FILE): string | undefined => {
    if (!name || !isSafeSegment(name)) return undefined;
    if (!file || !isSafeSegment(file)) return undefined;
    return `/public/${name}/${file}`;
};

/**
 * Ordered `src` candidates, best first.
 *
 * 1. The installed copy's own icon file. Same origin as the console, so it is
 *    the only candidate that can load on an air-gapped server — and it matches
 *    the version that is actually installed.
 * 2. The catalog entry's icon URL (in practice a raw.githubusercontent link). Kept
 *    because an installed package may simply not ship an icon at all.
 *
 * An empty result is meaningful: a package that is neither installed nor carries
 * an icon URL has nothing to fetch, so the caller renders the fallback glyph with
 * no request at all instead of a broken <img>.
 *
 * @param pAllowRemote - issue #1452. `false` DROPS candidate 2 entirely, for
 *   local-only mode where no request may leave the machine. This is a real
 *   removal, not a reorder: an `<img src>` fires the moment it renders, so the
 *   only way to not make the request is to never hand over the URL. Defaults to
 *   `true`, which is the behaviour every pre-#1452 caller had. Note the distinction
 *   from plain offline mode, where the remote candidate is still WORTH trying —
 *   there the request is merely expected to fail, not forbidden.
 *
 * @param pInstalledIcon - issue #1452. The installed copy's icon FILE NAME as the
 *   server-side scan reported it (`APP_INFO.installed_icon`). THREE-VALUED, and
 *   candidate 1 is decided entirely by it:
 *
 *     'icon.svg'   → `/public/{name}/icon.svg`. The real name, so it loads.
 *     ''           → the scan looked and this package ships NO icon. NO CANDIDATE
 *                    AT ALL: a guess here is a request we already know 404s, on
 *                    every card, on every render of the panel.
 *     undefined    → nothing is known (a card built without a scan, or a scan that
 *                    failed). Falls back to `icon.png`, i.e. the pre-#1452
 *                    behaviour — a guess is better than no icon when the truth is
 *                    simply unavailable.
 *
 *   Ignored entirely when `pInstalled` is false: an icon under `/public/{name}/`
 *   presupposes a `/public/{name}/`.
 */
export const pkgIconSources = (
    pName?: string,
    pIcon?: string,
    pInstalled?: boolean,
    pAllowRemote: boolean = true,
    pInstalledIcon?: string
): string[] => {
    const sources: string[] = [];
    if (pInstalled) {
        // `''` is the ONE value that means "known to have none" — and it is exactly
        // the value a truthiness check would confuse with `undefined`. Compare the
        // type, not the truthiness.
        const known = typeof pInstalledIcon === 'string';
        const file = known ? pInstalledIcon.trim() : DEFAULT_ICON_FILE;
        // A known-empty name yields no candidate; a known non-empty one is still
        // validated (it came off the server's disk, not out of our own code).
        const local = file ? localIconPath(pName, file) : undefined;
        if (local) sources.push(local);
    }
    if (pAllowRemote && typeof pIcon === 'string' && pIcon.trim()) sources.push(pIcon);
    return sources;
};
