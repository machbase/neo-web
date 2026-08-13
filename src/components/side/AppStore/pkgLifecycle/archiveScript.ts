import { SCRIPT_ERROR_SENTINEL } from './types';

// issue #1452 — the ONE implementation of "which archives are in the archive
// directory, and which one is package X at version Y".
//
// WHY THIS FILE EXISTS
// --------------------
// Two server-side scripts need that answer:
//
//   SCAN_SCRIPT     (api/repository/onpremCatalog.ts)   — builds the catalog rows
//   EXTRACT_SCRIPT  (pkgLifecycle/steps/archiveExtract.ts) — installs one of them
//
// They used to disagree by construction: the scan found the zips, handed their
// paths to the browser (`archivePathMap` → `gArchivePaths` atom → `runCommand`
// options → `ctx.archivePath`), and the extract opened whatever path came back.
// A path that goes server → client → server can go stale (the zip is deleted or
// replaced between the scan and the click) and, worse, means DISPLAY and INSTALL
// were two different lookups that could pick two different files.
//
// Now both scripts share this prelude, so "the archive for {name}@{version}" is
// decided by ONE piece of source. Neither the directory nor any file path ever
// leaves the server.
//
// SECURITY — a nice side effect. `param("dir")` is gone: the directory is a
// literal below, so no user-supplied value can steer the readdir. The extract
// still takes `name` / `version` params, but they are only ever COMPARED against
// values read out of the archives' own package.json — never concatenated into a
// path. See the header of `script.ts` for why script bodies must stay constant.

/**
 * Shared server-side JS prelude: `require`s, the archive directory literal, and
 * the scan/match helpers. Prepended verbatim to both script bodies.
 *
 * MEASURED RUNTIME FACTS this depends on (JSH/goja, machbase-neo v8.5.10):
 *   - `fs.readdirSync` INCLUDES `.` and `..` — not filtering them was observed
 *     killing the script outright.
 *   - `fs.statSync(p).isDirectory` is a FUNCTION, not a boolean.
 *   - `new zip.Zip(path).getEntries()` needs no extraction; entry keys are
 *     `{ name, data, isDir, … }` and `entry.data` is an **ArrayBuffer**
 *     (`String(data)` yields "[object ArrayBuffer]" — see `toText`).
 *   - `require('archive/tar')` exposes the same shape:
 *     `[createTar, createUntar, tar, untar, tarSync, untarSync, Tar]`.
 *     `tar.untarSync(bytes)` answers `[{ name, data }, …]` and `data` is an
 *     **ArrayBuffer** too — which is why `toText` is REUSED and not duplicated.
 *     Whether an entry also carries `isDir` is NOT confirmed, so directories are
 *     detected by the trailing `/` as well (see `entryIsDir`).
 *   - `zlib` exposes `[gzipSync, gunzipSync, deflateSync, inflateSync, …]` and
 *     nothing else: `.tar.gz` / `.tgz` work, `.tar.bz2` / `.tar.xz` CANNOT and
 *     are reported as an error rather than skipped in silence.
 *   - `.tgz` IS `.tar.gz` — gzip'd tar, no byte-level difference. One code path,
 *     two spellings.
 *   - goja exposes Go structs under Go field names, which are not always the
 *     json-tag names — hence `pick(obj, lower, upper)`.
 *   - A THROW IS INVISIBLE TO THE CLIENT: TQL answers `success: true` either way
 *     and only the rows yielded BEFORE the throw come back. Hence `failScript`,
 *     which yields {@link SCRIPT_ERROR_SENTINEL} and then throws. See
 *     `script.ts:runScript` for the measurement.
 */
export const ARCHIVE_SCRIPT_PRELUDE = `
var zip = require("archive/zip");
var fs = require("fs");

// ---------------------------------------------------------------------------
// HOW A SCRIPT REPORTS ITS OWN FAILURE — YIELD FIRST, THROW SECOND
// ---------------------------------------------------------------------------
// The throw alone reaches NOBODY. Measured on machbase-neo v8.5.10-snapshot:
// \`throw new Error("boom")\` comes back as success=true with zero rows, and
// \`$.yield("A"); throw …\` comes back as success=true with ['A'] — i.e. the rows
// survive and the exception evaporates. So the reason has to leave through the
// only door that stays open, and the throw is kept purely to STOP the script.
//
// The prefix is matched by \`runScript\` (script.ts) and turned into
// \`{ ok: false, reason }\`. Both scripts that include this prelude use it.
var SCRIPT_ERROR_SENTINEL = "${SCRIPT_ERROR_SENTINEL}";

function failScript(msg) {
    var text = msg && msg.message ? msg.message : String(msg);
    // ORDER IS THE CONTRACT: the row must be out before the stack unwinds.
    $.yield(SCRIPT_ERROR_SENTINEL + " " + text);
    throw new Error(text);
}

// tar / zlib are needed only by the tar formats. A build that lacks either must
// still list and install .zip archives, so a missing module becomes a per-archive
// error (thrown by readArchiveEntries) instead of killing the whole script at
// load time.
function optionalRequire(id) {
    try {
        return require(id);
    } catch (e) {
        return null;
    }
}
var tar = optionalRequire("archive/tar");
var zlib = optionalRequire("zlib");

// THE ARCHIVE DIRECTORY. A LITERAL, ON PURPOSE — DO NOT TURN IT BACK INTO A PARAM.
//
// TQL SHELL/SCRIPT roots its paths at /work, so the statically served /public/
// the browser sees is /work/public/ over here. Both scripts that include this
// prelude read the same constant, which is what makes "the catalog lists it" and
// "the installer finds it" the same question. Moving the archives means editing
// this one line.
var ARCHIVE_DIR = "/work/public/";

// THE LOCAL-ONLY POLICY FILE. Same directory as the archives, on purpose: the one
// place an operator already drops package files is the one place they will look
// for the switch that turns the hub off.
//
// TQL roots at /work, so this is \`/public/.pkg-conf.json\` as the browser spells it.
//
// MEASURED (v8.5.10-snapshot): a DOT FILE IS INVISIBLE TO /api/files.
//   POST /api/files/_t/.pkg-conf.json  → created
//   GET  /api/files/_t/.pkg-conf.json  → {"localOnly":true}   (readable by name)
//   GET  /api/files/_t/                → EMPTY                (not listed)
// so the file api can never be used to discover it. \`fs.readdirSync\` /
// \`fs.readFileSync\` in here see it fine, which is why the flag rides along with
// the archive scan instead of costing a second round trip.
var PKG_CONF_PATH = ARCHIVE_DIR + ".pkg-conf.json";

// $.params values may arrive as a string or as a single-element array depending
// on how the query string is decoded; normalise both to a plain string.
function param(key) {
    var v = $.params ? $.params[key] : undefined;
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : "";
    return String(v);
}

// goja exposes Go structs under their Go field names, which are not always the
// json-tag names (see the AttributeID/status case documented in the opcua
// package). Reading both spellings costs nothing and keeps one runtime detail
// from emptying the catalog.
function pick(obj, lower, upper) {
    if (!obj) return undefined;
    return obj[lower] !== undefined ? obj[lower] : obj[upper];
}

// MEASURED: entry.data is an ArrayBuffer. String(arrayBuffer) yields
// "[object ArrayBuffer]", which JSON.parse rejects with "invalid character 'o'"
// — that one line rejected every real archive on the server while the unit
// tests, which fed plain strings through this function, stayed green.
//
// The chunking is NOT decoration. String.fromCharCode.apply(null, wholeArray)
// blows the argument limit (RangeError / stack overflow) on any package.json
// bigger than a few tens of KB, and this same helper is what a future caller
// will reach for on a larger member. Copy the loop, not the one-liner.
function toText(d) {
    if (d === undefined || d === null) return "";
    if (typeof d === "string") return d;

    var u = null;
    if (typeof ArrayBuffer !== "undefined" && d instanceof ArrayBuffer) u = new Uint8Array(d);
    else if (typeof d.length === "number") u = d;              // Uint8Array / plain array
    else if (d.buffer) u = new Uint8Array(d.buffer);           // any other typed-array view
    if (u === null) return String(d);

    var s = "";
    var CHUNK = 4096;
    for (var i = 0; i < u.length; i += CHUNK) {
        var part = u.subarray ? u.subarray(i, i + CHUNK) : u.slice(i, i + CHUNK);
        s += String.fromCharCode.apply(null, part);
    }
    // The loop above decodes byte-per-char (latin1). Re-reading it as UTF-8
    // keeps a non-ASCII description intact; pure-ASCII input is unchanged, and
    // anything escape/decodeURIComponent cannot handle falls back untouched.
    try {
        if (typeof escape === "function") return decodeURIComponent(escape(s));
    } catch (e) {
        /* not valid UTF-8 — keep the latin1 reading */
    }
    return s;
}

// ---------------------------------------------------------------------------
// LOCAL-ONLY MODE — ONE RULE, AND ONLY ONE
// ---------------------------------------------------------------------------
// true  ⇔  the file exists AND parses AND says exactly { "localOnly": true }.
// EVERYTHING else is false: no file (the normal install), a typo'd key, a string
// "true", unparseable json, an unreadable file. There is no second spelling and no
// coercion, because the failure mode of a permissive reader here is a site that
// believes it is air-gapped and is not.
//
// The cost of that strictness is that a typo fails OPEN and silently, which is why
// the banner states the resolved mode instead of only speaking up on failure.
function readLocalOnlyFlag() {
    try {
        // existsSync keeps the normal case (no file at all) from going through the
        // catch; a build without it just lets readFileSync throw instead.
        if (typeof fs.existsSync === "function" && !fs.existsSync(PKG_CONF_PATH)) return false;
        // toText for the same reason the archive members need it: this runtime may
        // answer with an ArrayBuffer, and String(arrayBuffer) is "[object ArrayBuffer]".
        var conf = JSON.parse(toText(fs.readFileSync(PKG_CONF_PATH, "utf8")));
        return !!conf && conf.localOnly === true;
    } catch (e) {
        // Missing / unreadable / malformed ⇒ ONLINE. A broken policy file must not
        // be able to cut a site off from its package hub.
        return false;
    }
}

// ---------------------------------------------------------------------------
// WHICH FILES ARE ARCHIVES, AND IN WHAT FORMAT
// ---------------------------------------------------------------------------
// "zip" / "tar" / "targz" are readable here. "unsupported" is a format we can
// NAME but not open: bzip2 / xz / zstd have no module in this runtime (zlib is
// gzip+deflate only). Those must NOT be skipped silently — a user who drops
// pkg.tar.xz into /public/ and sees no card has no way to learn why, so the scan
// emits an error record for them. Anything else ("" ) is simply not an archive
// (README.md, an installed package's directory, …) and is skipped without noise.
//
// LONGEST SUFFIX WINS. "a.tar.gz" must resolve as targz, not as some shorter
// match, so archiveKind keeps the longest hit rather than the first one — the
// table's order is then free to be human-readable.
var UNSUPPORTED_ARCHIVE_ERROR = "unsupported compression (only zip, tar, tar.gz/tgz)";

var ARCHIVE_KINDS = [
    { ext: ".zip", kind: "zip" },
    { ext: ".tar", kind: "tar" },
    { ext: ".tar.gz", kind: "targz" },
    { ext: ".tgz", kind: "targz" },
    { ext: ".tar.bz2", kind: "unsupported" },
    { ext: ".tbz", kind: "unsupported" },
    { ext: ".tbz2", kind: "unsupported" },
    { ext: ".tar.xz", kind: "unsupported" },
    { ext: ".txz", kind: "unsupported" },
    { ext: ".tar.zst", kind: "unsupported" },
    { ext: ".tzst", kind: "unsupported" },
    { ext: ".tar.lz", kind: "unsupported" },
    { ext: ".tar.lzma", kind: "unsupported" },
    { ext: ".tar.Z", kind: "unsupported" }
];

function hasExtension(n, ext) {
    // "> ext.length", not ">=": a file called exactly ".zip" is not a package.
    return n.length > ext.length && n.substring(n.length - ext.length).toLowerCase() === ext.toLowerCase();
}

/** "zip" | "tar" | "targz" | "unsupported" | "" (not an archive at all). */
function archiveKind(n) {
    var best = null;
    for (var i = 0; i < ARCHIVE_KINDS.length; i++) {
        var cand = ARCHIVE_KINDS[i];
        if (!hasExtension(n, cand.ext)) continue;
        if (best === null || cand.ext.length > best.ext.length) best = cand;
    }
    return best === null ? "" : best.kind;
}

/** True for the formats this runtime can actually open. */
function isArchiveName(n) {
    var k = archiveKind(n);
    return k === "zip" || k === "tar" || k === "targz";
}

// ---------------------------------------------------------------------------
// ENTRY ACCESS — one shape for zip and tar alike
// ---------------------------------------------------------------------------
// A zip entry is { name, data, isDir, … }; a tar entry is { name, data } and MAY
// NOT carry isDir at all (unconfirmed on the measured build). So directoryness is
// "isDir is truthy OR the name ends in /", which is how both tar and zip spell a
// directory member anyway.
function entryName(en) {
    return String(pick(en, "name", "Name") || "");
}

function entryData(en) {
    return pick(en, "data", "Data");
}

function entryIsDir(en) {
    if (pick(en, "isDir", "IsDir")) return true;
    var n = entryName(en);
    return n.length > 0 && n.charAt(n.length - 1) === "/";
}

/** Backslashes are separators too once a name reaches a path. */
function toSlashes(n) {
    return String(n).split(String.fromCharCode(92)).join("/");
}

// ---------------------------------------------------------------------------
// TAR METADATA MEMBERS — NOT CONTENT, AND NOT A ROOT ENTRY
// ---------------------------------------------------------------------------
// A GITHUB TARBALL ALWAYS STARTS WITH ONE. Measured on
// https://github.com/{owner}/{repo}/archive/refs/heads/main.tar.gz:
//
//   entry[0]  pax_global_header          ← the source commit hash, tar metadata
//   entry[1]  neo-pkg-dbus-main/
//   entry[2]  neo-pkg-dbus-main/.gitignore
//
// \`tar -tzf\` HIDES that member (it is a typeflag 'g' pax record, not a file), so
// nothing warns you it is there — but a raw reader like \`archive/tar\` hands it
// over as an ordinary entry. That is why every GitHub .tar.gz install aborted with
// "archive must contain exactly one root entry, found 2"
// (['pax_global_header', 'neo-pkg-dbus-main']) while the .zip of the same repo
// installed fine: the zip container has no such member.
//
// GNU/BSD tar ALSO emit per-file pax records as \`PaxHeaders.<pid>/<name>\` (and
// \`PaxHeaders/<name>\`), at the root or beside the file they describe, so the test
// is applied to EVERY segment rather than only to the first one.
//
// Filtered ONCE, in readArchiveEntries, which is the only way either script gets
// entries — so the root count, the \`<root>/package.json\` lookup and the extraction
// writer are all blind to these members by construction.
function isMetaSegment(seg) {
    var s = String(seg).toLowerCase();
    if (s === "pax_global_header" || s === "pax_header") return true;
    // PaxHeaders / PaxHeaders.0 / PaxHeaders.12345
    return s.substring(0, 10) === "paxheaders";
}

function isMetaEntryName(name) {
    var n = toSlashes(name);
    if (n.substring(0, 2) === "./") n = n.substring(2);
    if (!n) return false;
    var parts = n.split("/");
    for (var i = 0; i < parts.length; i++) {
        if (isMetaSegment(parts[i])) return true;
    }
    return false;
}

// ZIP SLIP / TAR SLIP. We write the entries ourselves now (extractAllTo cannot
// serve a gunzipped tar that only exists in memory), so keeping members inside
// the staging directory is OUR job. An absolute name, a drive letter or any ".."
// segment condemns the WHOLE archive: a package that tries to write outside its
// own tree is not a package we install part of.
function isUnsafeEntryName(name) {
    var n = toSlashes(name);
    if (!n) return false; // empty member: nothing to write, handled by the writer
    if (n.charAt(0) === "/") return true;
    if (n.length > 1 && n.charAt(1) === ":") return true; // a windows drive letter
    var parts = n.split("/");
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] === "..") return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// THE FORMAT SEAM — the ONLY place that knows zip from tar
// ---------------------------------------------------------------------------
// Everything downstream (root-package.json lookup, the catalog record, the
// extraction writer) sees one array of entries and cannot tell which container it
// came out of. Adding a format means adding a branch here and an ARCHIVE_KINDS
// row, and nothing else.
//
//   .zip           new zip.Zip(path).getEntries()
//   .tar           tar.untarSync(readFileSync(path, "buffer"))
//   .tar.gz/.tgz   tar.untarSync(zlib.gunzipSync(readFileSync(path, "buffer")))
//
// MEASURED (v8.5.10-snapshot): a 3072B tar gzips to 232B, untarSync answers
// [{ name: "neo-pkg-demo-main/package.json", data: ArrayBuffer }, …] — the same
// data type a zip entry carries, hence the shared toText.
//
// Throws on anything it cannot read, INCLUDING an unsafe member name. The scan
// turns that into one { archive, error } record; the extract aborts on it.
function readArchiveEntries(path, kind) {
    var k = kind || archiveKind(path);
    var entries;

    if (k === "zip") {
        entries = new zip.Zip(path).getEntries();
    } else if (k === "tar" || k === "targz") {
        if (!tar || typeof tar.untarSync !== "function") throw new Error("this runtime has no archive/tar module");
        var bytes = fs.readFileSync(path, "buffer");
        if (k === "targz") {
            if (!zlib || typeof zlib.gunzipSync !== "function") throw new Error("this runtime has no zlib.gunzipSync");
            bytes = zlib.gunzipSync(bytes);
        }
        entries = tar.untarSync(bytes);
    } else {
        throw new Error(UNSUPPORTED_ARCHIVE_ERROR);
    }

    if (!entries) return [];

    // The traversal guard runs over EVERYTHING, metadata included: an archive that
    // tries to write outside its tree is refused whole, and hiding a member from
    // the check by naming it "PaxHeaders.0/../../evil" must not be a way in.
    var kept = [];
    for (var i = 0; i < entries.length; i++) {
        var n = entryName(entries[i]);
        if (isUnsafeEntryName(n)) throw new Error("archive entry escapes its directory: " + n);
        // …and only then is the tar bookkeeping dropped. See isMetaEntryName: this
        // single filter is what keeps pax_global_header out of the root count, out
        // of the manifest lookup and off the disk.
        if (isMetaEntryName(n)) continue;
        kept.push(entries[i]);
    }
    return kept;
}

// ONLY "<root>/package.json" COUNTS — exactly two path segments.
//
// Real archives are GitHub source zips, and they carry a package.json per
// sub-project: neo-pkg-dbus.zip holds three (root, cgi-bin/, frontend/). A
// nested one names the sub-project, so accepting it would build a card for
// something that is not a package. The root's name is authoritative and the root
// DIRECTORY name (neo-pkg-dbus-main = {repo}-{branch}) is not consulted at all.
function readRootPackageJson(entries) {
    for (var i = 0; i < entries.length; i++) {
        var en = entries[i];
        if (entryIsDir(en)) continue;
        var n = toSlashes(entryName(en));
        // A tar written with "./" prefixes ("./neo-pkg-demo-main/package.json")
        // is still a root manifest — the prefix is noise, not a third segment.
        if (n.substring(0, 2) === "./") n = n.substring(2);
        if (n.length <= 13 || n.substring(n.length - 13) !== "/package.json") continue;
        if (n.split("/").length !== 2) continue;
        return JSON.parse(toText(entryData(en)));
    }
    return null;
}

// Every archive in ARCHIVE_DIR (.zip / .tar / .tar.gz / .tgz), as
//   { archive, name, version, minServer, description }   (readable)
//   { archive, error }                                   (not readable)
//
// \`archive\` is the FILE NAME only: no caller — here or in the browser — is ever
// handed a path. Failure is data, never a throw: one corrupt archive must cost
// exactly itself, and a throw would collapse the whole thing into "no archives",
// which is the silent-empty-catalog failure this design exists to prevent.
//
// A .tar.bz2 / .tar.xz / .tar.zst is a RECOGNISED name we cannot open, so it gets
// an error record too. Skipping it would leave the user staring at a directory
// that visibly contains their package and a store that shows nothing.
//
// THE FILE NAME IS NOT THE TRUTH. /public/ really does contain
// neo-pkg-replication-1.0.5.zip whose package.json says version 1.0.4 — so
// name/version come from the root package.json and from nowhere else.
function scanArchives() {
    var out = [];

    var names;
    try {
        // "." / ".." are REAL entries here — see the doc comment.
        names = fs.readdirSync(ARCHIVE_DIR).filter(function (n) { return n !== "." && n !== ".."; });
    } catch (e) {
        return out;
    }

    for (var i = 0; i < names.length; i++) {
        var fileName = String(names[i]);
        var kind = archiveKind(fileName);
        if (kind === "") continue;
        var full = ARCHIVE_DIR + fileName;

        try {
            var st = fs.statSync(full);
            var isDir = typeof st.isDirectory === "function" ? st.isDirectory() : !!st.isDirectory;
            // A DIRECTORY whose name happens to end in .tar/.zip is an installed
            // package, not an archive — checked before the unsupported report so
            // it stays silent.
            if (isDir) continue;
        } catch (e) {
            out.push({ archive: fileName, error: "stat failed" });
            continue;
        }

        if (kind === "unsupported") {
            out.push({ archive: fileName, error: UNSUPPORTED_ARCHIVE_ERROR });
            continue;
        }

        try {
            var meta = readRootPackageJson(readArchiveEntries(full, kind));
            if (!meta) {
                out.push({ archive: fileName, error: "no <root>/package.json" });
                continue;
            }
            // package.json is the whole vocabulary: name / version / description
            // (optional) / minServerVersion (optional, renamed to minServer for
            // every consumer downstream). There is no icon, docs, github block or
            // release history in it, and inventing one here would put fabricated
            // metadata on the card.
            out.push({
                archive: fileName,
                name: meta.name,
                version: meta.version,
                minServer: meta.minServerVersion,
                description: meta.description
            });
        } catch (e) {
            // Unreadable container / malformed package.json / an entry name that
            // escapes its directory: this archive only.
            out.push({ archive: fileName, error: e && e.message ? e.message : String(e) });
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// THE INSTALLED COPIES' ICON FILE NAMES — issue #1452
// ---------------------------------------------------------------------------
// The browser used to GUESS this: \`/public/{name}/icon.png\`, hardcoded. The
// extension is not a convention anybody enforces, and the real server disagrees:
//
//   /public/neo-pkg-opcua-client/icon.png
//   /public/neo-pkg-dbus/icon.svg        ← a guessed icon.png is a 404
//
// so neo-pkg-dbus showed the fallback glyph while its icon sat right there — and
// in local-only mode there is no remote candidate to recover with, so the glyph
// was final.
//
// The fix is to STOP GUESSING. This scan already walks the very directory the
// installed copies live in, so it can read the real file name for free: no extra
// round trip, no speculative request, and — because a package with no icon simply
// gets NO KEY — no 404 fired at a file we already know is not there. "Absent key"
// and "unknown" are different answers and the browser treats them differently
// (see \`pkgIconSources\`).
//
// ONE NAME IS RETURNED, NEVER A PATH. The browser owns the URL shape
// (\`/public/{name}/{file}\`) and re-validates the name it gets back; handing over a
// path would put a server-built string into an \`<img src>\`.
//
// PRIORITY, HIGHEST FIRST. A directory may hold several (a package shipping both
// a vector and a raster copy is normal), and the card has exactly one slot:
//   svg   scales cleanly to BOTH call sites (42px list thumb, 100px detail thumb)
//   png   the historical name — lossless with alpha, so it beats the lossy ones
//   jpg/jpeg/webp/gif/ico  accepted so a package is never iconless over a spelling
var ICON_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp", "gif", "ico"];

/** Index in ICON_EXTENSIONS (lower is better), or -1 when not an icon file. */
function iconRank(fileName) {
    var lower = String(fileName).toLowerCase();
    for (var i = 0; i < ICON_EXTENSIONS.length; i++) {
        if (lower === "icon." + ICON_EXTENSIONS[i]) return i;
    }
    return -1;
}

/** The best-ranked "icon.*" in a directory listing, or null when there is none. */
function pickIconFile(names) {
    var best = null;
    var bestRank = -1;
    for (var i = 0; i < names.length; i++) {
        var n = String(names[i]);
        var rank = iconRank(n);
        if (rank < 0) continue;
        if (best === null || rank < bestRank) {
            best = n;
            bestRank = rank;
        }
    }
    return best;
}

/**
 * What an installed directory's own package.json claims, or null.
 *
 * NULL FOR EVERY NON-ANSWER: no package.json (an interrupted \`pkg copy\`), an
 * unreadable one, malformed json, or a manifest with no \`name\`. The caller must
 * treat null as NO INFORMATION and change nothing about that directory — see the
 * \`installedNames\` / \`installedDirs\` fields on the scan envelope.
 *
 * \`name\` IS THE ONLY REQUIRED FIELD. version / description are optional in
 * package.json (both packages measured on a real server ship without a
 * description), so they default to "" rather than disqualifying the directory.
 */
function readInstalledManifest(dirPath) {
    try {
        var p = dirPath + "/package.json";
        if (typeof fs.existsSync === "function" && !fs.existsSync(p)) return null;
        // toText for the same reason readLocalOnlyFlag needs it: this runtime may
        // answer with an ArrayBuffer even for "utf8".
        var meta = JSON.parse(toText(fs.readFileSync(p, "utf8")));
        if (!meta || typeof meta.name !== "string" || meta.name === "") return null;
        return {
            name: meta.name,
            version: typeof meta.version === "string" ? meta.version : "",
            description: typeof meta.description === "string" ? meta.description : ""
        };
    } catch (e) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// IS THIS DIRECTORY A GIT CLONE? — issue #1452, manual-extraction triage
// ---------------------------------------------------------------------------
// A GitHub source archive (zip / tarball) carries NO \`.git\`; a developer's
// working clone does. That one bit separates the two things a directory whose
// name merely STARTS WITH its package name can be:
//
//   neo-pkg-foo-main/   no .git   ← someone unpacked neo-pkg-foo.tar.gz by hand
//   neo-pkg-foo-dev/    .git      ← someone is developing against this server
//
// Both get a card (they are identifiable packages), but only the first is offered
// a Remove action: deleting a clone would destroy uncommitted work.
//
// THREE-VALUED, and the third value matters. \`null\` means the runtime gave us no
// way to ask (no \`existsSync\`), which the browser must read as "not known" and
// therefore NOT removable — never as "no .git, go ahead".
function hasGitDir(dirPath) {
    if (typeof fs.existsSync !== "function") return null;
    try {
        return !!fs.existsSync(dirPath + "/.git");
    } catch (e) {
        return null;
    }
}

// ONE WALK OF ARCHIVE_DIR, THREE ANSWERS about the INSTALLED copies (the
// directories; the archives beside them are files and belong to \`scanArchives\`):
//
//   icons  { "<pkg dir>": "<icon file name>" }  the real extension, never a guess
//   names  { "<pkg dir>": "<package.json name>" }  what the directory claims to be
//   dirs   { "<pkg dir>": { name, version, description, git } }  the same manifest,
//          in full, plus whether the directory is a git clone
//
// All three are read from the same readdir + stat pass because each new question
// (issue #1452: icons, then manual-extraction detection, then telling a hand-
// unpacked archive from a working clone) arrived for a directory this loop was
// already opening — a second walk would double the syscalls to learn nothing new.
//
// \`names\` IS KEPT ALONGSIDE \`dirs\` DELIBERATELY: it is the field older browser
// bundles read, and the envelope is a wire format that a cached build (or a
// hand-run scan) must keep parsing. \`dirs\` is a strict superset; nothing derives
// one from the other on this side.
//
// A PACKAGE WITH NO ICON GETS NO KEY in \`icons\`. Do not "helpfully" write "" or
// icon.png: the empty map and the map-without-this-key must stay distinguishable,
// because the first means "the scan could not tell" (fall back to the old guess)
// and the second means "there is definitely nothing to fetch" (render the glyph,
// silently). \`names\` follows the same rule for the same reason: a directory whose
// package.json is missing or unreadable gets NO KEY, and the browser leaves it
// exactly as it treated it before this field existed.
//
// FAILURE IS PER PACKAGE. An unreadable sub-directory costs that package its icon
// and its name and nothing else; a failure to list ARCHIVE_DIR at all answers two
// empty maps — i.e. "no information", which the browser reads as the pre-#1452
// fallback rather than as "no icons exist" / "nothing is manually extracted".
function scanInstalled() {
    var out = { icons: {}, names: {}, dirs: {} };

    var names;
    try {
        // Same "." / ".." filter as scanArchives — the real readdirSync includes
        // them and not filtering was observed killing the script outright.
        names = fs.readdirSync(ARCHIVE_DIR).filter(function (n) { return n !== "." && n !== ".."; });
    } catch (e) {
        return out;
    }

    for (var i = 0; i < names.length; i++) {
        var name = String(names[i]);
        try {
            var st = fs.statSync(ARCHIVE_DIR + name);
            // isDirectory is a FUNCTION in this runtime, not a boolean.
            var isDir = typeof st.isDirectory === "function" ? st.isDirectory() : !!st.isDirectory;
            if (!isDir) continue;

            var files = fs.readdirSync(ARCHIVE_DIR + name + "/").filter(function (n) { return n !== "." && n !== ".."; });
            var icon = pickIconFile(files);
            if (icon) out.icons[name] = icon;

            var meta = readInstalledManifest(ARCHIVE_DIR + name);
            if (meta) {
                out.names[name] = meta.name;
                var rec = { name: meta.name, version: meta.version, description: meta.description };
                // The key is OMITTED when the runtime could not answer, so "not a
                // clone" and "could not tell" stay distinguishable downstream.
                var git = hasGitDir(ARCHIVE_DIR + name);
                if (git !== null) rec.git = git;
                out.dirs[name] = rec;
            }
        } catch (e) {
            // Unstattable / unreadable directory: this package only.
            continue;
        }
    }
    return out;
}

// THE MATCH RULE, USED BY BOTH SCRIPTS.
//
// The scan calls it to find name+version collisions (which it refuses to turn
// into catalog rows); the extract calls it to find the archive to open. Same
// function, so "what the card offers" and "what gets installed" cannot diverge.
// Records with no name/version are not matchable — the TS side reports those as
// incomplete package.json.
function matchArchives(records, name, version) {
    var out = [];
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (!r || r.error || !r.name || !r.version) continue;
        if (r.name === name && r.version === version) out.push(r);
    }
    return out;
}

/** "a.zip, b.zip" — for messages that must say WHICH files collided. */
function archiveNames(records) {
    var out = [];
    for (var i = 0; i < records.length; i++) out.push(records[i].archive);
    return out.join(", ");
}
`;
