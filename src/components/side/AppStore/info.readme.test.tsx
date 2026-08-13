// issue #1452 — the detail view's README must come from disk first on an
// air-gapped server, and must not be blocked by the github-metadata guard.

import { render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot, type MutableSnapshot } from 'recoil';
import { AppInfo } from './info';
import { getPkgMarkdown } from '@/api/repository/appStore';
import { readLocalReadme } from '@/api/repository/onpremCatalog';
import { gCatalogStatus, type CatalogMode } from '@/recoil/appStore';

jest.mock('@/api/repository/appStore', () => ({
    getPkgMarkdown: jest.fn(),
    isGrandfatheredPkg: jest.fn(() => false),
}));
jest.mock('@/api/repository/onpremCatalog', () => ({
    readLocalReadme: jest.fn(),
}));
jest.mock('@/hooks/useExperiment', () => ({
    useExperiment: () => ({ getExperiment: () => false }),
}));
jest.mock('./pkgLifecycle/usePkgCommand', () => ({
    usePkgCommand: () => jest.fn(),
}));
jest.mock('@/components/worksheet/Markdown', () => ({
    Markdown: ({ pContents }: { pContents: string }) => <div data-testid="readme">{pContents}</div>,
}));

// The detail view is wrapped in split-pane-react, which observes its container on
// mount. jsdom has no ResizeObserver and the pane geometry is irrelevant here.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;

const mockGetPkgMarkdown = getPkgMarkdown as jest.MockedFunction<any>;
const mockReadLocalReadme = readLocalReadme as jest.MockedFunction<any>;

const GITHUB = { full_name: 'machbase/neo-pkg-demo', default_branch: 'main' };

// AppInfo reads gCatalogStatus (issue #1452, local-only mode), so the detail view
// now needs a store. The mode defaults to `online`, which is what every case
// written before local-only mode existed assumes.
const renderInfo = (app: any, mode: CatalogMode = 'online') => {
    const init = ({ set }: MutableSnapshot) => set(gCatalogStatus, { mode });
    return render(
        <RecoilRoot initializeState={init}>
            <AppInfo pCode={{ app }} />
        </RecoilRoot>
    );
};

beforeEach(() => {
    jest.clearAllMocks();
});

test('installed package with a local README never touches the remote path', async () => {
    mockReadLocalReadme.mockResolvedValue('# from disk');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('from disk'));
    expect(mockReadLocalReadme).toHaveBeenCalledWith('neo-pkg-demo');
    expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
});

test('local README missing ⇒ falls back to the remote README', async () => {
    mockReadLocalReadme.mockResolvedValue(null);
    mockGetPkgMarkdown.mockResolvedValue('# from hub');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('from hub'));
    expect(mockGetPkgMarkdown).toHaveBeenCalledWith('machbase/neo-pkg-demo/main/README.md');
});

test('both sources failing keeps the existing error message', async () => {
    mockReadLocalReadme.mockResolvedValue(null);
    mockGetPkgMarkdown.mockRejectedValue(new Error('Network Error'));

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByText('Network Error')).toBeInTheDocument());
    expect(screen.queryByTestId('readme')).not.toBeInTheDocument();
});

// REGRESSION: the github guard is an early return. A package installed from a
// local archive has no github block, so reading the local README after that guard
// would mean its README could never render.
test('installed package with NO github block still renders its local README', async () => {
    mockReadLocalReadme.mockResolvedValue('# offline package');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('offline package'));
    expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
    expect(screen.queryByText('No repository information available.')).not.toBeInTheDocument();
});

test('not-installed package skips the local read entirely', async () => {
    mockGetPkgMarkdown.mockResolvedValue('# from hub');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: false, github: GITHUB });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('from hub'));
    expect(mockReadLocalReadme).not.toHaveBeenCalled();
});

test('no local README and no github metadata keeps the original message', async () => {
    mockReadLocalReadme.mockResolvedValue(null);

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true });

    await waitFor(() => expect(screen.getByText('No repository information available.')).toBeInTheDocument());
    expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
});

test('the local README is rendered verbatim — no raw.githubusercontent rewriting', async () => {
    mockReadLocalReadme.mockResolvedValue('![shot](./docs/shot.png)');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('![shot](./docs/shot.png)'));
    expect(screen.getByTestId('readme').textContent).not.toContain('raw.githubusercontent.com');
});

// ---------------------------------------------------------------------------
// LOCAL-ONLY MODE (issue #1452)
// ---------------------------------------------------------------------------
// `getPkgMarkdown` goes to raw.githubusercontent. In local-only mode that call must
// not happen — and the empty pane it leaves behind has to explain itself, in words
// that do not read as a failure.
describe('local-only mode', () => {
    test('the local README still renders — same-origin reads are never restricted', async () => {
        mockReadLocalReadme.mockResolvedValue('# from disk');

        renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB }, 'localOnly');

        await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('from disk'));
        expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
    });

    // THE REGRESSION TEST FOR THIS ITEM: with no local copy, the remote fallback is
    // skipped rather than attempted and failed.
    test('no local README ⇒ getPkgMarkdown is NOT called', async () => {
        mockReadLocalReadme.mockResolvedValue(null);

        renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB }, 'localOnly');

        await waitFor(() => expect(screen.getByText(/Local-only mode/)).toBeInTheDocument());
        expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
    });

    test('a package that is not installed skips the remote fetch too', async () => {
        renderInfo({ name: 'neo-pkg-demo', installed_frontend: false, github: GITHUB }, 'localOnly');

        await waitFor(() => expect(screen.getByText(/Local-only mode/)).toBeInTheDocument());
        expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
        expect(mockReadLocalReadme).not.toHaveBeenCalled();
    });

    // The message must be distinguishable from the generic errors: those describe a
    // fault and invite a retry; this describes a setting, and names where it lives.
    test('the message names the policy and the file, not a failure', async () => {
        mockReadLocalReadme.mockResolvedValue(null);

        renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB }, 'localOnly');

        await waitFor(() => expect(screen.getByText(/Local-only mode/)).toBeInTheDocument());
        expect(screen.getByText(/\/public\/\.pkg-conf\.json/)).toBeInTheDocument();
        expect(screen.queryByText('No repository information available.')).not.toBeInTheDocument();
        expect(screen.queryByText('Failed to load README.')).not.toBeInTheDocument();
    });

    // The github guard is an early return, so the policy check has to sit BEFORE it
    // — otherwise a locally-archived package with no github block would report
    // "no repository information" instead of the real reason.
    test('a package with no github block gets the policy message, not the metadata one', async () => {
        mockReadLocalReadme.mockResolvedValue(null);

        renderInfo({ name: 'neo-pkg-demo', installed_frontend: true }, 'localOnly');

        await waitFor(() => expect(screen.getByText(/Local-only mode/)).toBeInTheDocument());
        expect(screen.queryByText('No repository information available.')).not.toBeInTheDocument();
    });
});
