// issue #1452 — the card for a `/public/` directory that holds a package nobody
// installed.
//
// THE ASSERTIONS THAT MATTER ARE THE ABSENCES. Install / Update / Uninstall /
// Start / Stop all act on `/public/{package name}`, which for this card is a
// DIFFERENT directory — quite possibly a real install of the same package. A card
// that renders them is not merely untidy, it offers to operate on the wrong tree.

import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot, type MutableSnapshot } from 'recoil';
import { AppItem } from './item';
import { gCatalogStatus, gServerVersion, type CatalogMode } from '@/recoil/appStore';

jest.mock('@/api/repository/appStore', () => ({
    isGrandfatheredPkg: jest.fn(() => false),
}));
jest.mock('@/hooks/useExperiment', () => ({
    useExperiment: () => ({ getExperiment: () => false }),
}));
jest.mock('./pkgLifecycle/usePkgCommand', () => ({
    usePkgCommand: () => jest.fn(),
}));
const mockRemove = jest.fn(() => Promise.resolve({ ok: true, log: '' }));
jest.mock('./pkgLifecycle/useStrayRemove', () => ({
    useStrayRemove: () => mockRemove,
}));
// The card is admin-gated like every other action in the panel.
jest.mock('@/utils', () => ({
    ...jest.requireActual('@/utils'),
    isCurUserEqualAdmin: jest.fn(() => true),
}));

import { isCurUserEqualAdmin } from '@/utils';

const mockIsAdmin = isCurUserEqualAdmin as jest.MockedFunction<typeof isCurUserEqualAdmin>;

const GITHUB = { organization: 'machbase', description: 'demo package' };

const strayApp = (over: Record<string, unknown> = {}) => ({
    name: 'neo-pkg-demo',
    github: GITHUB,
    latest_version: '1.0.0',
    versions: [],
    stray: { dir: 'neo-pkg-demo-main', removable: true, duplicate: false },
    ...over,
});

const renderItem = (app: any, mode: CatalogMode = 'online') => {
    const init = ({ set }: MutableSnapshot) => {
        set(gServerVersion, '8.0.45');
        set(gCatalogStatus, { mode });
    };
    return render(
        <RecoilRoot initializeState={init}>
            <AppItem pItem={app} />
        </RecoilRoot>
    );
};

beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin.mockReturnValue(true);
});

describe('the stray card renders no lifecycle affordance', () => {
    test.each([['Install'], ['Update'], ['Uninstall']])('%s is not rendered', (label) => {
        renderItem(strayApp());

        expect(screen.queryByText(label)).not.toBeInTheDocument();
    });

    // The RunSwitch is a title-only button (Start / Stop), so it is found by role.
    test('neither Start nor Stop is rendered', () => {
        renderItem(strayApp());

        expect(screen.queryByTitle('Start')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Stop')).not.toBeInTheDocument();
    });

    // The same app object WITHOUT `stray` is an installed card and does render them
    // — so the absences above are the stray branch, not a broken fixture.
    test('an installed card of the same shape still renders them', () => {
        renderItem({ ...strayApp(), stray: undefined, installed_frontend: true, installed_version: '1.0.0' });

        expect(screen.getByText('Uninstall')).toBeInTheDocument();
        expect(screen.getByTitle('Start')).toBeInTheDocument();
    });
});

// issue #1452 — THE NOTE IS ONE LINE. It used to state the whole mechanism inline
// ("Its install script never ran, so nothing is registered — but /public/<dir>/ is
// still served, so this unmanaged copy can answer requests."), which wraps to three
// lines in a side panel and, with several strays on screen, buries the actions in
// prose. The card keeps the takeaway; the mechanism moved to the `title`.
describe('what the stray card DOES say', () => {
    const note = () => screen.getByText(/Not installed by the App Store/);

    test('the package name, the real directory and a "not installed" chip', () => {
        renderItem(strayApp());

        expect(screen.getByText('neo-pkg-demo')).toBeInTheDocument();
        expect(screen.getByText('/public/neo-pkg-demo-main/')).toBeInTheDocument();
        expect(screen.getByText(/not installed/)).toBeInTheDocument();
    });

    test('the note is a single short sentence', () => {
        renderItem(strayApp());

        expect(note().textContent).toBe('Not installed by the App Store — still served from this path.');
    });

    // The path is already on the card, in monospace, directly above. Repeating it
    // inside the sentence is what made the line long enough to wrap.
    test('the note does not repeat the path', () => {
        renderItem(strayApp());

        expect(note().textContent).not.toContain('/public/');
        expect(screen.getAllByText('/public/neo-pkg-demo-main/')).toHaveLength(1);
    });

    test('the mechanism is in the tooltip, not on the card', () => {
        renderItem(strayApp());

        expect(note().getAttribute('title')).toMatch(/install script never ran/);
        expect(note().getAttribute('title')).toContain('/public/neo-pkg-demo-main/');
        // …and nowhere in the rendered text.
        expect(screen.queryByText(/install script never ran/)).not.toBeInTheDocument();
    });

    test('a duplicate adds ONE clause, not another sentence', () => {
        renderItem(strayApp({ stray: { dir: 'neo-pkg-demo-main', removable: true, duplicate: true } }));

        expect(note().textContent).toContain('a managed copy is installed separately');
        // Still one sentence: one full stop, at the very end.
        expect(note().textContent?.match(/\./g)).toHaveLength(1);
        expect(note().getAttribute('title')).toMatch(/properly installed copy/);
    });

    test('a non-duplicate says nothing about a managed copy', () => {
        renderItem(strayApp());

        expect(note().textContent).not.toContain('managed copy');
        expect(note().getAttribute('title')).not.toMatch(/properly installed copy/);
    });

    // A clone has no Remove button, so the line has to account for the absence —
    // in a clause, and the reason why in the tooltip.
    test('a clone says so in the same one line', () => {
        renderItem(strayApp({ stray: { dir: 'neo-pkg-demo-dev', removable: false, duplicate: false } }));

        expect(note().textContent).toContain('a git clone, so it is left as is');
        expect(note().textContent?.match(/\./g)).toHaveLength(1);
        expect(note().getAttribute('title')).toMatch(/git working copy/);
    });
});

describe('Remove directory', () => {
    test('a removable stray offers it', () => {
        renderItem(strayApp());

        expect(screen.getByText('Remove directory')).toBeInTheDocument();
    });

    // A git working clone keeps its card and loses the button: deleting it would
    // destroy uncommitted work.
    test('a clone does not', () => {
        renderItem(strayApp({ stray: { dir: 'neo-pkg-demo-dev', removable: false, duplicate: false } }));

        expect(screen.queryByText('Remove directory')).not.toBeInTheDocument();
        // …but it is still a card, with its directory named.
        expect(screen.getByText('/public/neo-pkg-demo-dev/')).toBeInTheDocument();
    });

    test('a non-admin gets no action at all', () => {
        mockIsAdmin.mockReturnValue(false);

        renderItem(strayApp());

        expect(screen.queryByText('Remove directory')).not.toBeInTheDocument();
    });

    // THE CONFIRMATION NAMES THE FULL PATH. Someone who downloaded a source zip and
    // has been working inside that directory can only recognise what they are about
    // to lose by seeing it spelled out; this prompt is the last place to say so.
    test('the click confirms first, and the prompt states the path', () => {
        renderItem(strayApp());

        fireEvent.click(screen.getByText('Remove directory'));

        expect(mockRemove).not.toHaveBeenCalled();
        expect(screen.getByText('Remove directory', { selector: 'h2, h3, div, span' })).toBeInTheDocument();
        expect(screen.getAllByText('/public/neo-pkg-demo-main/').length).toBeGreaterThan(1);
        expect(screen.getByText(/No uninstall script runs/)).toBeInTheDocument();
    });

    test('confirming removes the DIRECTORY, not the package', () => {
        renderItem(strayApp());

        fireEvent.click(screen.getByText('Remove directory'));
        fireEvent.click(screen.getByText('Remove'));

        expect(mockRemove).toHaveBeenCalledWith('neo-pkg-demo-main');
    });

    test('cancelling runs nothing', () => {
        renderItem(strayApp());

        fireEvent.click(screen.getByText('Remove directory'));
        fireEvent.click(screen.getByText('Cancel'));

        expect(mockRemove).not.toHaveBeenCalled();
    });

    // issue #1452 — THE CLICK STOPS AT THE BUTTON. `AppList` wraps every card in a
    // row that carries the panel's click handler, so an action that lets its event
    // bubble also selects the row. A stray row has no handler today, which would
    // make an end-to-end assertion pass for the wrong reason; this one pins the
    // contract at the card boundary instead, where it stays true whatever the list
    // does. (The same convention already guards `app-store-item-head-status`.)
    test('the click never escapes the card to whatever wraps it', () => {
        const onRowClick = jest.fn();
        render(
            <RecoilRoot initializeState={({ set }: MutableSnapshot) => set(gCatalogStatus, { mode: 'online' })}>
                <div onClick={onRowClick}>
                    <AppItem pItem={strayApp() as any} />
                </div>
            </RecoilRoot>
        );

        fireEvent.click(screen.getByText('Remove directory'));

        expect(onRowClick).not.toHaveBeenCalled();
    });
});
