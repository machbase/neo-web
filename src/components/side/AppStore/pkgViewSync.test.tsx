// THE THREE SYNC CONTRACTS between the App Store panel's pill switcher and the
// main area's tabs. They used to be spread over two atoms and six writers that
// had to agree; these are the rules that replaced that.
//
//   main area → sidebar   selecting an `APP: x` tab reveals x (MainContent)
//   sidebar → main area   selecting x's pill activates or CREATES its tab
//   closing either        ends the session on BOTH surfaces
//
// The reveal/select hooks are tested directly rather than through AppStoreSide,
// which would drag in the debounced catalog build and the health probe for a
// question about two state writes.

import { act, renderHook, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, type MutableSnapshot } from 'recoil';
import { gActivePkgView, gOpenPkgViews } from '@/recoil/appStore';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useClosePkgSession, useRevealPkgView, useSelectPkgView } from './pkgViews';
import { invalidatePkgHtmlCache, probePkgHtml } from './pkgHtml';

/** Which of the two files a package "ships" in a given test. */
let ships: { main: boolean; side: boolean } = { main: false, side: false };

const wrapper =
    (init?: (snapshot: MutableSnapshot) => void) =>
    ({ children }: { children: React.ReactNode }) =>
        <RecoilRoot initializeState={init}>{children}</RecoilRoot>;

beforeEach(() => {
    invalidatePkgHtmlCache();
    ships = { main: false, side: false };
    global.fetch = jest.fn((url: string) => {
        const wants = String(url).includes('main.html') ? 'main' : 'side';
        const ok = ships[wants as 'main' | 'side'];
        return Promise.resolve({ ok, headers: { get: () => (ok ? 'text/html' : 'text/plain') } });
    }) as any;
});

// ---------------------------------------------------------------------------
// MAIN AREA → SIDEBAR
// ---------------------------------------------------------------------------
describe('useRevealPkgView', () => {
    const setup = () =>
        renderHook(() => ({ reveal: useRevealPkgView(), open: useRecoilValue(gOpenPkgViews), active: useRecoilValue(gActivePkgView) }), {
            wrapper: wrapper(),
        });

    test('a package that ships side.html gets a pill and becomes active', async () => {
        ships = { main: true, side: true };
        const { result } = setup();

        await act(async () => {
            await result.current.reveal('neo-pkg-a');
        });

        expect(result.current.open).toEqual(['neo-pkg-a']);
        expect(result.current.active).toBe('neo-pkg-a');
    });

    test('a package with NO side.html gets no pill — there would be nothing to show', async () => {
        ships = { main: true, side: false };
        const { result } = setup();

        let revealed: boolean | undefined;
        await act(async () => {
            revealed = await result.current.reveal('neo-pkg-a');
        });

        expect(revealed).toBe(false);
        expect(result.current.open).toEqual([]);
        expect(result.current.active).toBeNull();
    });

    test('revealing the same package twice does not duplicate its pill', async () => {
        ships = { main: false, side: true };
        const { result } = setup();

        await act(async () => {
            await result.current.reveal('neo-pkg-a');
            await result.current.reveal('neo-pkg-a');
        });

        expect(result.current.open).toEqual(['neo-pkg-a']);
    });
});

// ---------------------------------------------------------------------------
// SIDEBAR → MAIN AREA
// ---------------------------------------------------------------------------
describe('useSelectPkgView', () => {
    const setup = (boards: any[] = []) =>
        renderHook(
            () => ({
                select: useSelectPkgView(),
                active: useRecoilValue(gActivePkgView),
                boards: useRecoilValue(gBoardList),
                selectedTab: useRecoilValue(gSelectedTab),
            }),
            {
                wrapper: wrapper(({ set }) => {
                    set(gBoardList, boards);
                    set(gSelectedTab, 'other');
                }),
            }
        );

    test('selecting a pill makes it the active view', async () => {
        ships = { main: false, side: true };
        const { result } = setup();

        await act(async () => {
            await result.current.select('neo-pkg-a');
        });

        expect(result.current.active).toBe('neo-pkg-a');
    });

    // THE ANSWER TO "what if the tab was closed?". Closing an APP: tab leaves the
    // pill open on purpose, so a pill that could only ACTIVATE an existing tab
    // would be a dead end — nothing else can bring that tab back.
    test('a package with main.html and no tab gets one CREATED and selected', async () => {
        ships = { main: true, side: true };
        const { result } = setup([]);

        await act(async () => {
            await result.current.select('neo-pkg-a');
        });

        await waitFor(() => expect(result.current.boards).toHaveLength(1));
        expect(result.current.boards[0]).toMatchObject({ type: 'appView', name: 'APP: neo-pkg-a', code: { appName: 'neo-pkg-a' } });
        expect(result.current.selectedTab).toBe(result.current.boards[0].id);
    });

    test('an existing tab is reused rather than duplicated', async () => {
        ships = { main: true, side: true };
        const existing = { id: 'tab-a', type: 'appView', name: 'APP: neo-pkg-a', code: { appName: 'neo-pkg-a' } };
        const { result } = setup([existing]);

        await act(async () => {
            await result.current.select('neo-pkg-a');
        });

        await waitFor(() => expect(result.current.selectedTab).toBe('tab-a'));
        expect(result.current.boards).toHaveLength(1);
    });

    test('a package with no main.html switches the panel but opens no tab', async () => {
        ships = { main: false, side: true };
        const { result } = setup([]);

        await act(async () => {
            await result.current.select('neo-pkg-a');
        });

        expect(result.current.active).toBe('neo-pkg-a');
        expect(result.current.boards).toEqual([]);
    });

    test('selecting the catalog goes back to it and touches no tab', async () => {
        ships = { main: true, side: true };
        const { result } = setup([]);

        await act(async () => {
            await result.current.select(null);
        });

        expect(result.current.active).toBeNull();
        expect(result.current.boards).toEqual([]);
        expect(result.current.selectedTab).toBe('other');
    });
});

// ---------------------------------------------------------------------------
// THE PROBE THEY BOTH SHARE
// ---------------------------------------------------------------------------
describe('probePkgHtml', () => {
    test('asks once and remembers — a pill switch must not re-issue the requests', async () => {
        ships = { main: true, side: true };

        await probePkgHtml('neo-pkg-a');
        await probePkgHtml('neo-pkg-a');
        await probePkgHtml('neo-pkg-a');

        // Two URLs, one round each.
        expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
    });

    test('concurrent askers share one round of requests', async () => {
        ships = { main: true, side: true };

        await Promise.all([probePkgHtml('neo-pkg-a'), probePkgHtml('neo-pkg-a'), probePkgHtml('neo-pkg-a')]);

        expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
    });

    // A network blip makes `checkHtmlExists` answer `false` for both, which is
    // indistinguishable from "ships nothing". Caching that would pin a healthy
    // package to "no pill, no app" until the next install.
    test('an all-false answer is NOT remembered, so a blip is retried', async () => {
        ships = { main: false, side: false };
        await probePkgHtml('neo-pkg-a');
        const afterFirst = (global.fetch as jest.Mock).mock.calls.length;

        ships = { main: true, side: true };
        const second = await probePkgHtml('neo-pkg-a');

        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(afterFirst);
        expect(second).toEqual({ main: true, side: true });
    });

    test('an empty name never reaches the network', async () => {
        expect(await probePkgHtml('')).toEqual({ main: false, side: false });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('invalidating drops what was remembered', async () => {
        ships = { main: true, side: true };
        await probePkgHtml('neo-pkg-a');
        const before = (global.fetch as jest.Mock).mock.calls.length;

        invalidatePkgHtmlCache();
        await probePkgHtml('neo-pkg-a');

        expect((global.fetch as jest.Mock).mock.calls.length).toBe(before * 2);
    });
});

// ---------------------------------------------------------------------------
// CLOSING EITHER SURFACE
// ---------------------------------------------------------------------------
// ONE PACKAGE IS ONE SESSION ACROSS TWO SURFACES. The earlier design left the two
// independent, which meant tidying up took two closes and doing only one left the
// other half quietly alive.
describe('useClosePkgSession', () => {
    const setup = (boards: any[], open: string[], active: string | null) =>
        renderHook(
            () => ({
                close: useClosePkgSession(),
                open: useRecoilValue(gOpenPkgViews),
                active: useRecoilValue(gActivePkgView),
                boards: useRecoilValue(gBoardList),
            }),
            {
                wrapper: wrapper(({ set }) => {
                    set(gBoardList, boards);
                    set(gSelectedTab, boards[0]?.id ?? 'none');
                    set(gOpenPkgViews, open);
                    set(gActivePkgView, active);
                }),
            }
        );

    const appTab = (name: string, id = `tab-${name}`) => ({ id, type: 'appView', name: `APP: ${name}`, code: { appName: name } });

    test('closing the pill closes the package’s APP: tab too', () => {
        const { result } = setup([appTab('neo-pkg-a'), { id: 'sql', type: 'new', name: 'new' }], ['neo-pkg-a'], 'neo-pkg-a');

        act(() => result.current.close('neo-pkg-a'));

        expect(result.current.open).toEqual([]);
        expect(result.current.boards.map((b: any) => b.id)).toEqual(['sql']);
    });

    test('and falls back to the catalog when the closed pill was the active one', () => {
        const { result } = setup([appTab('neo-pkg-a')], ['neo-pkg-a'], 'neo-pkg-a');

        act(() => result.current.close('neo-pkg-a'));

        expect(result.current.active).toBeNull();
    });

    test('closing an INACTIVE pill leaves the view where it was', () => {
        const { result } = setup([appTab('neo-pkg-a'), appTab('neo-pkg-b', 'tab-b')], ['neo-pkg-a', 'neo-pkg-b'], 'neo-pkg-a');

        act(() => result.current.close('neo-pkg-b'));

        expect(result.current.open).toEqual(['neo-pkg-a']);
        expect(result.current.active).toBe('neo-pkg-a');
        expect(result.current.boards.map((b: any) => b.id)).toEqual(['tab-neo-pkg-a']);
    });

    // A package with side.html but no main.html never had a tab. Closing its pill
    // must not disturb the tab strip.
    test('a package with no APP: tab closes cleanly, leaving other tabs untouched', () => {
        const { result } = setup([{ id: 'sql', type: 'new', name: 'new' }], ['neo-pkg-a'], 'neo-pkg-a');

        act(() => result.current.close('neo-pkg-a'));

        expect(result.current.open).toEqual([]);
        expect(result.current.boards.map((b: any) => b.id)).toEqual(['sql']);
    });

    test('closing the last tab leaves a fresh empty one rather than nothing', () => {
        const { result } = setup([appTab('neo-pkg-a')], ['neo-pkg-a'], 'neo-pkg-a');

        act(() => result.current.close('neo-pkg-a'));

        // `closeTabState`'s own rule, reached through the session close rather than
        // reimplemented beside it.
        expect(result.current.boards).toHaveLength(1);
        expect(result.current.boards[0].type).toBe('new');
    });
});

// The other half of the symmetry lives in the two components that own tab
// closing. Asserted structurally: a regression here is silent — the pill simply
// outlives its tab — and neither file can be mounted cheaply.
describe('closing an APP: tab ends the session too', () => {
    const read = (path: string) => jest.requireActual('fs').readFileSync(path, 'utf8');

    test('MainContent closes the pill when it closes an appView board', () => {
        const src = read('src/components/mainContent/MainContent.tsx');

        expect(src).toContain('useClosePkgView');
        expect(src).toMatch(/board\.type === 'appView'[\s\S]{0,80}closePkgView/);
        // It may reveal and close, but never reach for a second source of truth.
        expect(src).not.toContain('gActiveAppSide');
    });

    test('OpenFile closes the pill when it closes an appView board', () => {
        const src = read('src/components/side/FileExplorer/OpenFile.tsx');

        expect(src).toContain('useClosePkgView');
        expect(src).toMatch(/closedBoard\?\.type === 'appView'[\s\S]{0,80}closePkgView/);
        expect(src).not.toContain('gActiveAppSide');
    });

    // The session helper must NOT be CALLED from the tab-close path: the tab is
    // already being removed there, and re-entering closeTabState would run it
    // against a board list that pass has not written yet.
    //
    // Matched as a call, not as a bare substring — the name legitimately appears in
    // MainContent's comment explaining the symmetry, and a substring check turns
    // that documentation into a failing test.
    test('neither CALLS the session helper, which would close the tab twice', () => {
        expect(read('src/components/mainContent/MainContent.tsx')).not.toMatch(/useClosePkgSession\s*\(/);
        expect(read('src/components/side/FileExplorer/OpenFile.tsx')).not.toMatch(/useClosePkgSession\s*\(/);
    });
});
