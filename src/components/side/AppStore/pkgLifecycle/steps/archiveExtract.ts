// issue #1452 — the offline (air-gapped) counterpart of `stepPkgCopy`.
//
// Instead of `pkg copy github.com/<full_name>@<tag>`, this unpacks an archive
// (.zip / .tar / .tar.gz / .tgz) that is already on the server into
// `/work/public/<appName>`. Same `StepResult` contract as `stepPkgCopy`, so the
// install / update flows pick one or the other and leave every other step alone.
//
// THE BROWSER DOES NOT KNOW (OR SAY) WHICH FILE. This step sends `{ name,
// version }` and the server finds the archive itself, with the same scan + match
// the catalog used — see `../archiveScript.ts`. The previous design shipped the
// path server → client → server (scan → `archivePathMap` → `gArchivePaths` →
// `ctx.archivePath` → param), which could go stale between listing and click and
// made display and install two separate lookups.

import { ARCHIVE_SCRIPT_PRELUDE } from '../archiveScript';
import { ARCHIVE_PROBE_ATTEMPTS, ARCHIVE_PROBE_DELAY_MS, waitForPkgInstalled } from '../fsProbe';
import { runScript } from '../script';
import type { LifecycleContext, StepResult } from '../types';

/**
 * Staging root for the extraction — a SIBLING OF THE DESTINATION, inside
 * `/work/public/`. It used to be `/work/.pkg-staging-`, at the root of `/work`,
 * and that one directory level is what broke every Docker install.
 *
 * ---------------------------------------------------------------------------
 * WHY IT MOVED: `rename(2)` CANNOT CROSS A MOUNT POINT
 * ---------------------------------------------------------------------------
 * The install path finishes with `renameSync(staging/root, dest)`. A rename is a
 * directory-entry operation, so the kernel refuses one whose two ends live on
 * different filesystems — EXDEV, unconditionally, no matter how ordinary the
 * paths look.
 *
 * On a normal host `/work` and `/work/public` are the same filesystem and nobody
 * ever notices. In a container they routinely are NOT: the package directory is
 * a bind mount or a volume (`VOLUME ["/file"]` in machbase-neo.Dockerfile) while
 * the root of `/work` is the image's own overlay. MEASURED in a reporter's
 * container, three renames run back to back:
 *
 *   write a file directly into /work/public                  OK
 *   rename /work/.staging/x       -> /work/public/x          FAIL   ← the old path
 *   rename /work/public/.staging/x -> /work/public/x         OK     ← this path
 *
 * Staging beside the destination means the rename is always WITHIN ONE
 * DIRECTORY, so there is no mount boundary left for it to trip over.
 *
 * THE ERROR THAT REPORTS THIS IS A LIE — do not trust it, and do not re-diagnose
 * from it. The JSH runtime masks the errno twice: `engine/fs.go`'s `Rename`
 * turns ANY `os.Rename` failure into `fs.ErrInvalid`, and `/lib/fs.js`'s
 * `renameSync` catch block builds a hardcoded
 * `ENOENT: no such file or directory, rename '<from>' -> '<to>'`. So EXDEV
 * arrives dressed as a missing file, and the first hours of this investigation
 * went looking for a path that was never missing.
 *
 * ---------------------------------------------------------------------------
 * WHY BEING INSIDE `/public/` IS SAFE (the old comment said it was not)
 * ---------------------------------------------------------------------------
 * The claim it made — "a half-written tree parked there would be advertised as
 * an installed package" — does not survive contact with the code that does the
 * advertising. Every reader of that directory ignores this one:
 *
 *   `scanArchives`     `archiveKind(".pkg-staging-<name>")` is "" (no archive
 *                      extension) so the entry is skipped before it is opened.
 *   `scanInstalled`    keys `names` / `dirs` only off a readable
 *                      `<dir>/package.json`. The staged manifest sits one level
 *                      DEEPER (`<staging>/<root>/package.json`), so the staging
 *                      directory itself has none and is never recorded — which
 *                      also keeps it out of `classifyInstalledDir` (strayDirs).
 *   `isPkgInstalled`   matches `c.name === appName`; the staging directory is
 *                      named `.pkg-staging-<appName>` and cannot collide.
 *   `/api/files`       does not list dot entries at all (measured, v8.5.10-snapshot).
 *
 * What IS true is that `/public/` is statically served, so the half-written tree
 * is briefly reachable by URL. It is a dot directory, it exists only for the
 * seconds an extraction takes, and `purgeStaging()` removes it on success and on
 * every abort. That is the price of an install that works in a container, and it
 * is worth paying.
 */
export const ARCHIVE_STAGING_PREFIX = '/work/public/.pkg-staging-';

/**
 * The extraction script, run by TQL `SCRIPT("js", …)` on the server.
 *
 * CONSTANT BY CONTRACT: this is JavaScript source, so every runtime value
 * (app name, version, …) arrives through `$.params` and never through string
 * concatenation. See the header of `../script.ts`.
 *
 * WHICH ARCHIVE: not told, FOUND. `name` + `version` are matched against every
 * archive's root `package.json` via the shared `scanArchives` / `matchArchives`
 * of {@link ARCHIVE_SCRIPT_PRELUDE} — the exact rule the catalog scan used to
 * decide the version row exists. Anything other than EXACTLY ONE match aborts:
 * zero means the archive is gone (or was never there), two or more means the
 * server cannot know which package the user meant, and installing a coin-flip is
 * worse than failing with both file names on screen. Note the file NAME is not
 * consulted at all — `/public/` really does hold `neo-pkg-replication-1.0.5.zip`
 * whose package.json says `1.0.4`.
 *
 * WE WRITE THE ENTRIES OURSELVES — for every format, zip included. `archive/zip`
 * has `extractAllTo(dir)`, but a `.tar.gz` is gunzipped in MEMORY and there is no
 * file left to hand such an API, so the tar leg has to loop over entries anyway.
 * Running zip through a second, different unpacker would mean the format that
 * ships today and the format added today fail in different ways; one writer keeps
 * one set of semantics (and one traversal guard) for all four extensions.
 *
 * PATH SAFETY IS OURS NOW. `extractAllTo` used to own it; `readArchiveEntries`
 * rejects the whole archive if any member is absolute or holds a `..` segment
 * (zip slip / tar slip), and the writer below only ever joins names under
 * `staging`.
 *
 * Order of operations matters. `fsProbe.isPkgInstalled` only checks that
 * `/public/<appName>` exists — it cannot tell a finished install from a
 * half-extracted one. So everything happens in staging (a dot directory the
 * probe and both scans ignore — see {@link ARCHIVE_STAGING_PREFIX}) and the
 * switch to `<appName>` is the very last step: until it runs there is nothing at
 * the destination to misread, and once it runs the tree is already complete.
 *
 * TWO MODES, `force` PICKS ONE — the same word `stepPkgCopy(ctx, { force: true })`
 * uses, meaning "the destination is already populated, proceed anyway":
 *
 *   install (no force)  dest must NOT exist; `renameSync(root, dest)` — atomic,
 *                       with a copy fallback if the runtime refuses the rename.
 *   update  (force)     dest is KEPT and the staged tree is copied OVER it.
 *
 * WHY UPDATE IS NOT ATOMIC — do not "fix" it back into rm -rf + rename. The old
 * code removed `dest` before renaming, which deleted every file the archive does
 * not carry: `conf/`, `logs/`, `data/` — i.e. the user's whole configuration, on
 * every local update (reproduced on a real server). The GitHub path never did
 * that: `pkg copy -f` overwrites files IN PLACE over the existing directory. So
 * the offline update now means the same thing the online one always meant, and
 * atomicity is the price knowingly paid for not destroying user data.
 *
 * SIDE EFFECT, ALSO DELIBERATE: a file the new version dropped stays behind at
 * `dest` (stale). That too is exactly what `pkg copy -f` leaves, and matching the
 * two paths is worth more than a cleanliness no other install route offers.
 *
 * VALIDATION RUNS BEFORE `dest` IS TOUCHED, in both modes — one root entry, a
 * root `package.json`, `pkg.name === appName`. A corrupt or mismatched archive
 * must never be able to damage a working installation, and since the update path
 * no longer starts by deleting `dest`, a failure at any point above simply leaves
 * the previous version running.
 *
 * NO CHECKSUM GATE EXISTS, and none can be added here — do not re-investigate.
 * The JSH runtime has no hashing primitive: `crypto` only exposes
 * [generateAuthKeyPair, generateX509Certificate, writeHostFile], `zlib` only
 * compresses, and there is no `hash` / `encoding` module. Any `sha256` an
 * archive advertises is therefore advisory (see onpremCatalog.ts). The gate that
 * DOES run is structural: exactly one root directory, a root `package.json`, and
 * `package.json.name === <the package the card is for>`.
 *
 * THE ROOT DIRECTORY NAME IS NOT THE PACKAGE NAME — do not re-add a check that
 * says it is. Real archives are GitHub source zips, so the root is `{repo}-{branch}`:
 * `/public/neo-pkg-dbus.zip` unpacks to `neo-pkg-dbus-main/`, whose package.json
 * says `"name": "neo-pkg-dbus"`. The previous `roots[0] !== appName` check
 * rejected 100% of real archives. The name comes from the root package.json and
 * is compared against the card's name; the directory name is only ever used as
 * the path to rename FROM.
 *
 * `onprem.json` IS DEAD (it never existed in any archive) — no such file is read
 * or required here, and neither is a cross-file version match.
 *
 * EXPORTED so the tests can execute this source in a sandbox with a faked
 * `fs` / `archive/zip` / `archive/tar` / `zlib`; the structural gate is the whole
 * value of this step.
 */
export const EXTRACT_SCRIPT = `${ARCHIVE_SCRIPT_PRELUDE}
var appName = param("name");
var version = param("version");
var staging = param("staging");
var dest = param("dest");
// "1" only on the update path (stepArchiveExtract(ctx, { force: true })).
// Absent/"" = install: dest must not exist. See the doc comment for why the two
// modes reach the destination in different ways.
var force = param("force") === "1";

function purgeStaging() {
    try {
        if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    } catch (e) {
        // best effort: never let cleanup mask the original failure
    }
}

// EVERY failure of this script leaves here, and the ORDER is the point: staging is
// cleaned up, the reason is YIELDED as a sentinel row, and only then does the
// throw stop the script.
//
// The throw on its own tells the browser NOTHING — TQL answers success=true for a
// script that threw, and only the rows yielded before the throw come back (see
// \`failScript\` in the prelude and \`runScript\` in script.ts). Skipping the yield is
// how "archive must contain exactly one root entry, found 2" was lost and the user
// was shown "archive extract reported success but /public/<pkg> is missing"
// instead — a message about a symptom two steps downstream.
function abort(msg) {
    purgeStaging();
    failScript(msg);
}

// THE UNPACKER, one for every format. \`entries\` came out of readArchiveEntries,
// which has already refused the whole archive if any member escapes its tree — so
// every name here is relative and stays under \`target\`.
//
// Parent directories are created as we go: a tar need not carry an entry for a
// directory before the files inside it, and neither does a zip.
function writeEntries(entries, target) {
    fs.mkdirSync(target, { recursive: true });

    for (var i = 0; i < entries.length; i++) {
        var en = entries[i];
        var rel = toSlashes(entryName(en));
        if (rel.substring(0, 2) === "./") rel = rel.substring(2);
        if (!rel || rel === ".") continue;

        if (entryIsDir(en)) {
            // Trailing "/" would make an empty last segment.
            fs.mkdirSync(target + "/" + rel.replace(/\\/+$/, ""), { recursive: true });
            continue;
        }

        var full = target + "/" + rel;
        var cut = full.lastIndexOf("/");
        if (cut > 0) fs.mkdirSync(full.substring(0, cut), { recursive: true });

        var data = entryData(en);
        if (data === undefined || data === null) data = "";
        // "buffer": the payload is an ArrayBuffer for zip AND tar alike, and it
        // is written RAW — no toText, no "utf8". Members are arbitrary bytes
        // (icon.png, fonts, .so): anything that decodes them as text replaces
        // every non-UTF-8 byte with U+FFFD. toText belongs to package.json and
        // to nothing else. See copyFile below for the measured proof.
        fs.writeFileSync(full, data, "buffer");
    }
}

// ONE FILE, staging -> dest: READ THE BYTES, WRITE THE BYTES. This runtime's
// /lib/fs.js does export copyFileSync — and it CORRUPTS BINARIES. Do not use it.
//
// MEASURED on machbase-neo v8.5.10-snapshot, 12 source bytes
// (89 50 4E 47 0D 0A 1A 0A ...):
//
//   fs.writeFileSync(readFileSync(p,"buffer"),"buffer")  -> 89504e470d0a1a0a  12B  exact
//   fs.copyFileSync                                      -> efbfbd504e470d0a  22B  BROKEN
//   readFileSync(utf8) -> writeFileSync(utf8)            -> efbfbd504e470d0a  22B  (identical)
//
// copyFileSync agrees with the UTF-8 text round trip TO THE BYTE, i.e. it reads
// and writes the file as text: every byte that is not valid UTF-8 (0x89 here)
// becomes U+FFFD = EF BF BD, and the file grows. Real damage from the update
// path, which is the one that copies: /public/neo-pkg-opcua-client/icon.png went
// from 45,507 bytes to 80,949 with 18,082 U+FFFD in it and rendered as a broken
// image in the browser.
//
// DO NOT "OPTIMISE" THIS BACK INTO copyFileSync — one call instead of two is not
// a win when it silently destroys every icon, font, .so and .db a package ships.
// The pair below is byte-exact (same measurement) and is what writeEntries above
// already uses for every extracted member. (The platform's own /sbin/pkg.js
// copies with the same broken call; that one is not ours to fix.)
function copyFile(from, to) {
    fs.writeFileSync(to, fs.readFileSync(from, "buffer"), "buffer");
}

// THE UPDATE WRITER — copy \`from\`'s CONTENTS over \`to\`, keeping whatever else
// lives there. This is the whole reason the update path exists separately:
// removing \`to\` first (what this script used to do) deletes conf/, logs/ and
// data/, none of which the archive carries. Files present in both are
// overwritten; files only at \`to\` are left alone, which is precisely the
// semantics of \`pkg copy -f\` on the GitHub path.
//
// NOT ATOMIC BY CONSTRUCTION: a failure halfway leaves a half-updated tree. The
// alternative — atomic rename — cannot preserve user data, and losing the user's
// configuration on every successful update is worse than a partial tree on a rare
// failed one.
function mergeTree(from, to) {
    fs.mkdirSync(to, { recursive: true });

    var names = fs.readdirSync(from).filter(function (n) { return n !== "." && n !== ".."; });
    for (var i = 0; i < names.length; i++) {
        var src = from + "/" + names[i];
        var dst = to + "/" + names[i];
        var st = fs.statSync(src);
        var isDir = typeof st.isDirectory === "function" ? st.isDirectory() : !!st.isDirectory;
        if (isDir) mergeTree(src, dst);
        else copyFile(src, dst);
    }
}

if (!appName || !version || !staging || !dest) abort("archive extract: missing parameter");

// 0. find the archive. Same directory, same scan, same match rule as the
//    catalog — see the doc comment. EXACTLY ONE or nothing happens.
var matches = matchArchives(scanArchives(), appName, version);
if (matches.length === 0) abort("no archive for " + appName + " " + version);
if (matches.length > 1) abort("duplicate archives for " + appName + " " + version + ": " + archiveNames(matches));

// The path is built HERE, from a name that came out of readdirSync on the fixed
// archive directory — not from anything the browser sent.
var archiveName = matches[0].archive;
if (!isArchiveName(archiveName)) abort("unsupported archive " + archiveName);
var archivePath = ARCHIVE_DIR + archiveName;
$.yield("using " + archiveName + " for " + appName + " " + version);

// 1. unpack into a clean staging dir outside /work/public. Same entry array the
//    scan read the manifest out of — zip, tar and tar.gz differ only inside
//    readArchiveEntries.
purgeStaging();
var entries;
try {
    entries = readArchiveEntries(archivePath, archiveKind(archiveName));
} catch (e) {
    abort("cannot read " + archiveName + ": " + (e && e.message ? e.message : e));
}
writeEntries(entries, staging);
$.yield("extracted " + archivePath + " -> " + staging);

// 2. structural validation
//    ONE root entry — but its NAME IS NOT CHECKED. A GitHub source zip roots at
//    "{repo}-{branch}" (neo-pkg-dbus-main), never at the package name.
var roots = fs.readdirSync(staging).filter(function (n) { return n !== "." && n !== ".."; });
if (roots.length !== 1) abort("archive must contain exactly one root entry, found " + roots.length);

var root = staging + "/" + roots[0];
if (!fs.statSync(root).isDirectory()) abort("archive root '" + roots[0] + "' is not a directory");

// The ROOT package.json is the manifest — the only one. A source zip also holds
// cgi-bin/package.json and frontend/package.json, which describe sub-projects.
var pkgPath = root + "/package.json";
if (!fs.existsSync(pkgPath)) abort("archive is missing package.json");
// toText for the same reason readLocalOnlyFlag needs it: this runtime may answer
// with an ArrayBuffer even for "utf8", and String(arrayBuffer) is
// "[object ArrayBuffer]", which JSON.parse rejects. It is a no-op on a string.
// package.json is the ONE file this script is allowed to read as text.
var pkg = JSON.parse(toText(fs.readFileSync(pkgPath, "utf8")));

// The identity check: the archive must hold the package whose card was clicked.
// The card's name came from this same field (the catalog scan reads the root
// package.json of the zip), so a mismatch means the file changed underneath the
// catalog — install the wrong tree and /public/<appName> now lies about itself.
if (!pkg.name) abort("archive package.json has no name");
if (pkg.name !== appName) abort("archive holds '" + pkg.name + "', expected '" + appName + "'");
$.yield("verified " + pkg.name + "@" + pkg.version);

// 3. the switch — LAST step on purpose, and the FIRST line that touches dest.
//    Everything above (lookup, unpack, one-root, root package.json, name match)
//    has already passed, so a broken archive can no longer damage what is
//    installed.
//
//    "{staging}/{root}" -> "/work/public/{pkg.name}": dest arrives as a
//    parameter built from the card's name, and the check above already proved
//    pkg.name === appName, so this IS /work/public/<pkg.name>. Building the path
//    from pkg.name here instead would mean pasting a value read out of an
//    untrusted zip straight into a filesystem path.
//
//    INSTALL (no force): rename, atomic, and dest must not exist — the Install
//    button is only offered for a package that is not installed, so a populated
//    dest means the caller is confused about which operation it is running and
//    silently deciding for it is how the config-deleting bug happened.
//    UPDATE (force): merge over dest, never delete it. See the doc comment.
if (!force && fs.existsSync(dest)) abort("destination already exists: " + dest + " (update, not install)");

// THE INSTALL SWITCH, WITH A FALLBACK — belt and braces for one hostile case.
//
// Staging is a sibling of dest now (see ARCHIVE_STAGING_PREFIX), so the rename
// no longer crosses a mount point and EXDEV is off the table. This fallback is
// for what that move does NOT cover: a runtime that refuses THIS rename for some
// other reason a container can invent. It costs one catch and reuses the writer
// the update path has always used, and the alternative is the failure this whole
// change exists to stop.
//
// THE CLEANUP IS NOT OPTIONAL. mergeTree is not atomic, and we are on the
// install path, where \`dest\` was proven NOT to exist two lines up — so a copy
// that dies halfway leaves a PARTIAL tree at a path \`isPkgInstalled\` reads as a
// finished install. Removing it is safe precisely because nothing of the user's
// was ever there; on the update path (force) no fallback runs and dest is never
// touched by this block.
function installByRename() {
    try {
        fs.renameSync(root, dest);
        return null;
    } catch (e) {
        return e && e.message ? e.message : String(e);
    }
}

try {
    if (force) {
        mergeTree(root, dest);
    } else {
        var renameError = installByRename();
        if (renameError !== null) {
            $.yield("rename refused (" + renameError + "), copying instead");
            try {
                mergeTree(root, dest);
            } catch (copyError) {
                try {
                    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
                } catch (cleanupError) {
                    // best effort: the copy failure below is the reason that matters
                }
                throw copyError;
            }
        }
    }
} catch (e) {
    abort("failed to install into " + dest + ": " + (e && e.message ? e.message : e));
}

purgeStaging();
$.yield("installed " + dest);
`;

/**
 * @param opts.force Update semantics, mirroring `stepPkgCopy(ctx, { force: true })`:
 *   the destination is already populated and must be written OVER rather than
 *   replaced. Without it the step installs, and refuses a destination that
 *   already exists.
 */
export async function stepArchiveExtract(ctx: LifecycleContext, opts?: { force?: boolean }): Promise<StepResult> {
    const force = opts?.force === true;
    ctx.onProgress?.(force ? 'extract archive -f' : 'extract archive');

    // WHICH VERSION: `ctx.tag`. That is the field `usePkgCommand` fills with the
    // version the user picked in the menu (falling back to the card's
    // `latest_version`), and for a local row that value IS the archive's
    // package.json version — the catalog scan put it in the row. It doubles as
    // the `@<tag>` of the GitHub path, so the two sources install the same
    // version by construction.
    //
    // Self-defence: the offline gating lives in the UI layer (item.tsx) and
    // `usePkgCommand` forwards `source` unvalidated, so a 'local' context with no
    // version must not reach the server as a script call with an empty parameter.
    const version = ctx.tag?.trim();
    if (!version) {
        const reason = `no version selected for ${ctx.appName}`;
        ctx.logs.push(`== extract archive -> /public/${ctx.appName} ==`);
        ctx.logs.push(`(fail) ${reason}`);
        return { ok: false, log: reason, reason };
    }

    const staging = `${ARCHIVE_STAGING_PREFIX}${ctx.appName}`;
    const dest = `/work/public/${ctx.appName}`;
    ctx.logs.push(`== extract ${ctx.appName} ${version} -> ${dest}${force ? ' (merge)' : ''} ==`);

    // `force` is sent ONLY when set, so the install call keeps the exact param
    // set it always had. The script reads it as `param("force") === "1"`.
    const params: Record<string, string> = {
        name: ctx.appName,
        version,
        staging,
        dest,
    };
    if (force) params.force = '1';

    const r = await runScript(EXTRACT_SCRIPT, params);
    ctx.logs.push(r.log);
    if (!r.ok) return r;

    // Same rationale as stepPkgCopy: TQL can return before /api/files reflects
    // the new directory. Uses the archive-specific budget, not pkg copy's.
    ctx.onProgress?.('verify extract');
    ctx.logs.push(`== verify /public/${ctx.appName} ==`);
    const exists = await waitForPkgInstalled(ctx.appName, {
        attempts: ARCHIVE_PROBE_ATTEMPTS,
        delayMs: ARCHIVE_PROBE_DELAY_MS,
    });
    ctx.logs.push(exists ? '(ok) directory found' : '(fail) directory not found');

    if (!exists) {
        // LAST LINE OF DEFENCE, AND IT NOW READS LIKE ONE. This message used to be
        // the ONLY thing a failed extraction ever said, because the script's own
        // abort reason was swallowed by the transport (TQL answers success=true for
        // a script that threw). With `failScript` + `runScript`'s row contract the
        // real reason arrives above and this branch returns early — so reaching here
        // genuinely means "the script said it installed and the directory is not
        // there", which is worth its own message. Do not delete it: a rename that
        // silently no-ops, or a probe that outlives a slow filesystem, lands here.
        return {
            ok: false,
            log: r.log,
            reason: `archive extract reported success but /public/${ctx.appName} is missing`,
        };
    }
    return { ok: true, log: r.log };
}
