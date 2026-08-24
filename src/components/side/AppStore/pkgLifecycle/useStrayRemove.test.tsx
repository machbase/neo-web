// issue #1452 — the hook behind the stray card's `Remove directory`.
//
// Two things are asserted here and nowhere else:
//   1. WHAT IT REFUSES TO EVEN TRY. The directory has to be one the catalog on
//      screen currently offers for removal, and the set of package names it must
//      never delete into is read from that same catalog.
//   2. WHAT HAPPENS AFTER. `/public/` just changed, so the cached server-side scan
//      is dropped and the catalog rebuilt — otherwise the card stays on screen
//      describing a directory that is gone.

import { renderHook, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, useSetRecoilState } from 'recoil';
import type { ReactNode } from 'react';
import { useStrayRemove } from './useStrayRemove';
import { runStrayRemove } from './strayRemove';
import { buildCatalog } from '../catalog';
import { invalidateLocalArchiveCache } from '@/api/repository/onpremCatalog';
import { gCatalogScanWarnings, gSearchPkgs } from '@/recoil/appStore';

jest.mock('./strayRemove', () => ({
    ...jest.requireActual('./strayRemove'),
    runStrayRemove: jest.fn(),
}));
jest.mock('../catalog', () => ({ buildCatalog: jest.fn() }));
jest.mock('@/api/repository/onpremCatalog', () => ({ invalidateLocalArchiveCache: jest.fn() }));
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), isCurUserEqualAdmin: jest.fn(() => true) }));
jest.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ getExperiment: () => false }) }));
jest.mock('@/design-system/components', () => ({
    Toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { isCurUserEqualAdmin } from '@/utils';

const mockRun = runStrayRemove as jest.MockedFunction<typeof runStrayRemove>;
const mockBuild = buildCatalog as jest.MockedFunction<typeof buildCatalog>;
const mockInvalidate = invalidateLocalArchiveCache as jest.MockedFunction<typeof invalidateLocalArchiveCache>;
const mockIsAdmin = isCurUserEqualAdmin as jest.MockedFunction<typeof isCurUserEqualAdmin>;

const wrapper = ({ children }: { children: ReactNode }) => <RecoilRoot>{children}</RecoilRoot>;

const card = (name: string, over: Record<string, unknown> = {}) => ({ name, latest_version: '', published_at: '', github: {}, ...over }) as any;

/** The catalog the user is looking at when the button is clicked. */
const CATALOG = [
    card('neo-pkg-foo', { installed_frontend: true }),
    card('neo-pkg-foo', { stray: { dir: 'neo-pkg-foo-main', removable: true, duplicate: true } }),
    card('neo-pkg-bar', { stray: { dir: 'neo-pkg-bar-dev', removable: false, duplicate: false } }),
];

const renderRemove = () =>
    renderHook(
        () => ({
            remove: useStrayRemove(),
            setPkgs: useSetRecoilState(gSearchPkgs),
            warnings: useRecoilValue(gCatalogScanWarnings),
            pkgs: useRecoilValue(gSearchPkgs),
        }),
        { wrapper }
    );

const seed = async (result: ReturnType<typeof renderRemove>) => {
    await act(async () => {
        result.result.current.setPkgs({ installed: [], exact: [], broken: [], possibles: CATALOG });
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin.mockReturnValue(true);
    mockRun.mockResolvedValue({ ok: true, log: '' });
    mockBuild.mockResolvedValue({ pkgs: [], mode: 'online', hubError: undefined, lastSyncAt: 1, scanWarnings: [{ archive: 'x.zip', error: 'bad' }] });
});

test('a directory the catalog offers is removed, and the KNOWN package names travel with it', async () => {
    const r = renderRemove();
    await seed(r);

    await act(async () => {
        await r.result.current.remove('neo-pkg-foo-main');
    });

    expect(mockRun).toHaveBeenCalledTimes(1);
    const [dir, known] = mockRun.mock.calls[0];
    expect(dir).toBe('neo-pkg-foo-main');
    // Only the non-stray cards — a stray's own name must not protect the very
    // directory the user is removing (both are called `neo-pkg-foo` here).
    expect([...known]).toEqual(['neo-pkg-foo']);
});

// THE TIGHT GATE. Anything that is not a removable stray in the CURRENT catalog
// never reaches the shell — a clone, a real package, or a name nobody listed.
test.each([['a clone', 'neo-pkg-bar-dev'], ['an installed package', 'neo-pkg-foo'], ['an unlisted directory', 'stage']])(
    '%s is refused before anything runs',
    async (_label, dir) => {
        const r = renderRemove();
        await seed(r);

        let out: unknown;
        await act(async () => {
            out = await r.result.current.remove(dir);
        });

        expect(out).toBeNull();
        expect(mockRun).not.toHaveBeenCalled();
    }
);

test('a non-admin never gets that far', async () => {
    mockIsAdmin.mockReturnValue(false);
    const r = renderRemove();
    await seed(r);

    await act(async () => {
        await r.result.current.remove('neo-pkg-foo-main');
    });

    expect(mockRun).not.toHaveBeenCalled();
});

test('success drops the scan cache and republishes the catalog', async () => {
    const r = renderRemove();
    await seed(r);

    await act(async () => {
        await r.result.current.remove('neo-pkg-foo-main');
    });

    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockBuild).toHaveBeenCalledTimes(1);
    // …and the rebuild's findings land in the atom the panel renders, so a warning
    // about the directory just removed cannot survive the removal.
    expect(r.result.current.warnings).toEqual([{ archive: 'x.zip', error: 'bad' }]);
    expect(r.result.current.pkgs.possibles).toEqual([]);
});

// A FAILED rm MUST NOT REBUILD. The directory is still there, and rebuilding would
// re-render the same card with no indication that anything went wrong.
test('a failure leaves the cache and the catalog alone', async () => {
    mockRun.mockResolvedValue({ ok: false, log: '', reason: 'permission denied' });
    const r = renderRemove();
    await seed(r);

    await act(async () => {
        await r.result.current.remove('neo-pkg-foo-main');
    });

    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockBuild).not.toHaveBeenCalled();
    expect(r.result.current.pkgs.possibles).toEqual(CATALOG);
});
