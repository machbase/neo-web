// issue #1452 — App Store catalog assembly for online AND air-gapped servers.
//
// THE REGRESSION THIS FILE EXISTS TO FIX
// --------------------------------------
// The catalog used to be "the hub list, annotated with installed state". One
// `try { ... } catch { setPkgs({ possibles: [] }) }` meant a failed hub fetch
// emptied the panel — including the cards of packages that are installed and
// running right now. Those cards are the ONLY entry point to start / stop /
// uninstall, so an offline server lost all control over its own packages.
//
// The catalog is now the name-keyed union of three independent sources:
//
//   hub        raw.githubusercontent packages-all.json   — may be unreachable
//   local      the archive zips, scanned server-side     — offline install source
//   installed  /public/{name}/ + package.json            — ground truth on disk
//
// The local leg is CACHED behind `fetchLocalArchiveEntries` (it opens every zip
// on the server), so calling `buildCatalog` per keystroke costs one hub fetch and
// one /public listing, not a rescan. See the cache block in onpremCatalog.ts for
// who invalidates it.
//
// They are collected with `Promise.allSettled`, so ANY subset can fail and the
// remaining ones still produce a usable catalog. `buildCatalog` never rejects.
//
// The `installed` leg is a directory listing of a plain web root, so it is the
// one leg that can name things that are not packages. See `PKG_NAME_PREFIX`.
//
// Who owns what after the merge:
//   display metadata (description/icon/docs/experiment) → hub wins, local fills in
//   installed_* flags                                   → /public + manifest ONLY
//   versions[]                                          → hub ∪ local
//
// Both refresh paths (AppStore/index.tsx debounce and usePkgCommand's
// post-command refresh) call this one function. Keeping a second inline copy of
// the merge is how the panel silently reverted to online-only behaviour after
// every install/uninstall.

import { fetchPkgHubList, filterExperimentPkgs, mapHubEntry, type APP_GITHUB, type APP_INFO, type PkgHubEntry } from '@/api/repository/appStore';
import {
    emptyGithub,
    fetchLocalArchiveEntries,
    getInstalledDirs,
    getInstalledIcons,
    getLastArchiveScanErrors,
    isLocalOnlyMode,
    type InstalledDirInfo,
    type LocalArchiveScanError,
} from '@/api/repository/onpremCatalog';
import { getFiles } from '@/api/repository/fileTree';
import { comparePkgVersions, type PkgVersionInfo } from '@/utils/version/utils';
import type { CatalogMode } from '@/recoil/appStore';
import { readManifest, type PkgManifest } from './pkgLifecycle';
import { classifyInstalledDir, isStrayRemovable, isStrayVerdict } from './strayDirs';

export interface BuildCatalogOptions {
    /** Current search box text. Empty/omitted ⇒ full catalog. */
    search?: string;
    /** Server experiment mode (from `useExperiment().getExperiment()`). */
    experimentOn: boolean;
}

export interface CatalogResult {
    /** Cards to render, already experiment-gated and search-filtered. */
    pkgs: APP_INFO[];
    /**
     * How this build got its hub data — see `CatalogMode`.
     *
     * `online` is decided by the fetch alone, never by `navigator.onLine`, which
     * describes the LAN and not whether raw.githubusercontent is reachable from
     * behind an air gap. `localOnly` means the fetch was never attempted.
     */
    mode: CatalogMode;
    /** Failure message from the hub leg. Only ever set in `offline`. */
    hubError?: string;
    /** Epoch ms of the last successful hub sync; survives later failures. */
    lastSyncAt?: number;
    /**
     * Problems with the ARCHIVE FILES the user put on the server for us to install
     * (issue #1452): an archive in a compression the server cannot open, a zip with
     * no root `package.json`, a name+version collision, an unreadable file.
     *
     * NOTHING ABOUT A `/public/` DIRECTORY IS IN HERE, and neither of the two
     * removals should be undone:
     *   * A HAND-UNPACKED PACKAGE is a CARD now, which can say more and can act.
     *     The same finding in two places is how a user ends up deleting a directory
     *     twice, or reading an accusation about one they just removed.
     *   * A `foreign` DIRECTORY (`stage/`) is ignored outright, by user decision.
     *     It is not ours to report on and the prefix rule cannot tell a deliberate
     *     work directory from a mistake — see rule 6 in `strayDirs.ts`.
     * What is left is exactly the set the user CAN act on, which is what keeps the
     * list worth reading.
     *
     * WHY THIS ONE LEG'S DIAGNOSTICS DO CROSS THE BOUNDARY, when the header of
     * `getLastArchiveScanErrors` says they deliberately do not: they are not
     * being folded into the CARDS (the thing that comment protects — a card is
     * still just a card). They ride alongside, on the result object, because a
     * module-scope side channel cannot re-render a React component: reading it
     * from a component gives whatever the last scan left behind and never
     * updates. Both `buildCatalog` call sites push this into `gCatalogScanWarnings`.
     *
     * ALWAYS AN ARRAY, never undefined — `[]` is "the scan found nothing wrong",
     * which is also what a scan that never ran reports, and both mean "say
     * nothing".
     */
    scanWarnings: LocalArchiveScanError[];
    // NO ARCHIVE PATHS HERE. A `versions[]` row tagged `source: 'local'` is the
    // whole offline contract: it says the version is installable without the
    // network. WHICH zip backs it is re-decided server-side at install time by
    // the same scan that produced the row (pkgLifecycle/archiveScript.ts), so a
    // path never has to survive the round trip through the browser.
}

/**
 * Package directory naming convention under `/public/`.
 *
 * DO NOT DELETE THIS FILTER. `/public/` is a plain web root, not a package
 * registry: machbase-neo keeps its own working directories right next to the
 * installed packages. A real server lists
 *
 *   neo-pkg-llm-chat/  neo-pkg-opcua-client/  neo-pkg-replication/
 *   neo-pkg-vibe-analytics/  stage/
 *
 * where `stage` is a backend work directory and not a package at all. A package
 * directory is named after its repo and every package in the hub catalog is
 * `neo-pkg-*`, so the name prefix is the only signal available about a directory
 * we have never seen in any catalog.
 */
export const PKG_NAME_PREFIX = 'neo-pkg';

/** Whether a `/public/` directory name may be treated as an unknown package. */
export const isPkgDirName = (name: string): boolean => name.startsWith(PKG_NAME_PREFIX);

/**
 * Names of the directories under `/public/`, UNFILTERED.
 *
 * Deliberately raw: this set is used to answer "is <known package> installed?",
 * and there the name already came from the hub or the local archive, so the
 * naming convention must not get a vote. `isPkgDirName` is applied one level up,
 * only where a directory would become a brand-new card (see `buildCatalog`).
 */
export const listInstalledNames = async (): Promise<Set<string>> => {
    try {
        const res: any = await getFiles('/public/');
        const children: any[] = res?.data?.children ?? res?.children ?? [];
        return new Set<string>(children.filter((c: any) => c?.isDir).map((c: any) => c.name as string));
    } catch {
        return new Set<string>();
    }
};

// Last time the hub actually answered. Module-scoped so an offline build can
// still report "synced 20 minutes ago" instead of nothing at all.
let lastHubSyncAt: number | undefined;

/** Test seam: forget the remembered sync time. */
export const resetCatalogSyncTime = () => {
    lastHubSyncAt = undefined;
};

const errorMessage = (reason: unknown): string => {
    if (reason instanceof Error && reason.message) return reason.message;
    const text = String(reason ?? '');
    return text || 'pkg hub unreachable';
};

/**
 * Build a card for an installed package out of its `/public/{name}/package.json`.
 *
 * package.json IS THE ONLY METADATA AN INSTALLED COPY HAS. The `onprem.json` this
 * used to read first does not exist in any archive and therefore never existed
 * under `/public/` either; `readManifest` is now the single reader.
 *
 * Routed through `mapHubEntry` like every other source so `description` ends up
 * at `github.description` — the search filter dereferences that unguarded, and a
 * hand-rolled mapper that leaves it undefined throws on the first keystroke.
 * `description` is optional in package.json (opcua-client / replication ship
 * without one) and there is no github block at all, so both are defaulted here.
 */
const cardFromEntry = (name: string, manifest: PkgManifest | null): APP_INFO =>
    mapHubEntry({
        name, // the /public/ directory name outranks whatever the file claims
        version: typeof manifest?.version === 'string' ? manifest.version : undefined,
        description: typeof manifest?.description === 'string' ? manifest.description : '',
        github: emptyGithub(),
    } as PkgHubEntry);

/**
 * A card for a `/public/` directory that holds an identifiable package NOBODY
 * installed through the App Store (issue #1452).
 *
 * NAMED AFTER THE PACKAGE, NOT THE DIRECTORY — the opposite of `cardFromEntry`,
 * and for the opposite reason. `cardFromEntry` describes a directory that IS the
 * install, so the directory name is the package's identity. Here the two disagree,
 * and the useful thing to show is what the tree actually contains
 * (`neo-pkg-opcua-client`, sitting in `neo-pkg-opcua-client-main/`). The directory
 * travels in `stray.dir`, which is what every filesystem-touching path uses.
 *
 * NO `versions[]`, ON PURPOSE. A version row is an offer to install, and this card
 * offers nothing: `mapHubEntry` would synthesize one from `version`, so it is
 * cleared afterwards. `latest_version` is kept for display only.
 *
 * NO `installed_frontend` EITHER — see the field's comment in appStore.ts.
 * `installed_icon` IS set, because the directory really does exist and really may
 * ship an icon; `item.tsx` reads it with `stray.dir` as the path segment.
 */
const strayCard = (dir: string, info: InstalledDirInfo, removable: boolean, duplicate: boolean, installedIcons?: Record<string, string>): APP_INFO => {
    const card = mapHubEntry({
        name: info.name,
        version: info.version,
        description: typeof info.description === 'string' ? info.description : '',
        github: emptyGithub(),
    } as PkgHubEntry);
    card.versions = [];
    card.installed_icon = installedIconOf(dir, installedIcons);
    card.stray = { dir, removable, duplicate };
    return card;
};

/**
 * hub ∪ local version rows, newest first.
 *
 * SOURCE TAGGING — read before changing. A row present in both catalogs is
 * folded into ONE row tagged `'local'`: offline, the locally archived copy is
 * the only one that can actually be installed, and showing two rows for one
 * version would duplicate React keys in the picker. Hub-only rows are tagged
 * `'hub'` EXPLICITLY rather than left undefined, because the offline masking in
 * phase 4 keys off `source === 'hub'` and would skip an untagged row.
 */
export const mergeVersions = (hubVersions?: PkgVersionInfo[], localVersions?: PkgVersionInfo[]): PkgVersionInfo[] => {
    const byVersion = new Map<string, PkgVersionInfo>();
    for (const v of hubVersions ?? []) {
        if (!v?.version) continue;
        byVersion.set(v.version, { ...v, source: 'hub' });
    }
    for (const v of localVersions ?? []) {
        if (!v?.version) continue;
        const hubRow = byVersion.get(v.version);
        const row: PkgVersionInfo = { ...hubRow, ...v, source: 'local' };
        // The local index is a packaging-time snapshot and frequently carries no
        // minServer. An empty one reads as "no constraint" downstream
        // (`isEligible`), so a blank local value must not erase the hub's real
        // constraint for the same version.
        if (!row.minServer && hubRow?.minServer) row.minServer = hubRow.minServer;
        if (!row.released_at && hubRow?.released_at) row.released_at = hubRow.released_at;
        byVersion.set(v.version, row);
    }
    return [...byVersion.values()].sort((a, b) => {
        const c = comparePkgVersions(a.version, b.version);
        return c === null ? 0 : -c;
    });
};

/**
 * Fold one package's hub card and local card into the card that gets rendered.
 *
 * Display metadata comes from the hub when the hub knows the package, because
 * the hub is live and the archive's package.json is frozen at packaging time.
 * `experiment` in
 * particular MUST follow the hub: a package pulled back for revalidation after
 * the archive was cut still carries `experiment: false` in the zip, and trusting
 * that would re-expose exactly the package the hub just withdrew.
 *
 * `latest_version` is recomputed over the union — a local-only card's value is
 * merely "the newest version that happens to sit in the archive directory".
 */
export const mergeCards = (hub?: APP_INFO, local?: APP_INFO): APP_INFO => {
    const base = (hub ?? local) as APP_INFO;
    const github = { ...(local?.github ?? {}), ...(hub?.github ?? {}) } as APP_GITHUB;
    // A hub entry with a blank description should still show the local one
    // rather than an empty line, and the field must never be undefined: the
    // search filter calls `.toLowerCase()` on it directly.
    if (!github.description) github.description = local?.github?.description ?? hub?.github?.description ?? '';
    const versions = mergeVersions(hub?.versions, local?.versions);
    return {
        ...base,
        name: base.name,
        icon: hub?.icon ?? local?.icon,
        docs: hub?.docs ?? local?.docs,
        published_at: hub?.published_at || local?.published_at || '',
        experiment: hub ? hub.experiment : local?.experiment,
        github,
        versions,
        latest_version: versions[0]?.version ?? hub?.latest_version ?? local?.latest_version ?? '',
    };
};

/**
 * Installed-state fields, derived from `/public/{name}/package.json` alone —
 * plus the icon file name, which comes from the directory listing instead.
 *
 * `installedIcons` IS THE WHOLE MAP, NOT THIS PACKAGE'S ENTRY, on purpose: the
 * three-valued answer this field has to produce cannot be expressed by a lookup
 * done at the call site.
 *
 *   map given, key present  → 'icon.svg'   fetch exactly that
 *   map given, key ABSENT   → ''           the scan looked; there is no icon
 *   map `undefined`         → undefined    nothing is known; guess `icon.png`
 *
 * Passing `installedIcons?.[name]` in from outside would fold rows 2 and 3 into
 * one `undefined` and either resurrect the 404 or blank every icon. See
 * `getInstalledIcons` (onpremCatalog.ts) and `pkgIconSources`.
 */
const installedFields = (manifest: PkgManifest | null, name: string, installedIcons?: Record<string, string>): Partial<APP_INFO> => ({
    installed_frontend: true,
    // Empty string matches the historical `getInstalledVersion` fallback for a
    // missing/invalid manifest; `installed_packageService` stays undefined for
    // legacy manifests with no packageService block (read as managed=true).
    installed_version: typeof manifest?.version === 'string' ? manifest.version : '',
    installed_packageService: manifest?.packageService,
    installed_icon: installedIconOf(name, installedIcons),
});

/**
 * `APP_INFO.installed_icon` for one installed package — the three-valued rule in
 * one place (issue #1452).
 *
 *   map given, key present → the file name  ('icon.svg')
 *   map given, key absent  → `''`           the scan looked; there is no icon
 *   no map                 → `undefined`    unknown; the icon chain guesses
 *
 * Exported because `usePkgCommand` has to apply the SAME rule when it refreshes
 * the open detail tab after an install: two spellings of it would let the list row
 * and the detail pane disagree about the very package that just changed.
 */
export const installedIconOf = (name: string, installedIcons?: Record<string, string>): string | undefined =>
    installedIcons ? (installedIcons[name] ?? '') : undefined;

/**
 * Assemble the App Store catalog from every source that answers.
 *
 * NEVER REJECTS. Each leg degrades on its own: no hub → `mode: 'offline'` with the
 * local archive and the installed packages still listed; no archives on disk →
 * the historical online catalog; no `/public/` listing → nothing shows as
 * installed but the catalog still renders.
 *
 * ---------------------------------------------------------------------------
 * THE LOCAL LEG RUNS FIRST, AND THAT ORDERING IS THE FEATURE (issue #1452)
 * ---------------------------------------------------------------------------
 * The three legs used to go out together under one `Promise.allSettled`. They
 * cannot any more: the local scan is what CARRIES the `localOnly` policy flag, and
 * the entire point of local-only mode is that NO REQUEST LEAVES THE MACHINE. A
 * hub fetch started in parallel and discarded afterwards would still have been
 * sent — the packets are what the customer is air-gapping, not the pixels.
 *
 * So: scan, read the policy, and only then decide whether the hub leg happens at
 * all. The cost is one serialized round trip, and it is usually zero — the scan is
 * cached module-side (`fetchLocalArchiveEntries`), so every build after the first
 * resolves from memory. Even a cold first build must pay it rather than leak.
 *
 * The `/public/` listing is same-origin and unconditional, so it still starts
 * immediately and is awaited at the end.
 */
export const buildCatalog = async ({ search = '', experimentOn }: BuildCatalogOptions): Promise<CatalogResult> => {
    // Same origin, never external, and needed in every mode — no reason to wait.
    const installedPromise = listInstalledNames();

    // LEG 1 — the local archive scan, which also answers "am I allowed to ask the
    // hub?". A scan that throws (documented never-throw, but this function
    // promises never to reject) leaves the default: online.
    let localPkgs: APP_INFO[] = [];
    let localOnly = false;
    // Icon file names of the installed copies, read by the same scan (issue #1452).
    // `undefined` all the way through when the scan did not answer — the icon chain
    // reads that as "unknown" and keeps its historical guess.
    let installedIcons: Record<string, string> | undefined;
    // What each `/public/` directory's own package.json says, plus whether it is a
    // git clone (issue #1452) — the input to `classifyInstalledDir`. Empty whenever
    // the scan did not say, and an empty map classifies every directory as
    // `unclaimed`, i.e. exactly the behaviour that predates stray cards.
    let installedDirs: Record<string, InstalledDirInfo> = {};
    // Per-file problems the SAME scan filed (issue #1452). Read here, next to the
    // other side channels and under the same "only after awaiting the scan" rule,
    // and carried out on the result so a component can hold it in state — see
    // `CatalogResult.scanWarnings`.
    let scanWarnings: LocalArchiveScanError[] = [];
    try {
        localPkgs = await fetchLocalArchiveEntries();
        localOnly = isLocalOnlyMode();
        installedIcons = getInstalledIcons();
        installedDirs = getInstalledDirs();
        scanWarnings = getLastArchiveScanErrors() ?? [];
    } catch {
        /* no local archives, and no policy — fall through to the hub */
    }

    // LEG 2 — the hub, IF the policy allows it. Note there is no `fetchPkgHubList`
    // call on the localOnly path at all: not a call whose result is dropped, not a
    // call behind a filter. That is the deliverable.
    let hubPkgs: APP_INFO[] = [];
    let hubError: string | undefined;
    let mode: CatalogMode;
    if (localOnly) {
        mode = 'localOnly';
    } else {
        try {
            hubPkgs = await fetchPkgHubList();
            mode = 'online';
            lastHubSyncAt = Date.now();
        } catch (reason) {
            hubError = errorMessage(reason);
            mode = 'offline';
        }
    }

    // LEG 3 — the /public/ listing. `listInstalledNames` swallows its own errors.
    const installedNames: Set<string> = await installedPromise;

    // Name-keyed union. Hub order is preserved (it is the catalog's usual
    // ordering); local-only packages follow, then installed-only ones.
    const hubByName = new Map<string, APP_INFO>();
    for (const pkg of hubPkgs) if (pkg?.name) hubByName.set(pkg.name, pkg);
    const localByName = new Map<string, APP_INFO>();
    for (const pkg of localPkgs) if (pkg?.name) localByName.set(pkg.name, pkg);

    const cards = new Map<string, APP_INFO>();
    for (const [name, hub] of hubByName) cards.set(name, mergeCards(hub, localByName.get(name)));
    for (const [name, local] of localByName) if (!cards.has(name)) cards.set(name, mergeCards(undefined, local));

    // Installed state is decided here and nowhere else: neither the hub nor the
    // archive index knows what is actually unpacked under /public/.
    const orphans: APP_INFO[] = [];
    // Cards for directories that were NEVER installed through the App Store, kept
    // apart from `cards` because that map is keyed by package name and a stray
    // shares its package's name — see `strayCard`.
    const strays: APP_INFO[] = [];
    await Promise.all(
        [...installedNames].map(async (name) => {
            const known = cards.get(name);
            // WHAT IS THIS DIRECTORY? (issue #1452) One rule, in `strayDirs.ts`.
            // `!!known` is its first and strongest clause: a name the hub or the
            // local archive publishes is that package's install, whatever its
            // package.json says, so nothing below can reclassify it.
            const verdict = classifyInstalledDir(name, installedDirs[name], !!known);
            if (verdict === 'foreign') {
                // `stage/` — a backend work directory that happens to contain a
                // package copy. IGNORED ENTIRELY: no card, and no warning either.
                //
                // It used to file a warning line. It does not any more, by user
                // decision, and the reasoning is worth keeping because the line
                // looks harmless: the directory is not the App Store's (we can
                // neither act on it nor say what deleting it would break), and the
                // only evidence against it is that its NAME does not start with the
                // package name inside it — which is exactly as true of a deliberate
                // work directory as of a mistake. An unactionable guess re-reported
                // on every catalog build is what teaches users to stop reading the
                // list that also carries the real archive problems.
                return;
            }
            if (isStrayVerdict(verdict)) {
                // An archive unpacked by hand, or a developer's clone. It gets a card
                // — `/public/` is served, so this tree's cgi-bin answers requests —
                // but NOT an installed one: `scripts.install` never ran, so there is
                // no service to start and nothing an uninstall script could undo.
                // `duplicate` is read off the SAME `/public/` listing: when the
                // package's proper directory is here too, both cards are rendered,
                // because both trees exist and both are served.
                const info = installedDirs[name] as InstalledDirInfo;
                strays.push(strayCard(name, info, isStrayRemovable(verdict), installedNames.has(info.name), installedIcons));
                return;
            }
            // THE ONLY PLACE THE NAMING CONVENTION IS CONSULTED. A directory that
            // no catalog has ever heard of only becomes a card when it is named
            // like a package — otherwise a server work directory such as `stage`
            // renders as an App Store card offering uninstall/stop controls for
            // something that is not a package.
            //
            // Scope is synthesis ONLY, never installed-state detection: `known`
            // is short-circuited above, so a package the hub or the local archive
            // knows about is annotated exactly as before even if it is one day
            // published under a name that does not start with `neo-pkg`.
            if (!known && !isPkgDirName(name)) return;
            // `readManifest` is documented never-throw, but this whole function
            // promises never to reject and a regression in it must not be able to
            // blank the panel again — that is the bug being fixed.
            const manifest = await readManifest(name).catch(() => null);
            if (known) {
                Object.assign(known, installedFields(manifest, name, installedIcons));
                return;
            }
            // THE CORE OF THIS ISSUE: installed, but neither the hub (offline)
            // nor the archive directory (never had the zip, or it was cleaned up) can
            // describe it. Synthesize a card from `/public/{name}/package.json`
            // alone — an absent card means no uninstall and no stop control for a
            // package that is installed and possibly running.
            //
            // NO SECOND GATE ON `manifest`. Requiring a readable package.json
            // here looks like cheap defence in depth and is not:
            //   * `readManifest` returns null for a missing file AND for a 404 /
            //     network blip / malformed json alike, so the guard cannot tell a
            //     non-package from a transient read failure — and would drop the
            //     card of a running package on a flaky request, which is exactly
            //     the #1452 regression this file exists to prevent.
            //   * uninstall does not need one: `scripts.uninstall` is best-effort
            //     and `rm -rf /work/public/{name}` always runs (uninstallFlow.ts).
            // So a `neo-pkg-*` directory with no manifest — a `pkg copy` that was
            // interrupted — is precisely the case that most needs a card to clean
            // itself up with. The prefix above already removes the real offender.
            const card = cardFromEntry(name, manifest);
            // Same explicit tagging rule as the merge: nothing here is backed by
            // a local archive (that case is handled above), so these rows are
            // hub-sourced and must be masked offline like any other hub row.
            card.versions = mergeVersions(card.versions, undefined);
            Object.assign(card, installedFields(manifest, name, installedIcons));
            orphans.push(card);
        })
    );
    // Promise.all resolves out of order — sort so the tail of the catalog is stable.
    for (const card of orphans.sort((a, b) => a.name.localeCompare(b.name))) cards.set(card.name, card);
    // Strays go LAST and stay out of `cards`: two of them can share a package name
    // with each other and with a real install (`neo-pkg-foo`, `neo-pkg-foo-main`,
    // `neo-pkg-foo-1.0.5`), so a name-keyed map would silently drop all but one.
    // Sorted by DIRECTORY, which is what distinguishes them on screen.
    const strayCards = strays.sort((a, b) => (a.stray?.dir ?? '').localeCompare(b.stray?.dir ?? ''));

    // issue #1438: gate before the search filter so CATALOG and SEARCH RESULTS agree.
    const gated = filterExperimentPkgs([...cards.values(), ...strayCards], experimentOn);
    const q = search.toLowerCase();
    const pkgs = q
        ? gated.filter(
              (p) =>
                  p.name.toLowerCase().includes(q) ||
                  (p.github?.description ?? '').toLowerCase().includes(q) ||
                  // A stray card is identified on screen by its DIRECTORY, which is
                  // also the name the user saw in the file explorer — so it has to
                  // be searchable. No other card has one, so nothing else changes.
                  (p.stray?.dir ?? '').toLowerCase().includes(q)
          )
        : gated;

    // `scanWarnings` is the ARCHIVE SCAN'S list and nothing else — passed straight
    // through, in the scan's own order. No `/public/` directory contributes to it:
    // a stray one has a card instead, and a `foreign` one is ignored (see the
    // verdict branch above).
    return {
        pkgs,
        mode,
        hubError,
        lastSyncAt: lastHubSyncAt,
        scanWarnings,
    };
};
