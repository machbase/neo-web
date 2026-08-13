// issue #1452 — App Store offline (air-gapped) support: the LOCAL ARCHIVE leg.
//
// The catalog is the name-keyed merge of
//   hub  ∪  local archives  ∪  installed packages (/public/{name}).
// This module owns the middle leg: which package archives are sitting on the
// server right now and can be installed with no network.
//
// ---------------------------------------------------------------------------
// `onprem.json` IS DEAD. `package.json` IS THE SINGLE SOURCE OF TRUTH.
// ---------------------------------------------------------------------------
// The first design invented an `onprem.json` manifest and required every archive
// to carry one. No archive that exists carries one. Measured against the real
// `/public/neo-pkg-dbus.zip` on machbase-neo v8.5.10-snapshot:
//
//   root entry           neo-pkg-dbus-main     ← {repo}-{branch}, NOT the pkg name
//   onprem.json          absent
//   package.json         THREE of them:
//                          neo-pkg-dbus-main/package.json           ← the only one
//                          neo-pkg-dbus-main/cgi-bin/package.json
//                          neo-pkg-dbus-main/frontend/package.json
//   root package.json    { name: "neo-pkg-dbus", version: "1.0.0",
//                          description: "...", minServerVersion: "8.5.6" }
//
// These archives are GitHub source archives (`Download ZIP` / the codeload
// tarball), and that is what they will keep being. FOUR CONTAINERS ARE READ:
// `.zip`, `.tar`, `.tar.gz` and `.tgz` — `.tgz` IS `.tar.gz`, one code path. They
// differ only inside `readArchiveEntries` (archiveScript.ts); everything below
// this line is format-blind. `.tar.bz2` / `.tar.xz` / `.tar.zst` CANNOT be read
// (the runtime has gzip/deflate and nothing else) and are reported as errors
// rather than skipped, so a user who drops one in learns why no card appeared.
// So:
//   * the meta is read from the ROOT `package.json` and nowhere else — a nested
//     one describes a sub-project (`cgi-bin`, `frontend`) and would name the card
//     after the wrong thing;
//   * the ROOT DIRECTORY NAME IS NOT THE PACKAGE NAME and must never be compared
//     against one (`neo-pkg-dbus-main` vs `neo-pkg-dbus`);
//   * `description` is OPTIONAL — the installed neo-pkg-opcua-client (1.0.8) and
//     neo-pkg-replication (1.0.6) both ship without one — so a card must build
//     from `{ name, version, minServerVersion }` alone;
//   * the server floor is spelled `minServerVersion` in package.json and
//     `minServer` everywhere on the hub/card side. This module is where the two
//     names meet.
//
// ---------------------------------------------------------------------------
// THE ZIPS ARE INVISIBLE TO THE FILE API. DO NOT LIST THEM WITH `getFiles`.
// ---------------------------------------------------------------------------
// Measured on machbase-neo v8.5.10-snapshot, same directory, two ways:
//
//   SHELL  ls -l /work/_ziptest    → neo-pkg-demo-9.9.9.zip (462B), note.txt
//   GET    /api/files/_ziptest/    → note.txt
//
// `/api/files` filters its directory listing through an extension allowlist.
// Visible:  css csv html jpg js json md png sh svg txt
// Hidden:   zip tar gz tgz bin dat yaml yml log pdf xml pem
// (the decision is made on the LAST extension — `f.zip.json` shows up).
//
// The first implementation of this file cross-checked an `index.json` against
// a listing of the archive directory; that listing is ALWAYS empty of `.zip`, so every
// entry was discarded and the offline catalog was permanently 0 entries. The
// unit tests mocked `getFiles`, so they happily agreed with the broken code.
// If you are about to reintroduce a file-api directory listing here: it cannot
// see the archives. There is no query parameter for it.
//
// What CAN see them is TQL `SCRIPT("js", …)`, which runs server-side with a real
// `fs`: `fs.readdirSync` returned 24 entries where `/api/files` returned 13.
// So the scan below runs there, and `require('archive/zip')` reads each zip's
// root `package.json` straight out of the archive — no extraction, no temp files.
//
// THE ZIP IS THE TRUTH. There is no index.json anymore: it was a packaging-time
// snapshot that nobody rewrites when a zip is dropped in or deleted by hand, and
// keeping it meant the catalog could advertise an archive that is not there (or
// hide one that is).
//
// NO CHECKSUM GATE EXISTS AND NONE CAN BE ADDED — do not re-investigate. The JSH
// runtime has no hashing primitive: `crypto` exposes only
// [generateAuthKeyPair, generateX509Certificate, writeHostFile], `zlib` only
// compresses, and there is no `hash` / `encoding` module at all. The integrity
// gate that DOES run is structural, in `pkgLifecycle/steps/archiveExtract.ts`:
// exactly one root directory, a root `package.json`, and
// `package.json.name === <the package the card is for>`.

import { getFileList } from '@/api/repository/api';
import { ARCHIVE_SCRIPT_PRELUDE } from '@/components/side/AppStore/pkgLifecycle/archiveScript';
import { runScript } from '@/components/side/AppStore/pkgLifecycle/script';
import { comparePkgVersions, type PkgVersionInfo } from '@/utils/version/utils';
import { mapHubEntry, type APP_INFO, type PkgHubEntry } from './appStore';

/**
 * THE ARCHIVE DIRECTORY IS NOT NAMED ON THIS SIDE OF THE WIRE — deliberately.
 *
 * It is a literal inside `ARCHIVE_SCRIPT_PRELUDE` (`/work/public/`), shared by
 * the scan below and by the extraction script. There used to be an `ARCHIVE_DIR`
 * / `ARCHIVE_WORK_DIR` pair here whose value travelled to the script as a `dir`
 * param and whose joined paths travelled back to the browser; nothing needs
 * either. The browser-side spelling of the same directory still appears in
 * `readLocalReadme` (`/public/{name}/README.md`), which reads an INSTALLED
 * package's tree over the file api — a different thing from the zips.
 */

/**
 * A local-archive catalog entry, i.e. one zip's root `package.json` lifted into
 * the hub's entry shape.
 *
 * Deliberately an alias of the hub entry rather than a parallel interface: the
 * merge feeds hub entries and local entries through the *same* `mapHubEntry`, so
 * the two shapes must not be allowed to drift. Widening this alias into its own
 * copy of the fields is how `description` silently goes missing — see the
 * comment on `mapHubEntry` in appStore.ts.
 */
export type LocalPkgEntry = PkgHubEntry;

/** One scanned archive: its root `package.json` plus the file that carried it. */
export interface LocalArchiveEntry extends LocalPkgEntry {
    /**
     * File NAME of the archive, e.g. `neo-pkg-foo.zip` / `neo-pkg-foo.tar.gz` —
     * never a path. Kept for display and for duplicate diagnostics only: the
     * install no longer takes a path from the browser, it re-finds the archive by
     * `name` + `version` server-side (see `archiveScript.ts`).
     */
    archive: string;
    /**
     * Server floor for THIS archive's version — the root package.json's
     * `minServerVersion`, renamed on the way in (the scan does the renaming) to
     * the `minServer` spelling every consumer downstream uses. Absent when the
     * package.json states no floor, which reads as "no constraint".
     */
    minServer?: string;
}

/**
 * One archive that could not be read.
 *
 * A corrupt or foreign archive must cost exactly itself: the scan reports it here
 * and keeps every other archive. This is also where a RECOGNISED but unopenable
 * compression lands (`.tar.bz2` / `.tar.xz` / `.tar.zst`) — reported rather than
 * skipped, because a file that silently produces no card is unexplainable from
 * the UI. An EMPTY `archive` means the scan as a whole failed (TQL unreachable,
 * script error) rather than one file.
 */
export interface LocalArchiveScanError {
    archive: string;
    error: string;
}

/** Raw result of {@link scanLocalArchives}. */
export interface LocalArchiveScan {
    archives: LocalArchiveEntry[];
    errors: LocalArchiveScanError[];
    /**
     * `/public/.pkg-conf.json` says `{ "localOnly": true }` (issue #1452).
     *
     * A DELIBERATE POLICY, not a failure: the operator has turned the external
     * package hub off for this server. Every other outcome — no file, a typo'd
     * key, `false`, malformed json, a failed scan — is `false`, i.e. online.
     * See `readLocalOnlyFlag` in `archiveScript.ts` for why the rule is exactly
     * one strict comparison and nothing else.
     */
    localOnly: boolean;
    /**
     * `{ "<installed package>": "<icon file name>" }` — issue #1452.
     *
     * THREE-VALUED, AND ALL THREE MATTER:
     *   `{ 'neo-pkg-dbus': 'icon.svg' }`  this package's icon is that file
     *   key ABSENT from a present map     this package has NO icon — do not fetch
     *   the whole field `undefined`       the scan did not say (older script body,
     *                                     or a scan that failed) — fall back to the
     *                                     historical `icon.png` guess
     *
     * Collapsing the last two would either resurrect the 404 this fixes or blank
     * the icon of every package on a server whose scan is one build behind. Values
     * are FILE NAMES, never paths; the URL is built (and the name re-validated)
     * browser-side in `pkgIconSource.ts`.
     */
    installedIcons?: Record<string, string>;
    /**
     * `{ "<installed directory>": "<its package.json name>" }` — issue #1452.
     *
     * A KEY EXISTS ONLY WHEN THE DIRECTORY ANSWERED. No package.json, an
     * unreadable one, malformed json, a manifest without `name`: NO KEY, and every
     * consumer must leave that directory exactly as it treated it before this field
     * existed (an interrupted `pkg copy` still needs its card to uninstall itself
     * with). `undefined` for the whole field is an older script body.
     *
     * Superseded by {@link LocalArchiveScan.installedDirs}, which carries the same
     * answer plus the version, the description and the `.git` bit. Kept because the
     * envelope is a wire format an older bundle still writes — see
     * {@link normalizeInstalledDirs}, which falls back to it.
     */
    installedNames?: Record<string, string>;
    /**
     * `{ "<installed directory>": { name, version, description, git } }` — issue #1452.
     *
     * ALWAYS PRESENT, empty when the scan said nothing. Unlike the two maps above
     * there is no three-valued reading to preserve: the only consumer
     * (`classifyInstalledDir`) treats an absent entry as "no information", which is
     * exactly what an empty map produces for every directory.
     *
     * A KEY EXISTS ONLY WHEN THE DIRECTORY ANSWERED with a package.json carrying a
     * `name`. No package.json, an unreadable one, malformed json, a manifest without
     * `name`: NO KEY — an interrupted `pkg copy` must keep behaving exactly as it did
     * before this field existed (its card is the only way to clean it up).
     */
    installedDirs: Record<string, InstalledDirInfo>;
}

/**
 * What one `/public/` directory's own package.json says about itself, plus whether
 * the directory is a git working clone (issue #1452).
 *
 * FACTS ONLY. Whether the directory is a proper install, a hand-unpacked archive,
 * a developer's clone or somebody else's work directory is NOT decided here — see
 * `classifyInstalledDir` (components/side/AppStore/strayDirs.ts), which is the one
 * place that rule lives.
 */
export interface InstalledDirInfo {
    /** package.json `name`. Non-empty by construction — no key exists otherwise. */
    name: string;
    /** package.json `version`. Optional in the file, so optional here. */
    version?: string;
    /** package.json `description`. Optional in the file (both real packages omit it). */
    description?: string;
    /**
     * A `.git` entry exists in the directory.
     *
     * THREE-VALUED. `undefined` means the scan could not ask (an older script body,
     * or a runtime with no `fs.existsSync`) and must be read as "not known" — never
     * as `false`. The Remove action is offered only on an explicit `false`, because
     * deleting a developer's working clone destroys uncommitted work.
     */
    git?: boolean;
}

/**
 * The scan, run by TQL `SCRIPT("js", …)` on the server.
 *
 * TAKES NO PARAMETERS AT ALL. The directory it walks is a literal inside
 * {@link ARCHIVE_SCRIPT_PRELUDE}, and the records it emits carry the archive
 * FILE NAME and never a path. So there is no user-controlled value anywhere in
 * this round trip — the `dir` param this used to take (and the `dir` validation
 * question that came with it) simply has nowhere to enter. Script bodies must
 * stay constant regardless; see the header of `pkgLifecycle/script.ts`.
 *
 * Emits ONE row: the JSON array of results. Every failure is data, never a
 * throw — a throw here would collapse the whole scan into "no archives", which
 * is exactly the silent-empty-catalog failure this rewrite is fixing.
 *
 * DUPLICATE name+version IS REFUSED, NOT RESOLVED. Two archives claiming the same
 * package at the same version become two `{ archive, error }` records and NO
 * version row. Picking one silently would (a) leave the user unable to tell
 * which file is about to be installed and (b) let the catalog display one file
 * while the extract step matches another. `getLastArchiveScanErrors()` surfaces
 * the collision instead.
 *
 * EXPORTED so `onpremCatalog.test.ts` can execute this source in a sandbox with
 * a faked `fs` / `archive/zip` / `archive/tar` / `zlib`. The ArrayBuffer bug in
 * `toText` was invisible to every test that only asserted on the TypeScript side
 * of the seam.
 */
export const SCAN_SCRIPT = `${ARCHIVE_SCRIPT_PRELUDE}
// The scan's own layer on top of the shared prelude: reject name+version
// collisions. \`matchArchives\` is the SAME function the extract script uses to
// find the zip to open, so "exactly one match" means the same thing on both
// sides — a version row exists here only if the installer would find that one
// file and no other.
function scanReport() {
    var records = scanArchives();
    var out = [];

    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        // Already a failure, or not matchable at all (no name/version): pass it
        // through and let the TS side report it as incomplete.
        if (r.error || !r.name || !r.version) {
            out.push(r);
            continue;
        }

        var siblings = matchArchives(records, r.name, r.version);
        if (siblings.length > 1) {
            out.push({
                archive: r.archive,
                error: "duplicate " + r.name + " " + r.version + " in " + archiveNames(siblings) +
                       " (package.json decides the version, not the file name)"
            });
            continue;
        }

        // NO PATH IN THE OUTPUT — the file name is for display/diagnostics only.
        out.push({
            archive: r.archive,
            name: r.name,
            version: r.version,
            minServer: r.minServer,
            description: r.description
        });
    }
    return out;
}

// THE ENVELOPE, NOT A BARE ARRAY (issue #1452, local-only mode).
//
// \`.pkg-conf.json\` lives in the SAME directory this scan already walks, so reading
// it here costs ZERO extra round trips — and, more importantly, the policy flag and
// the archive list arrive as one atomic answer that cannot disagree with itself.
//
// The old shape was the bare array. \`parseArchiveScan\` still accepts it (see
// \`collectScanPayload\`), so an older cached script body or a hand-run scan keeps
// working and simply reads as localOnly: false.
//
// \`installedIcons\` rides along for the same reason (issue #1452): the icon file
// names are read out of the directory this scan is already walking, so the browser
// never has to guess an extension and never fires a request at a file that is not
// there. An envelope WITHOUT the key is the older script body, and is read as
// "unknown" — not as "no package has an icon". See \`pkgIconSources\`.
//
// \`installedNames\` rides along on the SAME walk (issue #1452): what each installed
// directory's own package.json calls itself. A directory whose name and package
// name disagree was unpacked BY HAND — see \`classifyInstalledDir\`
// (components/side/AppStore/strayDirs.ts), which owns the whole rule.
//
// \`installedDirs\` is that same walk's FULL answer — name + version + description +
// whether the directory holds a \`.git\` — and is what the classification actually
// reads. \`installedNames\` is kept beside it ON PURPOSE: it is the field older
// browser bundles parse, and an envelope is a wire format. Never remove one to
// "derive" it from the other.
//
// THE WHOLE DOCUMENT IS ONE YIELD, AND THE FAILURE PATH YIELDS TOO. A throw out of
// here would reach the browser as success + zero rows (measured — see
// \`runScript\`), i.e. as a server with no archives, which is the silent-empty-
// catalog failure this module exists to prevent. \`failScript\` turns it into a
// reason instead.
try {
    var installed = scanInstalled();
    $.yield(JSON.stringify({
        localOnly: readLocalOnlyFlag(),
        archives: scanReport(),
        installedIcons: installed.icons,
        installedNames: installed.names,
        installedDirs: installed.dirs
    }));
} catch (e) {
    failScript("archive scan failed: " + (e && e.message ? e.message : e));
}
`;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * A `github` block with every field present but empty.
 *
 * REQUIRED, not defensive: a package.json has no github block at all, so EVERY
 * local entry gets this one. The merge maps local entries through `mapHubEntry`,
 * which dereferences `entry.github.*` unconditionally, and `github.description`
 * in particular is what the App Store search filter calls `.toLowerCase()` on
 * with no guard. Returned as a fresh object per call — a shared constant would
 * be aliased into every entry.
 */
export const emptyGithub = (): PkgHubEntry['github'] => ({
    organization: '',
    repo: '',
    full_name: '',
    html_url: '',
    default_branch: '',
    language: '',
    license: null,
    stargazers_count: 0,
    forks_count: 0,
});

/**
 * Validate ONE scanned archive record (a root `package.json` + its file name).
 *
 * The array-shaped `index.json` parser this replaces is gone: there is no index
 * file any more, so the only thing left to validate is a single entry produced
 * by the scan. NEVER THROWS; `null` means "not usable as a catalog entry".
 */
export const normalizeArchiveEntry = (item: unknown): LocalArchiveEntry | null => {
    if (!isPlainObject(item)) return null;
    // The three fields without which the entry cannot be acted on: it cannot be
    // keyed into the merge (name), compared for updates (version), or installed
    // (archive). Everything else gets a safe default below.
    if (!isNonEmptyString(item.name) || !isNonEmptyString(item.version) || !isNonEmptyString(item.archive)) return null;
    return {
        ...(item as unknown as LocalArchiveEntry),
        // `description` IS OPTIONAL IN package.json — neo-pkg-opcua-client and
        // neo-pkg-replication both ship without one. It feeds `github.description`,
        // which the App Store search filter calls `.toLowerCase()` on
        // unconditionally, so the empty-string default is what keeps a
        // description-less package from throwing on the first keystroke.
        description: typeof item.description === 'string' ? item.description : '',
        github: isPlainObject(item.github) ? (item.github as unknown as PkgHubEntry['github']) : emptyGithub(),
        // `minServerVersion` in the file, `minServer` from here on (the scan does
        // the rename). This is what `computeEligibility` reads.
        minServer: isNonEmptyString(item.minServer) ? item.minServer : undefined,
    };
};

/** What {@link collectScanPayload} recovers from the script's stdout. */
interface ScanPayload {
    records: unknown[];
    localOnly: boolean;
    /** `undefined` ⇒ the script did not report icons at all. See {@link LocalArchiveScan}. */
    installedIcons?: Record<string, string>;
    /** `undefined` ⇒ the script did not report installed package names at all. */
    installedNames?: Record<string, string>;
    /** `undefined` ⇒ the script did not report the full installed manifests at all. */
    installedDirs?: Record<string, InstalledDirInfo>;
}

/**
 * Keep the `{ key: value }` pairs that are two non-empty strings, drop the rest.
 *
 * Shared by `installedIcons` (pkg → icon file name) and `installedNames`
 * (directory → package.json name), which have the same shape AND the same
 * three-valued reading; a second copy would let the two drift.
 *
 * Returns `undefined` for anything that is not an object, so a garbled field reads
 * as "the scan did not say" rather than as "no package has an icon" — the same
 * distinction the whole field is built around. An object that survives with zero
 * usable pairs stays an EMPTY MAP, because "the scan looked and found none" is a
 * real answer and must not degrade into the `icon.png` guess.
 *
 * The names are NOT path-checked here: that guard belongs where the URL is built
 * (`pkgIconSource.ts`), which is also where a name arriving by any other route
 * gets it. Duplicating it here would let the two copies drift.
 */
const normalizeNameMap = (value: unknown): Record<string, string> | undefined => {
    if (!isPlainObject(value)) return undefined;
    const out: Record<string, string> = {};
    for (const [name, file] of Object.entries(value)) {
        if (!isNonEmptyString(name) || !isNonEmptyString(file)) continue;
        out[name] = file;
    }
    return out;
};

/**
 * Pull the JSON records — and the local-only flag — out of whatever the script
 * printed.
 *
 * TWO SHAPES ARE ACCEPTED, ON PURPOSE:
 *
 *   { localOnly, archives: [...] }   the current envelope
 *   [ ... ]                          the ORIGINAL bare array
 *
 * The bare array reads as `localOnly: false`, i.e. online — the behaviour that
 * shape always had. Keeping it is not politeness: `SCAN_SCRIPT` is a string
 * shipped inside the bundle, and a browser holding a cached older build (or an
 * operator re-running the scan by hand) must not turn a parse mismatch into an
 * empty catalog, which is the exact silent-empty-panel failure this whole module
 * was written to stop.
 *
 * The script yields one row holding the whole document, but `runScript` joins rows
 * with `\n` and a future change (or a stray `$.yield`) could add lines, so a
 * line-by-line fallback is applied before giving up. Non-JSON lines are ignored
 * rather than fatal.
 */
const collectScanPayload = (log: unknown): ScanPayload => {
    const out: ScanPayload = { records: [], localOnly: false };
    if (typeof log !== 'string') return out;
    const text = log.trim();
    if (!text) return out;

    const push = (value: unknown) => {
        if (Array.isArray(value)) {
            out.records.push(...value);
            return;
        }
        if (!isPlainObject(value)) return;
        // The envelope. Recognised by EITHER key so a scan that answers
        // `{ localOnly: true }` with no archives at all is still read as policy
        // rather than mistaken for one malformed archive record.
        if (Array.isArray(value.archives) || 'localOnly' in value) {
            if (Array.isArray(value.archives)) out.records.push(...value.archives);
            // Strictly `=== true`, mirroring the server-side rule: anything else
            // (missing, "true", 1, false) is online.
            if (value.localOnly === true) out.localOnly = true;
            // ABSENT stays `undefined` — an envelope from an older script body has
            // no opinion about icons, and must not be read as "there are none".
            if ('installedIcons' in value) out.installedIcons = normalizeNameMap(value.installedIcons);
            if ('installedNames' in value) out.installedNames = normalizeNameMap(value.installedNames);
            if ('installedDirs' in value) out.installedDirs = normalizeInstalledDirs(value.installedDirs);
            return;
        }
        out.records.push(value);
    };

    try {
        push(JSON.parse(text));
        return out;
    } catch {
        /* not one JSON document — try line by line */
    }
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            push(JSON.parse(trimmed));
        } catch {
            /* log noise, not a record */
        }
    }
    return out;
};

// ---------------------------------------------------------------------------
// WHAT EACH /public/ DIRECTORY SAYS ABOUT ITSELF (issue #1452)
// ---------------------------------------------------------------------------
// A user who unpacks `neo-pkg-foo.tar.gz` by hand ends up with
// `/public/neo-pkg-foo-main/` — the archive's own root, `{repo}-{branch}`. That
// directory is NOT dead: `/public/` is statically served, so its `cgi-bin/` answers
// requests (measured: `neo-pkg-opcua-client-main/cgi-bin/api/health` → 200). Only
// `scripts.install` never ran, so nothing is registered as a service. It is an
// UNMANAGED COPY, not a leftover — which is why it now gets a card of its own
// instead of a line in the warning list.
//
// THIS MODULE ONLY REPORTS FACTS. Which directory is a proper install, a hand-
// unpacked archive, a developer's clone or somebody else's work directory is
// decided by `classifyInstalledDir` (components/side/AppStore/strayDirs.ts) —
// one rule, in one place, next to the catalog that supplies the "is this a name
// any catalog knows?" half of it. The maps below are its input.
//
// The install path itself cannot produce a mismatched directory: it renames to
// `/public/<package.json name>` and verifies the name first (archiveExtract.ts),
// and `pkg copy` copies into a directory named after the package too.

/**
 * `{ directory: { name, version, description, git } }` out of whatever the script
 * printed. `undefined` when the field was not reported at all, so the caller can
 * tell "the scan said nothing" from "the scan looked and found no directories".
 */
export const normalizeInstalledDirs = (value: unknown): Record<string, InstalledDirInfo> | undefined => {
    if (!isPlainObject(value)) return undefined;
    const out: Record<string, InstalledDirInfo> = {};
    for (const [dir, info] of Object.entries(value)) {
        if (!isNonEmptyString(dir) || !isPlainObject(info)) continue;
        // `name` is the one field without which the entry says nothing at all: the
        // whole classification is "does the directory name agree with it?".
        if (!isNonEmptyString(info.name)) continue;
        const entry: InstalledDirInfo = { name: info.name };
        if (isNonEmptyString(info.version)) entry.version = info.version;
        if (typeof info.description === 'string' && info.description) entry.description = info.description;
        // STRICTLY BOOLEAN. A string "false" or a missing key must not be coerced —
        // see the three-valued rule on `InstalledDirInfo.git`.
        if (typeof info.git === 'boolean') entry.git = info.git;
        out[dir] = entry;
    }
    return out;
};

/**
 * The same map, recovered from the NAMES-ONLY field an older script body reports.
 *
 * A cached bundle (or a hand-run scan) emits `installedNames` and no
 * `installedDirs`, and a directory we can still name is worth a card. What is
 * missing there is the `git` bit — so every entry reads as "not known" and
 * therefore NOT removable. The fallback can never turn a developer's working clone
 * into a Remove button, which is the one mistake this whole triage exists to avoid.
 */
export const dirsFromInstalledNames = (installedNames?: Record<string, string>): Record<string, InstalledDirInfo> => {
    const out: Record<string, InstalledDirInfo> = {};
    for (const [dir, name] of Object.entries(installedNames ?? {})) {
        if (!isNonEmptyString(dir) || !isNonEmptyString(name)) continue;
        out[dir] = { name };
    }
    return out;
};

/** Split the script's output into usable entries, per-archive failures and the policy flag. */
export const parseArchiveScan = (log: unknown): LocalArchiveScan => {
    const archives: LocalArchiveEntry[] = [];
    const errors: LocalArchiveScanError[] = [];
    const payload = collectScanPayload(log);

    for (const record of payload.records) {
        if (!isPlainObject(record)) continue;
        if (isNonEmptyString(record.error)) {
            errors.push({ archive: isNonEmptyString(record.archive) ? record.archive : '', error: record.error });
            continue;
        }
        const entry = normalizeArchiveEntry(record);
        if (entry) archives.push(entry);
        else if (isNonEmptyString(record.archive)) errors.push({ archive: record.archive, error: 'incomplete package.json (name/version missing)' });
    }

    // NO DIRECTORY WARNING IS FILED HERE ANY MORE (issue #1452). A mismatched
    // directory used to become a line in the warning list unconditionally. It now
    // becomes a CARD instead — and the one case that still deserves a warning
    // (a directory whose name has nothing to do with the package inside it, e.g.
    // the backend's `stage/`) cannot be judged from this side: the rule's first
    // clause is "does any catalog know this name?", and no catalog is in scope
    // here. `buildCatalog` appends those, next to the classification that decides
    // them. This function stays a parser.
    return {
        archives,
        errors,
        localOnly: payload.localOnly,
        installedIcons: payload.installedIcons,
        installedNames: payload.installedNames,
        installedDirs: payload.installedDirs ?? dirsFromInstalledNames(payload.installedNames),
    };
};

/**
 * Scan the archive directory server-side and return one record per archive.
 *
 * NO PARAMETERS: the directory lives in the script source. See {@link SCAN_SCRIPT}.
 *
 * NEVER THROWS. A server with no such directory, no TQL, or an outright script
 * failure answers "no local archives" — which is the normal state of an online
 * install, not an error worth failing the catalog over.
 *
 * A FAILED SCAN IS ALWAYS `localOnly: false`. The flag is a permission to STOP
 * talking to the hub, and a scan that did not run has not established that
 * permission — failing closed here would let a TQL hiccup masquerade as an
 * air-gap policy and quietly hide the whole hub catalog.
 */
export const scanLocalArchives = async (): Promise<LocalArchiveScan> => {
    try {
        const res = await runScript(SCAN_SCRIPT, {});
        // A whole-scan failure is reported with an empty `archive` so a caller
        // can tell "nothing is archived here" from "the scan itself broke".
        if (!res.ok) return { archives: [], errors: [{ archive: '', error: res.reason }], localOnly: false, installedDirs: {} };
        return parseArchiveScan(res.log);
    } catch (e) {
        // `installedIcons` stays absent on both failure paths, which is what makes a
        // broken scan fall back to the historical `icon.png` instead of announcing
        // that no installed package has an icon. `installedDirs` is empty for the
        // matching reason: a scan that did not run has judged nobody, so no directory
        // is reclassified and the catalog behaves exactly as it did before.
        return {
            archives: [],
            errors: [{ archive: '', error: e instanceof Error ? e.message : 'archive scan failed' }],
            localOnly: false,
            installedDirs: {},
        };
    }
};

/**
 * True when `segment` is a plain file/directory name that can be pasted after a
 * fixed directory prefix without escaping it.
 *
 * The values that reach a path are read off the disk (the archive file name, the
 * package name inside the root `package.json`) and are therefore untrusted —
 * anyone who can write into the archive directory picks them. `..%2F`-style
 * segments survive `normalizePath` (which only collapses duplicate slashes)
 * straight into a url or a TQL path: `/public/{name}/README.md` here,
 * `/work/public/{name}` in the extraction step. Rejecting separators and
 * dot-segments outright is the whole guard; archives live directly in the
 * archive directory and nowhere else.
 */
const isSafePathSegment = (segment: string): boolean => {
    if (!isNonEmptyString(segment)) return false;
    if (segment !== segment.trim()) return false;
    if (segment.includes('/') || segment.includes('\\')) return false;
    if (segment.includes('..')) return false;
    // Encoded separators / dot-segments would be decoded by the server.
    if (/%2f|%5c|%2e/i.test(segment)) return false;
    return true;
};

/**
 * Take the body out of an axios response.
 *
 * `manifest.ts:readManifest` writes this as `res?.data ?? res` so it also accepts
 * a bare payload; the `??` there falls through to the *response object* whenever
 * the body is literally `null`, which then passes the "is it an object?" test and
 * gets returned as if it were the file's content. Keying off the presence of the
 * `data` property instead keeps both call shapes working without that hole.
 */
const unwrapPayload = (res: unknown): unknown => (res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res);

/**
 * Fold a scan into cards.
 *
 * A local version exists only if its archive does. A package.json states exactly
 * ONE version, so each archive contributes exactly one `versions[]` row —
 * `{ version, minServer, source: 'local' }`. There is no release history in the
 * file and none must be synthesized: offering an install for a version nobody
 * downloaded is exactly the failure this feature exists to prevent.
 *
 * NO PATHS COME OUT OF HERE. A row says "this version is installable offline";
 * WHICH file backs it is re-decided server-side at install time by the same
 * match rule the scan used (`archiveScript.ts`).
 *
 * Dedup: a name+version claimed by two archives never reaches this function —
 * the scan turns both into errors (see {@link SCAN_SCRIPT}). The first-wins
 * guard below is therefore only a last-resort guard against duplicate React keys
 * in the version picker. Several archives sharing a name but differing in
 * version are NOT duplicates: they fold into one card, one `versions[]` row each.
 */
export const buildLocalCatalog = (scan: LocalArchiveScan): APP_INFO[] => {
    // name → { base entry (first seen, supplies the card metadata), version rows }
    const byName = new Map<string, { base: LocalArchiveEntry; versions: PkgVersionInfo[] }>();

    for (const entry of scan.archives) {
        if (!isSafePathSegment(entry.archive)) continue;
        if (!isSafePathSegment(entry.name)) continue;

        const version = entry.version as string; // guaranteed non-empty by normalizeArchiveEntry
        const bucket = byName.get(entry.name);
        if (bucket && bucket.versions.some((v) => v.version === version)) continue; // first occurrence wins

        const row: PkgVersionInfo = {
            // `minServerVersion` → `minServer`; an absent one is the empty string,
            // which `isEligible` reads as "no constraint" (not as "blocked").
            version,
            minServer: entry.minServer ?? '',
            source: 'local',
        };

        if (bucket) bucket.versions.push(row);
        else byName.set(entry.name, { base: entry, versions: [row] });
    }

    const entries: APP_INFO[] = [];
    for (const { base, versions } of byName.values()) {
        // mapHubEntry, not a local copy of it: `description` lives at the top
        // level of the entry and at `github.description` on the card, and a
        // second mapper that misses the move makes the search box throw.
        const card = mapHubEntry(base);
        const sorted = [...versions].sort((a, b) => {
            const c = comparePkgVersions(a.version, b.version);
            return c === null ? 0 : -c;
        });
        card.versions = sorted;
        card.latest_version = sorted[0]?.version ?? card.latest_version;
        entries.push(card);
    }

    return entries;
};

// ---------------------------------------------------------------------------
// SCAN CACHE
// ---------------------------------------------------------------------------
// `buildCatalog` runs on the App Store's 500ms search debounce, i.e. on every
// pause in typing. The scan behind it is a TQL round trip that opens EVERY
// archive server-side (a real package zip is ~1.9 MB), so re-running it per
// keystroke is out of the question — and pointless: the set of zips on disk does
// not change because someone typed a letter.
//
// So the catalog is scanned once and cached at module scope; searching filters
// the cached cards. The cache is INVALIDATED at the three moments the directory
// can plausibly have changed:
//   1. App Store panel mount            (AppStore/index.tsx)
//   2. the Refresh button                 (next to `resetPkgHubBackoff`)
//   3. after any install/uninstall/update command (`usePkgCommand`)
// A future "Register archive" button must call `refreshLocalArchives()` — that
// is what it is exported for.
//
// The PROMISE is cached, not just its value, so N concurrent `buildCatalog`
// calls share one round trip. A rejection is never cached (see the catch).

let cachedCatalog: Promise<APP_INFO[]> | null = null;
let lastScanErrors: LocalArchiveScanError[] = [];
let lastLocalOnly = false;
let lastInstalledIcons: Record<string, string> | undefined;
let lastInstalledDirs: Record<string, InstalledDirInfo> = {};

const scanAndBuild = async (): Promise<APP_INFO[]> => {
    const scan = await scanLocalArchives();
    lastScanErrors = scan.errors;
    lastLocalOnly = scan.localOnly;
    lastInstalledIcons = scan.installedIcons;
    lastInstalledDirs = scan.installedDirs;
    return buildLocalCatalog(scan);
};

/**
 * The local-archive leg of the catalog: the packages installable from the
 * archive directory with no network, as App Store cards.
 *
 * PLAIN CARDS, NOTHING ELSE. This used to return `{ entries, archivePathMap }`
 * so the install path could be handed a zip path; the install now re-finds the
 * zip server-side, so a card is all there is to publish.
 *
 * CACHED — see the block above. Call {@link invalidateLocalArchiveCache} (or
 * {@link refreshLocalArchives}) when the archive directory may have changed;
 * plain re-renders and search-term changes must NOT rescan.
 *
 * NEVER REJECTS. Every failure degrades to "this server has no local archives",
 * leaving the hub leg to answer on its own.
 */
export const fetchLocalArchiveEntries = (): Promise<APP_INFO[]> => {
    if (!cachedCatalog) {
        cachedCatalog = scanAndBuild().catch(() => {
            // Unreachable by contract (scanLocalArchives never throws), but an
            // unexpected throw must not freeze an empty catalog in place for the
            // rest of the session — drop the cache so the next call retries.
            cachedCatalog = null;
            lastScanErrors = [{ archive: '', error: 'archive scan failed' }];
            lastLocalOnly = false;
            lastInstalledIcons = undefined;
            lastInstalledDirs = {};
            return [];
        });
    }
    return cachedCatalog;
};

/** Forget the cached scan. The next {@link fetchLocalArchiveEntries} rescans. */
export const invalidateLocalArchiveCache = () => {
    cachedCatalog = null;
    lastScanErrors = [];
    lastLocalOnly = false;
    lastInstalledIcons = undefined;
    lastInstalledDirs = {};
};

/**
 * Rescan now, bypassing the cache.
 *
 * The external trigger: Refresh, and (next) the "Register archive" flow, which
 * must see the zip it just uploaded without waiting for a remount.
 */
export const refreshLocalArchives = (): Promise<APP_INFO[]> => {
    invalidateLocalArchiveCache();
    return fetchLocalArchiveEntries();
};

/**
 * Archives the last scan could not read, e.g. a truncated upload.
 *
 * Deliberately a side channel rather than a field on the returned cards:
 * `buildCatalog`'s return contract is shared with the hub/installed legs and is
 * not widened for one leg's diagnostics. An entry with an empty `archive` means
 * the scan itself failed.
 *
 * This is also where a name+version collision surfaces — two zips claiming the
 * same package at the same version produce NO version row and one error record
 * each, so the user is told which files collided instead of silently getting
 * whichever one the scan happened to read first.
 */
export const getLastArchiveScanErrors = (): LocalArchiveScanError[] => lastScanErrors;

// ---------------------------------------------------------------------------
// NOTHING IN THIS PRODUCT CREATES `/public/.pkg-conf.json` (issue #1452)
// ---------------------------------------------------------------------------
// The file is READ ONLY, everywhere, by design. There is no UI, no api call and
// no install step that writes it — an App Store dev toggle used to, and it was
// removed. So:
//
//   * NO FILE IS THE NORMAL STATE, and it means ONLINE. Local-only is opt-in and
//     stays off until somebody deliberately turns it on.
//   * TURNING IT ON IS AN ADMINISTRATOR PLACING THE FILE ON THE SERVER by hand
//     (editor, scp, config management — whatever the deployment uses), at
//     `/public/.pkg-conf.json` as the browser spells it, `/work/public/` as the
//     server-side TQL scan does. Its whole content is:
//
//         {"localOnly": true}
//
//     `{"localOnly": false}`, a typo'd key, malformed json, or no file at all all
//     resolve identically to online — see `readLocalOnlyFlag` in archiveScript.ts
//     for why the rule is exactly one strict comparison.
//   * IT IS A DOT FILE, so `/api/files` directory listings NEVER show it (the
//     listing filters on extension and hides dot files); creating and reading it
//     by exact name works fine. An admin checking "is it there?" must GET the
//     path, not list the directory.
//
// If a write path is ever wanted again, it belongs behind an explicit, non-dev
// admin affordance — not resurrected here as a helper with no caller.

/**
 * Whether the LAST scan found `/public/.pkg-conf.json` saying `localOnly: true`.
 *
 * READ IT AFTER AWAITING {@link fetchLocalArchiveEntries}, NEVER BEFORE. It is a
 * side channel on the same cached scan (same pattern as
 * {@link getLastArchiveScanErrors}) rather than a field on the returned cards,
 * because it is a property of the SERVER, not of any package — and widening the
 * card array into a tuple would ripple through every caller for one boolean.
 *
 * `false` until a scan has completed, and `false` again after
 * {@link invalidateLocalArchiveCache}: the default is always "talk to the hub",
 * so an un-run or failed scan can never silently air-gap the panel.
 */
export const isLocalOnlyMode = (): boolean => lastLocalOnly;

/**
 * Icon FILE NAMES of the installed packages, as of the last scan (issue #1452).
 *
 * Same side-channel pattern (and the same "read it after awaiting
 * {@link fetchLocalArchiveEntries}" rule) as {@link isLocalOnlyMode}: it is a
 * property of the server's `/public/` directory, not of any one package, and the
 * card array is not widened into a tuple for it.
 *
 * `undefined` — before any scan, after {@link invalidateLocalArchiveCache}, after a
 * failed scan, and from a script body that predates the field — means UNKNOWN, and
 * the icon chain falls back to its historical `icon.png` guess. An EMPTY OBJECT is
 * the opposite: the scan looked and no installed package ships an icon.
 */
export const getInstalledIcons = (): Record<string, string> | undefined => lastInstalledIcons;

/**
 * What each `/public/` directory's own package.json claimed at the last scan, plus
 * whether it is a git clone (issue #1452).
 *
 * Same side-channel pattern and the same "read it after awaiting
 * {@link fetchLocalArchiveEntries}" rule as {@link getInstalledIcons}, but NOT
 * three-valued: `{}` before any scan, `{}` after a failed one, `{}` from an older
 * script body that reported neither field. Every one of those means the same thing
 * — judge nobody and leave the catalog exactly as it was.
 *
 * `buildCatalog` feeds it to `classifyInstalledDir`, which decides which directories
 * become stray cards and which one is merely somebody else's.
 */
export const getInstalledDirs = (): Record<string, InstalledDirInfo> => lastInstalledDirs;

/**
 * Read `/public/{appName}/README.md` — the README that shipped with the copy that
 * is actually installed.
 *
 * The installed copy's METADATA is not read here: that is
 * `pkgLifecycle/manifest.ts:readManifest`, reading the same `/public/{name}/`
 * directory's `package.json`. There used to be a second reader (`readLocalOnprem`,
 * for a `/public/{name}/onprem.json` that no archive has ever contained) — do not
 * bring it back, and do not add a parallel package.json reader here either.
 *
 * The path-safety guard is duplicated from `readManifest`'s caller rather than the
 * other way round because this function is called straight from the view layer.
 *
 * Returns `null` for every non-answer, which is what the detail view treats as
 * "fall back to the remote README":
 *   - the file api answers 404 with a JSON envelope, so the payload is an object,
 *     not a string — that is a miss, not a README whose text is `{...}`;
 *   - an empty/whitespace file is also a miss, otherwise the detail pane would
 *     render a blank body instead of the repo's README.
 *
 * Note the 404 path does NOT throw: the axios response interceptor resolves
 * non-401 errors with `error.response`, so the object check above (not the catch)
 * is what handles a missing file.
 */
export const readLocalReadme = async (appName: string): Promise<string | null> => {
    if (!isSafePathSegment(appName)) return null;
    try {
        const payload = unwrapPayload(await getFileList('', `/public/${appName}/`, 'README.md'));
        return typeof payload === 'string' && payload.trim() ? payload : null;
    } catch {
        return null;
    }
};
