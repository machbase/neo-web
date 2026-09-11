// issue #1452 — the header catalog indicator that replaced the full-width banner.
//
// The banner's rendering tests are carried over in substance: same copy, same
// silence at `online`, same refusal to describe local-only as a failure. What
// changed is WHERE the copy lives (a `title` tooltip instead of two text lines)
// and that there is no control at all.

import { render, screen } from '@testing-library/react';
import { CatalogStatusIcon } from './CatalogStatusIcon';
import { CATALOG_STATUS_LABEL } from './catalogState';

const LAST_SYNC = new Date('2026-02-03T04:05:06').getTime();

const titleOf = () => screen.getByRole('status').getAttribute('title') ?? '';

describe('CatalogStatusIcon', () => {
    test('online renders nothing at all — no icon, no extra height in the header row', () => {
        const { container } = render(<CatalogStatusIcon pStatus={{ mode: 'online' }} pEntryCount={4} />);

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('an unknown / absent status is silent too, so nothing flashes before the first build', () => {
        const { container } = render(<CatalogStatusIcon pStatus={undefined} pEntryCount={0} />);

        expect(container).toBeEmptyDOMElement();
    });

    test('offline names the mode and the last successful sync in its tooltip', () => {
        render(<CatalogStatusIcon pStatus={{ mode: 'offline', hubError: 'getaddrinfo ENOTFOUND', lastSyncAt: LAST_SYNC }} pEntryCount={2} />);

        expect(screen.getByRole('status')).toHaveAccessibleName(CATALOG_STATUS_LABEL.offline);
        expect(titleOf()).toContain('Offline — hub unreachable');
        expect(titleOf()).toContain('Last synced 2026-02-03 04:05:06');
        expect(titleOf()).toContain('getaddrinfo ENOTFOUND');
    });

    test('offline never claims the archives were integrity-checked', () => {
        render(<CatalogStatusIcon pStatus={{ mode: 'offline', lastSyncAt: LAST_SYNC }} pEntryCount={2} />);

        expect(titleOf()).not.toMatch(/verified/i);
        expect(titleOf()).not.toMatch(/checksum|sha256/i);
    });

    test('hub failure with zero entries reports the failure and surfaces the hub error', () => {
        render(<CatalogStatusIcon pStatus={{ mode: 'offline', hubError: 'Request failed with status code 503' }} pEntryCount={0} />);

        expect(screen.getByRole('status')).toHaveAccessibleName(CATALOG_STATUS_LABEL.failed);
        expect(titleOf()).toContain('Catalog unavailable');
        expect(titleOf()).toContain('Request failed with status code 503');
    });

    test('hub failure without a message still explains itself', () => {
        render(<CatalogStatusIcon pStatus={{ mode: 'offline' }} pEntryCount={0} />);

        expect(titleOf()).toContain('The package hub could not be reached and no local archive was found.');
    });

    // Each state must be distinguishable at a glance AND on hover: the icon carries
    // its own modifier class, and no two tooltips read alike.
    test('the two non-silent states render different markers and different tooltips', () => {
        const titles = new Set<string>();
        const classes: string[] = [];
        const cases = [
            { status: { mode: 'offline', lastSyncAt: LAST_SYNC } as const, entries: 3 },
            { status: { mode: 'offline' } as const, entries: 0 },
        ];

        for (const c of cases) {
            const { unmount } = render(<CatalogStatusIcon pStatus={c.status} pEntryCount={c.entries} />);
            const el = screen.getByRole('status');
            titles.add(el.getAttribute('title') ?? '');
            classes.push(el.className);
            unmount();
        }

        expect(titles.size).toBe(2);
        expect(classes).toEqual([
            'app-store-catalog-status app-store-catalog-status--offline',
            'app-store-catalog-status app-store-catalog-status--failed',
        ]);
    });

    // THE POINT OF REPLACING THE BANNER. The header's Refresh button already drops
    // the caches, resets the hub backoff and rebuilds; a Retry here was a second
    // control wired to the identical handler. Do not bring it back.
    test('renders NO button in any state — Refresh in the header is the only retry', () => {
        for (const [status, entries] of [
            [{ mode: 'offline' }, 3],
            [{ mode: 'offline' }, 0],
        ] as const) {
            const { unmount } = render(<CatalogStatusIcon pStatus={status} pEntryCount={entries} />);
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(screen.queryByText(/retry/i)).not.toBeInTheDocument();
            unmount();
        }
    });
});
