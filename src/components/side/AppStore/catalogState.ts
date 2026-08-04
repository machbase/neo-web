// issue #1452 — how the App Store decides what (if anything) to say about where
// its catalog came from. Pure derivation, kept out of CatalogStatusIcon.tsx so the
// state machine can be asserted directly and the .tsx stays component-only.
//
// This file was `catalogBannerState.ts` while the statement was a full-width
// banner. The banner is gone (it cost too much vertical space in a narrow side
// panel, and its Retry button was a duplicate of the header's Refresh), but the
// JUDGEMENT is unchanged and deliberately so — only the surface that renders it
// moved, into a single-icon indicator in the panel header.

import moment from 'moment';
import type { CatalogStatus } from '@/recoil/appStore';

/**
 *   online     hub answered              → say nothing; the normal case stays silent
 *   localOnly  hub deliberately not used → say so; nothing failed
 *   offline    hub failed, cards exist   → what you see is local archives + installed
 *                                          packages, not the full hub catalog
 *   failed     hub failed, no cards      → nothing to show at all; the only genuine error
 *
 * `localOnly` is checked BEFORE the card count. An air-gapped server with an empty
 * archive directory has an empty panel and nothing wrong with it, so it must not
 * fall through to `failed` and accuse the network of something the operator did on
 * purpose.
 */
export type CatalogState = 'online' | 'localOnly' | 'offline' | 'failed';

/**
 * `mode` is the hub-provenance verdict and nothing else (see gCatalogStatus), so
 * it — not `navigator.onLine` — is what splits "silent" from "say something": an
 * air-gapped LAN is up, raw.githubusercontent is simply not on it.
 *
 * The card count is the second input because a hub FAILURE is only an *error* when
 * it leaves the panel empty. With local archives or installed packages present,
 * the panel is still fully usable and the indicator is an explanation, not an alarm.
 *
 * An absent status (or an absent `mode`) reads as `online` rather than as an
 * error, so nothing flashes before the first build lands.
 */
export const resolveCatalogState = (pStatus: CatalogStatus | undefined, pEntryCount: number): CatalogState => {
    if (!pStatus || !pStatus.mode || pStatus.mode === 'online') return 'online';
    if (pStatus.mode === 'localOnly') return 'localOnly';
    return pEntryCount > 0 ? 'offline' : 'failed';
};

/**
 * There is deliberately NO `allowsRetry` predicate here any more.
 *
 * The catalog indicator renders no control at all: the panel header's Refresh
 * button already does the one thing a retry could ever do (it drops the caches,
 * calls `resetPkgHubBackoff()` and rebuilds), so a second affordance could only
 * duplicate it — and in `localOnly` it would invite an admin to go hunting for a
 * network fault that does not exist. Reintroducing a Retry here means
 * reintroducing that duplication; don't.
 */

/**
 * `lastSyncAt` is the last *successful* sync and survives later failures, so it
 * can be printed as-is. A server that has never reached the hub has no value at
 * all — that is not an error, it is a fresh air-gapped install.
 */
export const formatLastSync = (lastSyncAt?: number): string => {
    if (typeof lastSyncAt !== 'number' || !Number.isFinite(lastSyncAt) || lastSyncAt <= 0) return 'never';
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : 'never';
};

/**
 * The short name for every non-silent state, in ONE table. Carried over verbatim
 * from the banner this replaced — the wording was already reviewed and tested.
 *
 * `localOnly` and `offline` are the pair that must never be confused, so they are
 * written next to each other and worded to share no vocabulary: one says
 * "disabled … by configuration", the other says "unreachable". An operator who
 * reads the wrong one either hunts a network fault that does not exist or shrugs
 * off a real outage as policy — both are the failure this table exists to prevent.
 */
export const CATALOG_STATUS_LABEL = {
    localOnly: 'Local-only (policy)',
    offline: 'Offline — hub unreachable',
    failed: 'Catalog unavailable',
} as const;

/**
 * The one line that must be unmistakable.
 *
 * It names the FILE, because the mode is invisible otherwise: the judgement rule
 * only flips on a literal `{ "localOnly": true }`, so a misspelt key leaves the
 * server quietly online and the indicator absent. Someone wondering why the switch
 * did nothing needs the path in front of them.
 */
export const LOCAL_ONLY_DESC = 'Package hub disabled by /public/.pkg-conf.json — showing local archives only.';

/** Said when the hub failed AND the merge produced no cards at all. */
export const FAILED_DESC = 'The package hub could not be reached and no local archive was found.';

/**
 * The whole explanation, as one `title` string — the indicator is a single icon,
 * so its tooltip is the ONLY channel and the banner's title line and description
 * line are joined here rather than one of them being dropped.
 *
 * The failure states end by pointing at Refresh: that is where the retry went, and
 * naming it is what makes removing the duplicate button safe. `localOnly` gets no
 * such suffix — the hub was never contacted, so there is nothing to re-attempt,
 * and suggesting otherwise is the exact dead end this feature avoids.
 */
export const formatCatalogTooltip = (pState: Exclude<CatalogState, 'online'>, pStatus: CatalogStatus | undefined): string => {
    // NEVER surfaced in localOnly: there is no hub error there, and a stale one
    // from an earlier build must not read as a fault.
    const hubError = typeof pStatus?.hubError === 'string' ? pStatus.hubError.trim() : '';
    if (pState === 'localOnly') return `${CATALOG_STATUS_LABEL.localOnly} — ${LOCAL_ONLY_DESC}`;
    if (pState === 'failed') return `${CATALOG_STATUS_LABEL.failed} — ${hubError || FAILED_DESC} Press Refresh to try the hub again.`;
    return `${CATALOG_STATUS_LABEL.offline} — showing local archives and installed packages. Last synced ${formatLastSync(pStatus?.lastSyncAt)}.${
        hubError ? ` (${hubError})` : ''
    } Press Refresh to try the hub again.`;
};
