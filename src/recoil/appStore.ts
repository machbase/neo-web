import { SEARCH_RES } from '@/api/repository/appStore';
import type { LocalArchiveScanError } from '@/api/repository/onpremCatalog';
import { atom, selector } from 'recoil';
/** pkgs origin list */
export const gSearchPkgs = atom({
    key: 'gSearchPkgs',
    default: {
        installed: [],
        exact: [],
        possibles: [],
        broken: [],
    } as SEARCH_RES,
});
/** Installed pkgs */
export const gInstalledPkgs = selector({
    key: 'gInstalledPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).installed ?? [];
    },
});
/** Exact (Usable) pkgs */
export const gExactPkgs = selector({
    key: 'gExactPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).exact ?? [];
    },
});
/** Possibles pkgs */
export const gPossiblePkgs = selector({
    key: 'gPossiblePkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).possibles ?? [];
    },
});
/** Broken pkgs */
export const gBrokenPkgs = selector({
    key: 'gBrokenPkgs',
    get: ({ get }) => {
        return get(gSearchPkgs).broken ?? [];
    },
});
/**
 * issue #1452 — how the last catalog build got (or did not get) its hub data.
 *
 * THREE STATES, AND THE THIRD IS NOT A FAILURE:
 *
 *   online     the hub answered
 *   offline    the hub was ASKED and did not answer — network, proxy, outage.
 *              Something is wrong and retrying is the right response.
 *   localOnly  the hub was never asked, because `/public/.pkg-conf.json` says
 *              `{ "localOnly": true }`. Nothing is broken; an operator turned it
 *              off. Offering "Retry" here would send an admin chasing a network
 *              fault that does not exist, which is why this is its own state and
 *              not an `online: false` with a footnote.
 *
 * Deliberately NOT derived from `navigator.onLine`, which reports the LAN link and
 * says nothing about whether raw.githubusercontent is reachable from an
 * air-gapped site.
 *
 * This REPLACED a boolean `online`. Consumers that need the boolean derive it as
 * `mode === 'online'` — one source of truth, so a third state cannot be added
 * again later and silently read as "online" somewhere.
 */
export type CatalogMode = 'online' | 'offline' | 'localOnly';

export interface CatalogStatus {
    mode: CatalogMode;
    /** Message from the failed hub fetch. Only ever set in `offline`. */
    hubError?: string;
    /** Epoch ms of the last *successful* hub sync; survives later failures. */
    lastSyncAt?: number;
}
/**
 * Defaults to `online` so the UI shows no offline affordance during the first
 * build; the first `buildCatalog` overwrites it either way.
 */
export const gCatalogStatus = atom<CatalogStatus>({
    key: 'gCatalogStatus',
    default: { mode: 'online' },
});

/**
 * issue #1452 — per-ARCHIVE / per-DIRECTORY problems the last scan found.
 *
 * A SEPARATE ATOM FROM `gCatalogStatus`, ON PURPOSE. `CatalogStatus` is the
 * hub-provenance verdict for the catalog AS A WHOLE ("did the hub answer?") and
 * `resolveCatalogState` derives the header indicator from exactly that. These
 * warnings are the opposite scope — INDIVIDUAL files and directories, each still
 * broken (or still fine) no matter how the hub leg went. Two reasons that is not a
 * fourth field on `CatalogStatus`:
 *
 *   * a warning list living inside the indicator's input invites a future reader
 *     to gate it on the indicator's state, and `resolveCatalogState` returns
 *     `'online'` — i.e. render nothing — for the single most common case. A
 *     manually extracted directory on a perfectly online server would then be
 *     invisible, which is the exact bug this feature exists to fix;
 *   * the two change on different schedules; keeping them apart means the
 *     indicator does not re-render when only a warning text moved, and vice versa.
 *
 * The values are `LocalArchiveScanError` records exactly as the scan filed them
 * — this atom TRANSPORTS the judgement, it does not make one. What counts as a
 * warning is decided in `onpremCatalog.ts` and nowhere else.
 */
export const gCatalogScanWarnings = atom<LocalArchiveScanError[]>({
    key: 'gCatalogScanWarnings',
    default: [],
});

// issue #1452 — there is deliberately NO `gArchivePaths` atom (it used to hold
// `name → version → /work/public/<zip>`). Nothing in the browser needs an
// archive path: the offline install sends `{ name, version }` and the server
// finds the zip with the same scan that built the catalog rows
// (AppStore/pkgLifecycle/archiveScript.ts). An atom of file paths could only go
// stale between the scan that filled it and the click that used it.

/** Search pkg name */
export const gSearchPkgName = atom({
    key: 'gSearchPkgName',
    default: '',
});
// THERE IS NO `gActiveAppSide` ANY MORE.
//
// It held "which package's side.html the panel is showing", which is exactly what
// `gActivePkgView` below now holds — and for a while both existed, written by six
// different call sites that all had to agree. They did not: closing a pill reset
// one and not the other, so re-selecting the same app tab could not bring the pill
// back, and the panel rendered from one atom while the main area synced the other.
//
// Consumers outside the App Store (MainContent, FileExplorer) use
// `useOpenPkgView` / `useClosePkgView` from AppStore/pkgViews.ts instead. Do not
// reintroduce a second atom for this fact.

/**
 * PACKAGE VIEWS OPENED AS PILLS IN THE APP STORE PANEL, in the order they were
 * opened. Package NAMES, not indices: the catalog list is rebuilt on every
 * search keystroke and its ordering is not stable, so an index would point at a
 * different package one debounce later.
 *
 * The catalog itself is NOT in here. It is a fixed first chip that cannot be
 * closed, so representing it as a member of this list would only create a state
 * where it is absent.
 */
export const gOpenPkgViews = atom<string[]>({
    key: 'gOpenPkgViews',
    default: [],
});

/**
 * Which pill the panel is showing. `null` IS the catalog — the panel's default
 * and the state it falls back to whenever the active pill is closed or its
 * package is uninstalled.
 *
 * Kept apart from `gOpenPkgViews` rather than being derived from it (e.g. "last
 * entry is active") so that closing an inactive pill does not move the view, and
 * so returning to the catalog does not have to unmake the open set.
 */
export const gActivePkgView = atom<string | null>({
    key: 'gActivePkgView',
    default: null,
});

/** Current machbase-neo server version (from /api/check `server.version`), seeded
 * by Home.getInfo. Consumed by the AppStore minServer eligibility gate (#1369).
 * Empty string until login info loads → eligibility treats it as "unknown server"
 * and does not block (see isEligible). */
export const gServerVersion = atom<string>({
    key: 'gServerVersion',
    default: '',
});

import type { PkgHealthStatus } from '@/components/side/AppStore/pkgLifecycle/steps/pkgHealth';

/** Per-package cgi-bin/health probe result. reachable=true ⇒ start/stop are
 * usable; running flips which of the two is shown. Populated on mount, after
 * install/update/start/stop, and re-probed on refresh; dropped on uninstall. */
export const gPkgHealth = atom<Record<string, PkgHealthStatus>>({
    key: 'gPkgHealth',
    default: {},
});

export type PkgCommand = 'install' | 'uninstall' | 'update' | 'start' | 'stop';

/** Per-package in-flight command. Shared between catalog inline buttons and
 * the detail view so a single package can only have one operation at a time. */
export const gPkgBusy = atom<Record<string, PkgCommand | null>>({
    key: 'gPkgBusy',
    default: {},
});
