// issue #1452 — the catalog-provenance judgement, asserted on its own.
//
// These cases came over UNCHANGED from AppStoreBanner.test.tsx when the banner was
// replaced by a header icon. The surface moved; the rule did not, and that is the
// point of keeping them: `resolveCatalogState` is `resolveBannerState` renamed.

import { CATALOG_STATUS_LABEL, formatCatalogTooltip, formatLastSync, resolveCatalogState } from './catalogState';

const LAST_SYNC = new Date('2026-02-03T04:05:06').getTime();

describe('resolveCatalogState', () => {
    test('online whenever the hub answered — regardless of how many cards there are', () => {
        expect(resolveCatalogState({ mode: 'online' }, 0)).toBe('online');
        expect(resolveCatalogState({ mode: 'online' }, 12)).toBe('online');
    });

    test('undefined / missing mode stays silent instead of flashing an error', () => {
        expect(resolveCatalogState(undefined, 0)).toBe('online');
        expect(resolveCatalogState({} as any, 0)).toBe('online');
    });

    test('hub failure with cards ⇒ offline, without cards ⇒ failed', () => {
        expect(resolveCatalogState({ mode: 'offline' }, 3)).toBe('offline');
        expect(resolveCatalogState({ mode: 'offline' }, 0)).toBe('failed');
    });

    // The card count decides offline-vs-failed ONLY for a hub that was asked and
    // did not answer. An air-gapped server with an empty archive directory is
    // configured, not broken, so it must not fall through to `failed`.
    test('localOnly is its own state at ANY card count — never "failed"', () => {
        expect(resolveCatalogState({ mode: 'localOnly' }, 5)).toBe('localOnly');
        expect(resolveCatalogState({ mode: 'localOnly' }, 0)).toBe('localOnly');
    });
});

describe('formatLastSync', () => {
    test('formats a real epoch ms value', () => {
        expect(formatLastSync(LAST_SYNC)).toBe('2026-02-03 04:05:06');
    });

    test('a server that never reached the hub reads as "never", not as an error', () => {
        expect(formatLastSync(undefined)).toBe('never');
        expect(formatLastSync(0)).toBe('never');
        expect(formatLastSync(Number.NaN)).toBe('never');
    });
});

// The tooltip is the only place the explanation can live now, so the three states
// have to stay tellable apart in text alone.
describe('formatCatalogTooltip', () => {
    test('each state produces its own sentence, and none repeats another', () => {
        const localOnly = formatCatalogTooltip('localOnly', { mode: 'localOnly' });
        const offline = formatCatalogTooltip('offline', { mode: 'offline', lastSyncAt: LAST_SYNC });
        const failed = formatCatalogTooltip('failed', { mode: 'offline' });

        expect(new Set([localOnly, offline, failed]).size).toBe(3);
        expect(localOnly).toContain(CATALOG_STATUS_LABEL.localOnly);
        expect(offline).toContain(CATALOG_STATUS_LABEL.offline);
        expect(failed).toContain(CATALOG_STATUS_LABEL.failed);
    });

    test('localOnly names the config file and borrows none of the failure vocabulary', () => {
        const text = formatCatalogTooltip('localOnly', { mode: 'localOnly', hubError: 'getaddrinfo ENOTFOUND' });

        expect(text).toContain('/public/.pkg-conf.json');
        expect(text).not.toMatch(/unreachable|could not be reached|unavailable|failed|error/i);
        // Nothing was attempted, so nothing can be re-attempted.
        expect(text).not.toMatch(/refresh/i);
    });

    test('the failure states carry the hub error when there is one and point at Refresh', () => {
        expect(formatCatalogTooltip('failed', { mode: 'offline', hubError: 'status code 503' })).toContain('status code 503');
        expect(formatCatalogTooltip('failed', { mode: 'offline' })).toContain('no local archive was found');
        expect(formatCatalogTooltip('offline', { mode: 'offline', lastSyncAt: LAST_SYNC })).toContain('Last synced 2026-02-03 04:05:06');
        expect(formatCatalogTooltip('offline', { mode: 'offline' })).toMatch(/Press Refresh/);
        expect(formatCatalogTooltip('failed', { mode: 'offline' })).toMatch(/Press Refresh/);
    });
});
