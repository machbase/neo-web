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
 *   offline    hub failed, cards exist   → what you see is local archives + installed
 *                                          packages, not the full hub catalog
 *   failed     hub failed, no cards      → nothing to show at all; the only genuine error
 */
export type CatalogState = 'online' | 'offline' | 'failed';

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
    return pEntryCount > 0 ? 'offline' : 'failed';
};

/**
 * There is deliberately NO `allowsRetry` predicate here any more.
 *
 * The catalog indicator renders no control at all: the panel header's Refresh
 * button already does the one thing a retry could ever do (it drops the caches,
 * calls `resetPkgHubBackoff()` and rebuilds), so a second affordance could only
 * duplicate it. Reintroducing a Retry here means reintroducing that duplication;
 * don't.
 */

/**
 * `lastSyncAt` is the last *successful* sync and survives later failures, so it
 * can be printed as-is. A server that has never reached the hub has no value at
 * all — that is not an error, it is a fresh install on a closed network.
 */
export const formatLastSync = (lastSyncAt?: number): string => {
    if (typeof lastSyncAt !== 'number' || !Number.isFinite(lastSyncAt) || lastSyncAt <= 0) return 'never';
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : 'never';
};

/**
 * The short name for every non-silent state, in ONE table. Carried over verbatim
 * from the banner this replaced — the wording was already reviewed and tested.
 */
export const CATALOG_STATUS_LABEL = {
    offline: 'Offline — hub unreachable',
    failed: 'Catalog unavailable',
} as const;

/** Said when the hub failed AND the merge produced no cards at all. */
export const FAILED_DESC = 'The package hub could not be reached and no local archive was found.';

/**
 * The whole explanation, as one `title` string — the indicator is a single icon,
 * so its tooltip is the ONLY channel and the banner's title line and description
 * line are joined here rather than one of them being dropped.
 *
 * Both states end by pointing at Refresh: that is where the retry went, and
 * naming it is what makes removing the duplicate button safe.
 */
export const formatCatalogTooltip = (pState: Exclude<CatalogState, 'online'>, pStatus: CatalogStatus | undefined): string => {
    const hubError = typeof pStatus?.hubError === 'string' ? pStatus.hubError.trim() : '';
    if (pState === 'failed') return `${CATALOG_STATUS_LABEL.failed} — ${hubError || FAILED_DESC} Press Refresh to try the hub again.`;
    return `${CATALOG_STATUS_LABEL.offline} — showing local archives and installed packages. Last synced ${formatLastSync(pStatus?.lastSyncAt)}.${
        hubError ? ` (${hubError})` : ''
    } Press Refresh to try the hub again.`;
};
