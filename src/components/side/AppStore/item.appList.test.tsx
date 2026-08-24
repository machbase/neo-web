// issue #1452 — WHICH ROW IS SELECTED, when two rows answer to the same name.
//
// `AppList` decides the highlight and the click target by `aItem.name`. That was
// unambiguous until stray cards arrived: a hand-unpacked copy is NAMED AFTER THE
// PACKAGE (`neo-pkg-demo`) while living in a different directory
// (`neo-pkg-demo-main/`), so it collides with the real install's card. On a real
// server both rows lit up for one open tab, and clicking the stray one opened the
// INSTALLED package's detail tab — a view of a different directory entirely.
//
// The rule these tests pin down: a stray row is not selectable, therefore it is
// never the selection, therefore it never highlights.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilValue, type MutableSnapshot } from 'recoil';
import { AppList } from './item';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gActivePkgView, gCatalogStatus, gOpenPkgViews, gServerVersion } from '@/recoil/appStore';
import { invalidatePkgHtmlCache } from './pkgHtml';

jest.mock('@/api/repository/appStore', () => ({
    isGrandfatheredPkg: jest.fn(() => false),
}));
jest.mock('@/hooks/useExperiment', () => ({
    useExperiment: () => ({ getExperiment: () => false }),
}));
jest.mock('./pkgLifecycle/usePkgCommand', () => ({
    usePkgCommand: () => jest.fn(),
}));
jest.mock('./pkgLifecycle/useStrayRemove', () => ({
    useStrayRemove: () => jest.fn(() => Promise.resolve({ ok: true, log: '' })),
}));
jest.mock('@/utils', () => ({
    ...jest.requireActual('@/utils'),
    isCurUserEqualAdmin: jest.fn(() => true),
}));

const GITHUB = { organization: 'machbase', description: 'demo package' };

/** The real install: `/public/neo-pkg-demo/`. */
const installedCard = () => ({
    name: 'neo-pkg-demo',
    github: GITHUB,
    latest_version: '1.0.0',
    installed_version: '1.0.0',
    installed_frontend: true,
    versions: [],
});

/** The hand-unpacked copy: `/public/neo-pkg-demo-main/`, SAME `name`. */
const strayCard = () => ({
    name: 'neo-pkg-demo',
    github: GITHUB,
    latest_version: '1.0.0',
    versions: [],
    stray: { dir: 'neo-pkg-demo-main', removable: true, duplicate: true },
});

/** Renders the board list so a click's effect on the tabs is observable. */
const TabProbe = () => {
    const boards = useRecoilValue(gBoardList);
    return <div data-testid="tabs">{boards.map((b: any) => b.name).join('|')}</div>;
};

/** Same, for the pill switcher — where an INSTALLED card's click now lands. */
const PillProbe = () => {
    const open = useRecoilValue(gOpenPkgViews);
    const active = useRecoilValue(gActivePkgView);
    return <div data-testid="pills">{`${open.join('|')}#${active ?? ''}`}</div>;
};

type Selected = { appStore?: string; appView?: string; pkgView?: string };

const renderList = (list: any[], selected: Selected = {}) => {
    const boards: any[] = [];
    if (selected.appStore) boards.push({ id: 'tab-store', type: 'appStore', name: `PKG: ${selected.appStore}`, code: { app: { name: selected.appStore } } });
    if (selected.appView) boards.push({ id: 'tab-view', type: 'appView', name: `APP: ${selected.appView}`, code: { appName: selected.appView } });
    const init = ({ set }: MutableSnapshot) => {
        set(gServerVersion, '8.0.45');
        set(gCatalogStatus, { mode: 'online' });
        set(gBoardList, boards);
        set(gSelectedTab, selected.appView ? 'tab-view' : 'tab-store');
        if (selected.pkgView) {
            set(gOpenPkgViews, [selected.pkgView]);
            set(gActivePkgView, selected.pkgView);
        }
    };
    return render(
        <RecoilRoot initializeState={init}>
            <TabProbe />
            <PillProbe />
            <AppList pList={list} pStatus={'EXACT' as any} />
        </RecoilRoot>
    );
};

/** The row wrapper `AppList` puts the highlight and the click handler on. */
const rowsOf = (container: HTMLElement) => [...container.querySelectorAll('.app-store-item')].map((card) => card.parentElement as HTMLElement);

// The highlight moved from an inline `style={{ background, boxShadow }}` to a
// class when "open" and "selected" became two different marks — an opened package
// gets the accent border alone, the one on screen also gets the fill.
const isHighlighted = (row: HTMLElement) => row.className.includes('app-store-row--selected');
const isOpenMarked = (row: HTMLElement) => row.className.includes('app-store-row--open');

// `probePkgHtml` caches per package at module scope, so a verdict from one test
// would otherwise decide the next one.
const shipsNothing = () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, headers: { get: () => null } })) as any;
};
const ships = (...files: Array<'main.html' | 'side.html'>) => {
    global.fetch = jest.fn((url: string) => {
        const hit = files.some((f) => String(url).includes(f));
        return Promise.resolve({ ok: hit, headers: { get: () => (hit ? 'text/html' : 'text/plain') } });
    }) as any;
};

beforeEach(() => {
    jest.clearAllMocks();
    invalidatePkgHtmlCache();
    // handleSelectApp probes main.html / side.html for installed packages.
    shipsNothing();
});

describe('a stray never joins the selection highlight', () => {
    // THE REPORTED BUG. Both rows carry `name: 'neo-pkg-demo'`, so the plain name
    // comparison lit both up for the one open tab.
    test('with the real package open, only the real row is highlighted', () => {
        const { container } = renderList([installedCard(), strayCard()], { appStore: 'neo-pkg-demo' });

        const [real, stray] = rowsOf(container);
        expect(isHighlighted(real)).toBe(true);
        expect(isHighlighted(stray)).toBe(false);
    });

    // The same collision exists on the appView tab, which is keyed by `code.appName`.
    test('the appView tab highlights the real row only, too', () => {
        const { container } = renderList([installedCard(), strayCard()], { appView: 'neo-pkg-demo' });

        const [real, stray] = rowsOf(container);
        expect(isHighlighted(real)).toBe(true);
        expect(isHighlighted(stray)).toBe(false);
    });

    // Order must not matter — the stray is excluded by what it IS, not by where it
    // happens to sit in the list.
    test('a stray listed first is still the one left dark', () => {
        const { container } = renderList([strayCard(), installedCard()], { appStore: 'neo-pkg-demo' });

        const [stray, real] = rowsOf(container);
        expect(isHighlighted(stray)).toBe(false);
        expect(isHighlighted(real)).toBe(true);
    });

    // The guard is the stray flag, not "never highlight anything": an ordinary card
    // still highlights when its package is the open tab.
    test('an ordinary row still highlights on its own', () => {
        const { container } = renderList([installedCard()], { appStore: 'neo-pkg-demo' });

        expect(isHighlighted(rowsOf(container)[0])).toBe(true);
    });

    // The panel's own package view is the third way to be looking at a package,
    // and the stray exclusion has to cover it too.
    test('the active package view highlights the real row only', () => {
        const { container } = renderList([installedCard(), strayCard()], { pkgView: 'neo-pkg-demo' });

        const [real, stray] = rowsOf(container);
        expect(isHighlighted(real)).toBe(true);
        expect(isHighlighted(stray)).toBe(false);
    });
});

// OPEN IS NOT SELECTED. A pill can exist for a package while the panel is showing
// the catalog; the card says "there is a pill for this" without claiming to be
// what the user is currently on. The two marks are separated by hue in item.scss
// (grey bar vs blue bar + fill) — they used to share one blue bar, which made
// every open package look like the current one.
describe('the open-package accent', () => {
    test('a package with a pill is marked open', () => {
        const { container } = renderList([installedCard()], { pkgView: 'neo-pkg-demo' });

        expect(isOpenMarked(rowsOf(container)[0])).toBe(true);
    });

    test('a package with no pill carries neither mark', () => {
        const { container } = renderList([installedCard()]);

        const [row] = rowsOf(container);
        expect(isOpenMarked(row)).toBe(false);
        expect(isHighlighted(row)).toBe(false);
    });

    test('a stray never gets the open accent — it can never have a pill', () => {
        const { container } = renderList([strayCard()], { pkgView: 'neo-pkg-demo' });

        expect(isOpenMarked(rowsOf(container)[0])).toBe(false);
    });

    // THE REPORTED CONFUSION. Two packages open, the panel back on the catalog,
    // and the main area showing one of them: exactly one card may claim to be
    // current, and it is the one the MAIN AREA is on — not merely one with a pill.
    test('with several pills open, only the package in the selected tab is marked current', () => {
        const other = { ...installedCard(), name: 'neo-pkg-other' };
        const { container } = render(
            <RecoilRoot
                initializeState={({ set }) => {
                    set(gServerVersion, '8.0.45');
                    set(gCatalogStatus, { mode: 'online' });
                    // Both open; the panel is on the CATALOG, so no pill is active.
                    set(gOpenPkgViews, ['neo-pkg-demo', 'neo-pkg-other']);
                    set(gActivePkgView, null);
                    set(gBoardList, [{ id: 'tab-view', type: 'appView', name: 'APP: neo-pkg-demo', code: { appName: 'neo-pkg-demo' } }] as any);
                    set(gSelectedTab, 'tab-view');
                }}
            >
                <AppList pList={[installedCard(), other] as any} pStatus={'EXACT' as any} />
            </RecoilRoot>
        );

        const [demo, otherRow] = rowsOf(container);
        expect(isOpenMarked(demo)).toBe(true);
        expect(isOpenMarked(otherRow)).toBe(true);
        expect(isHighlighted(demo)).toBe(true);
        expect(isHighlighted(otherRow)).toBe(false);
    });
});

describe('a stray row opens nothing at all', () => {
    test('clicking it leaves the tabs alone', () => {
        const { container } = renderList([strayCard()]);

        fireEvent.click(rowsOf(container)[0]);

        expect(screen.getByTestId('tabs').textContent).toBe('');
    });

    test('and it opens no pill either', () => {
        const { container } = renderList([strayCard()]);

        fireEvent.click(rowsOf(container)[0]);

        expect(screen.getByTestId('pills').textContent).toBe('#');
    });

    // …while the ordinary row next to it still responds, so the absence above is
    // the stray guard rather than a dead list.
    //
    // AN INSTALLED PACKAGE NO LONGER OPENS THE DETAIL TAB. Once it is installed the
    // tab has nothing left to say: the README moved into the app view's drawer, and
    // Update / Uninstall / the version menu are on the card itself.
    test('an installed package with an app opens ONLY its APP: tab', async () => {
        ships('main.html');
        const { container } = renderList([installedCard(), strayCard()]);

        fireEvent.click(rowsOf(container)[0]);

        await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('APP: neo-pkg-demo'));
        expect(screen.getByTestId('tabs').textContent).not.toContain('PKG:');
    });

    test('an installed package with a side.html also gets its pill', async () => {
        ships('main.html', 'side.html');
        const { container } = renderList([installedCard()]);

        fireEvent.click(rowsOf(container)[0]);

        await waitFor(() => expect(screen.getByTestId('pills').textContent).toBe('neo-pkg-demo#neo-pkg-demo'));
        expect(screen.getByTestId('tabs').textContent).toBe('APP: neo-pkg-demo');
    });

    // A PILL ONLY EXISTS FOR A PACKAGE THAT SHIPS side.html — the panel's package
    // view IS that file.
    test('a package with no side.html gets no pill', async () => {
        ships('main.html');
        const { container } = renderList([installedCard()]);

        fireEvent.click(rowsOf(container)[0]);

        await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('APP: neo-pkg-demo'));
        expect(screen.getByTestId('pills').textContent).toBe('#');
    });

    test('re-clicking an already open package switches to it without a second pill', async () => {
        ships('main.html', 'side.html');
        const { container } = renderList([installedCard()], { pkgView: 'neo-pkg-demo' });

        fireEvent.click(rowsOf(container)[0]);

        await waitFor(() => expect(screen.getByTestId('pills').textContent).toBe('neo-pkg-demo#neo-pkg-demo'));
    });

    // `installed_frontend` only means the directory exists. A package installed
    // with no HTML at all has no app and no panel view, so the detail tab is the
    // only surface left — without this the card would be inert.
    test('an installed package that ships NEITHER falls back to the detail tab', async () => {
        shipsNothing();
        const { container } = renderList([installedCard()]);

        fireEvent.click(rowsOf(container)[0]);

        await waitFor(() => expect(screen.getByTestId('tabs').textContent).toBe('PKG: neo-pkg-demo'));
        expect(screen.getByTestId('pills').textContent).toBe('#');
    });

    // Before install the detail tab is the whole point of the card: the README and
    // the version list are all there is to look at.
    test('an uninstalled card opens the detail tab and no pill', () => {
        const { container } = renderList([{ ...installedCard(), installed_frontend: false, installed_version: undefined }]);

        fireEvent.click(rowsOf(container)[0]);

        expect(screen.getByTestId('tabs').textContent).toBe('PKG: neo-pkg-demo');
        expect(screen.getByTestId('pills').textContent).toBe('#');
    });

    test('the stray row carries no click handler at all, so it cannot look clickable', () => {
        const { container } = renderList([installedCard(), strayCard()]);

        const [real, stray] = rowsOf(container);
        expect(stray.className).toContain('app-store-row--static');
        expect(real.className).not.toContain('app-store-row--static');
    });
});

describe('Remove directory does not select the card', () => {
    // The button lives inside the row, so its click would bubble to the row handler
    // if nothing stopped it. Asserted through the tabs, which is what selection
    // actually does.
    test('clicking it opens no tab', () => {
        renderList([strayCard()]);

        fireEvent.click(screen.getByText('Remove directory'));

        expect(screen.getByTestId('tabs').textContent).toBe('');
    });

    test('confirming it opens no tab either', () => {
        renderList([strayCard()]);

        fireEvent.click(screen.getByText('Remove directory'));
        fireEvent.click(screen.getByText('Remove'));

        expect(screen.getByTestId('tabs').textContent).toBe('');
    });
});
