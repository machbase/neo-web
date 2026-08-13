// issue #1452 — WHAT IS THIS DIRECTORY UNDER /public/, AND WHAT MAY WE DO TO IT?
//
// `/public/` is a plain web root, not a package registry. A real server lists
//
//   neo-pkg-opcua-client-main/   package.json name: neo-pkg-opcua-client   no .git
//   neo-pkg-replication-1.0.5/   package.json name: neo-pkg-replication    no .git
//   stage/                       package.json name: neo-pkg-opcua-client   no .git
//   neo-pkg-dbus/                package.json name: neo-pkg-dbus           (a real install)
//
// The first two are archives somebody unpacked BY HAND. The third is a backend
// work directory that happens to contain a copy of a package. Only the fourth was
// installed.
//
// ---------------------------------------------------------------------------
// A HAND-UNPACKED COPY IS NOT DEAD — THAT IS WHY IT GETS A CARD
// ---------------------------------------------------------------------------
// `/public/` is statically served, so a hand-unpacked tree's `cgi-bin/` answers
// requests. Measured on a real server:
//
//   neo-pkg-opcua-client-main/cgi-bin/api/health  → 200
//   neo-pkg-replication-1.0.5/cgi-bin/api/health  → 200
//   stage/cgi-bin/api/health                      → 200
//
// Only `scripts.install` never ran, so no service was registered. The directory is
// therefore an UNMANAGED COPY of a package — live backend code the App Store does
// not control — and not a harmless leftover. It used to get a line in the warning
// list and nothing else; it now gets a card that names it, says what it is, and
// (when it is safe) offers to delete it.
//
// ---------------------------------------------------------------------------
// KNOWN LIMITATION, ACCEPTED (do not "fix" it by inventing an install marker)
// ---------------------------------------------------------------------------
// A user who unpacks an archive and then RENAMES the directory to the package's
// proper name is indistinguishable from a real install here, and is classified as
// one. Detecting it would need a marker file written by the install path — a new
// piece of on-disk state, with its own migration and its own failure modes, for a
// case that already announces itself: `scripts.install` never ran, so Start fails.
// That work is deliberately deferred; DO NOT add a marker as a side effect of
// touching this file.

import type { InstalledDirInfo } from '@/api/repository/onpremCatalog';

/**
 * What one `/public/` directory is.
 *
 * `installed`   the catalog knows this name — a normal installed package.
 * `unclaimed`   nothing can be said about it (no readable package.json, or its
 *               package.json agrees with the directory name). Historical
 *               behaviour applies: `neo-pkg-*` gets a synthesized card, anything
 *               else is ignored.
 * `strayArchive` an archive unpacked by hand — removable.
 * `strayClone`  a git working clone (or one we cannot rule out) — NOT removable.
 * `foreign`     somebody else's directory that merely contains a package copy.
 */
export type InstalledDirVerdict = 'installed' | 'unclaimed' | 'strayArchive' | 'strayClone' | 'foreign';

/**
 * THE RULE. Applied to every `/public/` directory, in this order.
 *
 * 1. THE CATALOG KNOWS THE NAME ⇒ `installed`, whatever its package.json says.
 *    This clause comes first on purpose and is not a shortcut: a directory named
 *    after a package the hub or the local archive publishes IS that package's
 *    install (both install paths produce exactly `/public/<package.json name>` —
 *    `pkg copy` copies the package's contents into it, and the archive install
 *    renames `{staging}/{root}` to it). The naming convention below only ever
 *    judges directories NOBODY has heard of — the same scoping the pre-existing
 *    `known` clause in `buildCatalog` already used for `isPkgDirName`.
 *
 * 2. NO USABLE MANIFEST ⇒ `unclaimed`. An interrupted `pkg copy` has no
 *    package.json at all, and its card is the ONLY way to uninstall it. Never
 *    take that away.
 *
 * 3. THE NAMES AGREE ⇒ `unclaimed` too: it looks exactly like an install of a
 *    package no catalog happens to list, which is precisely the case
 *    `buildCatalog` has always synthesized a card for.
 *
 * 4. dir STARTS WITH the package name, no `.git` ⇒ `strayArchive`.
 *    `neo-pkg-foo-main` ({repo}-{branch}) and `neo-pkg-foo-1.0.5` ({repo}-{tag})
 *    are what GitHub's zip and tarball unpack to. GitHub source archives carry no
 *    `.git`, so its absence is what separates them from a clone.
 *
 * 5. dir starts with the package name and `.git` IS there (or we could not tell)
 *    ⇒ `strayClone`. A card, because it is still an unmanaged live copy — but no
 *    Remove, because deleting a working clone destroys uncommitted work. NOTE the
 *    `undefined` case lands here: "not known" must never be read as "no .git".
 *
 * 6. ANYTHING ELSE ⇒ `foreign`. `stage/` contains a copy of neo-pkg-opcua-client
 *    and is a backend work directory; the App Store has no business showing a card
 *    for it, let alone offering to delete it.
 *
 *    A `foreign` verdict is SILENT — no card and, since the user asked for it, no
 *    warning either (`buildCatalog` drops it on the floor). Two reasons, and the
 *    second is why a "just downgrade the wording" compromise was rejected:
 *      * The directory is not ours. `stage/` belongs to the backend; the panel has
 *        nothing to offer about it and nothing it may do to it, so a line in the
 *        problem list is a report the reader cannot act on.
 *      * The naming convention CANNOT tell a mistake from an intention. "dir does
 *        not start with the package name" is equally true of a deliberate work
 *        directory and of a botched copy, so every such warning is a guess — and a
 *        guess repeated on every single catalog build is noise, which is what
 *        trains people to ignore the list that also carries the real archive
 *        problems.
 *    The verdict itself stays: it is what keeps these directories out of the stray
 *    cards, and it is asserted in strayDirs.test.ts.
 */
export const classifyInstalledDir = (dir: string, info: InstalledDirInfo | undefined, isKnownName: boolean): InstalledDirVerdict => {
    if (isKnownName) return 'installed';
    const name = typeof info?.name === 'string' ? info.name.trim() : '';
    if (!name) return 'unclaimed';
    if (name === dir) return 'unclaimed';
    if (!dir.startsWith(name)) return 'foreign';
    return info?.git === false ? 'strayArchive' : 'strayClone';
};

/** Both stray verdicts, i.e. "this directory gets a card of its own". */
export const isStrayVerdict = (verdict: InstalledDirVerdict): boolean => verdict === 'strayArchive' || verdict === 'strayClone';

/**
 * Whether the card may offer `Remove directory`.
 *
 * ONLY `strayArchive`. A clone is a workspace and an `installed` / `unclaimed`
 * directory goes through the real uninstall flow (which runs `scripts.uninstall`);
 * this action deletes files and runs nothing.
 */
export const isStrayRemovable = (verdict: InstalledDirVerdict): boolean => verdict === 'strayArchive';

// THERE IS NO `foreignDirWarning` ANY MORE, and re-adding one is a regression.
// A `foreign` directory produces no card AND no warning — see rule 6 above for
// why. The scan's own findings (unreadable archive, unsupported compression, no
// root package.json, duplicate name+version) are untouched: those are real
// problems with files the user put there for us to install.
