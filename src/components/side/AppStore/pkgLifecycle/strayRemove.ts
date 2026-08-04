// issue #1452 — deleting a `/public/` directory that was never installed.
//
// ---------------------------------------------------------------------------
// WHY THIS IS NOT `runUninstall`
// ---------------------------------------------------------------------------
// `runUninstall` reads the manifest and, when `scripts.uninstall` exists, RUNS IT
// before removing the tree. That script's job is to undo what `scripts.install`
// did — deregister services, drop tables, remove config. For a directory somebody
// unpacked by hand, `scripts.install` never ran, so there is nothing to undo and
// the uninstall script would be executing against a server it was never applied
// to. It could deregister a service belonging to the REAL installed copy of the
// same package, which is precisely the case `stray.duplicate` exists to warn about.
//
// So this path runs NO package script. It deletes files and verifies they are gone.
// That is the whole operation, and it is why it is deliberately narrow:
//
//   * the target is a DIRECTORY NAME, never a package name (the two disagree —
//     that disagreement is what made the card a stray in the first place);
//   * the name is validated as one path segment that cannot escape `/work/public/`,
//     on BOTH sides — here, and again inside the script that does the deleting;
//   * a directory the CATALOG KNOWS BY NAME is refused outright. Such a directory
//     is a real install (see `classifyInstalledDir`), and removing it this way
//     would skip its uninstall script — the exact damage described above, in
//     reverse.
//
// The refusals are not defence in depth for its own sake: this function deletes a
// directory tree by name, and every caller between here and the click is UI.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SCRIPT AND NOT `rm -rf` — READ BEFORE "SIMPLIFYING" IT BACK
// ---------------------------------------------------------------------------
// It used to be `runShell('rm -rf /work/public/' + dir)`, i.e. a COMMAND STRING
// with a directory name pasted into it. macOS names a duplicated download
// `neo-pkg-replication-1.0.6 2` — a real, ordinary directory that really does
// appear under `/public/` — and that string splits into TWO arguments at the
// space, so the command meant "delete `/work/public/neo-pkg-replication-1.0.6`
// AND `2`". Deleting the neighbouring directory is the good outcome; deleting the
// REAL install of the same package is the likely one.
//
// The old code answered that by refusing every name with a space or a shell
// metacharacter in it, which is why the user's report reads
// `"neo-pkg-replication-1.0.6 2" is not a removable directory name.` — the
// commonest stray of all was the one case the feature could not remove.
//
// So the shell is gone. `runScript` sends the name as a `$.params` binding (a
// STRING VALUE, never source) and the script joins it to a root LITERAL itself.
// Quoting stops being a question because no command line is ever built.
//
// MEASURED on machbase-neo v8.5.10-snapshot, with "has space 2" and "keep" side
// by side under /work/public/:
//   $.params.dir === "has space 2"
//   fs.rmSync(REMOVE_ROOT + dir, { recursive: true, force: true })  → ok
//   afterwards: "keep" still present.

import { runScript } from './script';
import { waitForPkgRemoved } from './fsProbe';
import { SCRIPT_ERROR_SENTINEL, type StepResult } from './types';

/**
 * TQL SCRIPT roots its paths at `/work`, so the `/public/` the browser sees is
 * `/work/public/` here — the same constant `ARCHIVE_DIR` uses, and for the same
 * reason.
 *
 * Exported for the tests and for messages ONLY. The value the delete actually
 * uses is the literal inside {@link STRAY_REMOVE_SCRIPT}: a root that arrived as
 * a parameter would let the caller pick the directory to delete from.
 */
export const STRAY_REMOVE_ROOT = '/work/public/';

/** How the confirmation prompt spells the target — the browser's own path. */
export const strayDisplayPath = (dir: string): string => `/public/${dir}/`;

/** Why a removal was refused before anything ran. */
export type StrayRemoveRefusal = 'unsafe_directory_name' | 'known_package_directory';

/**
 * One path segment that cannot escape its parent directory. THAT IS THE WHOLE RULE.
 *
 * DELIBERATELY PERMISSIVE, AND IT MUST STAY THAT WAY — this list used to also
 * reject spaces, quotes and shell metacharacters via
 * `/^[A-Za-z0-9][A-Za-z0-9._-]*$/`, because the name was about to be concatenated
 * into `rm -rf /work/public/<x>`. IT IS NOT ANY MORE (see the header): the name
 * travels as a `$.params` value and is joined to a root literal inside the script,
 * so there is no command line for a space to split and no shell for a backtick to
 * reach. Re-adding a character-set filter here does not buy safety, it only brings
 * back the bug: `neo-pkg-replication-1.0.6 2` — macOS's own name for a duplicated
 * download, and one of the commonest strays there is — became unremovable.
 *
 * What remains is PATH SAFETY, which is not about characters but about structure:
 * a separator or a `..` would name a different directory than the one the card
 * shows, and the encoded spellings are rejected too because a decoder downstream
 * would turn them back into the real thing. Everything else — spaces, unicode,
 * dots, leading dots, hyphens, parentheses — is a legal directory name and is
 * allowed through.
 *
 * NOT TRIMMED, EITHER. The name must round-trip EXACTLY to the entry the
 * server-side scan read out of `/public/`; "helpfully" trimming it would send a
 * name that matches nothing.
 */
const isSafeDirName = (dir: string): boolean => {
    if (typeof dir !== 'string' || !dir.trim()) return false;
    // `.` and `..` name the parent listing itself, never a package directory.
    if (dir === '.' || dir === '..') return false;
    if (dir.includes('/') || dir.includes('\\')) return false;
    // Any two adjacent dots, in any spelling: `..`, `%2e%2e`, `.%2e`, `%2e.`.
    // A single dot is fine (`neo-pkg-replication-1.0.6`); a pair is a traversal.
    if (/(?:%2e|\.){2}/i.test(dir)) return false;
    if (/%2f|%5c/i.test(dir)) return false;
    return true;
};

/**
 * `null` when the removal may proceed, otherwise why it must not.
 *
 * Pure, and exported, because these two refusals are the entire client-side safety
 * story of this module and must be assertable without a server.
 */
export const checkStrayRemoval = (dir: string, knownNames: ReadonlySet<string>): StrayRemoveRefusal | null => {
    if (!isSafeDirName(dir)) return 'unsafe_directory_name';
    // THE IMPORTANT ONE. `knownNames` is every name the catalog produced a real
    // (non-stray) card for. A directory named after one of them is that package's
    // install and belongs to the uninstall flow, scripts and all.
    if (knownNames.has(dir)) return 'known_package_directory';
    return null;
};

/** Human-readable form of a refusal, for the Toast the caller raises. */
export const strayRefusalMessage = (dir: string, refusal: StrayRemoveRefusal): string =>
    refusal === 'known_package_directory'
        ? `"${dir}" is an installed package. Use Uninstall so its uninstall script runs.`
        : `"${dir}" is not a removable directory name.`;

/**
 * The removal script, run by TQL `SCRIPT("js", …)` on the server.
 *
 * CONSTANT BY CONTRACT — the body is JavaScript SOURCE, so the directory name
 * arrives through `$.params` and is never concatenated into it. See the header of
 * `./script.ts` for why, and the header of this file for what the old string-built
 * `rm -rf` did to a name with a space in it.
 *
 * THE ROOT IS A LITERAL. The client sends a NAME, never a path: joining happens
 * here, so nothing the browser sends can select a directory outside
 * `/work/public/`. The segment checks below are the same ones `isSafeDirName`
 * applies, repeated on this side ON PURPOSE — the client's copy is a UI courtesy
 * (it produces a Toast without a round trip), this one is the guard.
 *
 * IT YIELDS BEFORE IT DELETES. `runScript` reads ROWS, not `success`: a script
 * that throws first and yields never is reported as "produced no output", and a
 * failure has to leave as a sentinel row or not at all. So the intent is yielded
 * before the destructive call and every refusal goes through `failScript`.
 *
 * `force: true` makes an already-absent directory a success, which is the right
 * answer: the caller's own `waitForPkgRemoved` decides whether the tree is gone,
 * and a second click on a card that has not refreshed yet must not read as an
 * error.
 */
export const STRAY_REMOVE_SCRIPT = `
var fs = require("fs");

// Same sentinel + failScript contract as the archive scripts: yield the reason
// FIRST, then throw. The throw alone reaches nobody (TQL answers success=true for
// a script that threw and returns only the rows yielded before it).
var SCRIPT_ERROR_SENTINEL = "${SCRIPT_ERROR_SENTINEL}";

function failScript(msg) {
    var text = msg && msg.message ? msg.message : String(msg);
    $.yield(SCRIPT_ERROR_SENTINEL + " " + text);
    throw new Error(text);
}

// $.params values may arrive as a string or as a single-element array depending
// on how the query string is decoded; normalise both to a plain string.
function param(key) {
    var v = $.params ? $.params[key] : undefined;
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : "";
    return String(v);
}

// THE REMOVAL ROOT. A LITERAL, ON PURPOSE — DO NOT TURN IT INTO A PARAM.
// TQL roots at /work, so this is the /public/ the browser sees.
var REMOVE_ROOT = "/work/public/";

var dir = param("dir");
// String.fromCharCode(92) is a backslash, spelled this way so the escaping stays
// readable through the TS template literal that carries this source.
var BACKSLASH = String.fromCharCode(92);

// ONE SEGMENT, UNDER THE ROOT, ALWAYS. Nothing below may leave REMOVE_ROOT.
if (!dir) failScript("no directory name was given");
if (dir === "." || dir === "..") failScript("refusing to remove '" + dir + "'");
if (dir.indexOf("/") >= 0 || dir.indexOf(BACKSLASH) >= 0) failScript("directory name must be a single path segment: " + dir);
if (dir.indexOf("..") >= 0) failScript("directory name must not contain '..': " + dir);

var target = REMOVE_ROOT + dir;
// Yielded BEFORE the delete so the log survives even if rmSync throws.
$.yield("removing " + target);

try {
    fs.rmSync(target, { recursive: true, force: true });
} catch (e) {
    failScript("failed to remove " + target + ": " + (e && e.message ? e.message : e));
}

$.yield("removed " + target);
`;

/**
 * Delete `/work/public/<dir>` through {@link STRAY_REMOVE_SCRIPT}, then verify.
 *
 * The verify step is not ceremony: TQL can return before `/api/files` reflects the
 * change (the same lag `stepRmPkg` polls through), and the caller refreshes the
 * catalog off that api — reporting success against a stale listing would leave the
 * card on screen and read as "the button did nothing".
 *
 * `waitForPkgRemoved` takes the DIRECTORY name, which is what it has always
 * compared against the `/public/` listing.
 */
export async function runStrayRemove(dir: string, knownNames: ReadonlySet<string>): Promise<StepResult> {
    const refusal = checkStrayRemoval(dir, knownNames);
    if (refusal) return { ok: false, log: '', reason: strayRefusalMessage(dir, refusal) };

    // THE NAME IS A PARAMETER, NOT PART OF THE BODY. That is the whole fix.
    const r = await runScript(STRAY_REMOVE_SCRIPT, { dir });
    if (!r.ok) return r;

    const removed = await waitForPkgRemoved(dir);
    const log = `${r.log}\n${removed ? '(ok) directory removed' : '(fail) directory still present'}`;
    if (!removed) return { ok: false, log, reason: `remove reported success but ${strayDisplayPath(dir)} still exists` };
    return { ok: true, log };
}
