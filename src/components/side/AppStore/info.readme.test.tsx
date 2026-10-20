// issue #1452 — an INSTALLED package's README comes from disk and nowhere else
// (the same rule as its icon), and must not be blocked by the github-metadata
// guard. Only a package that is not installed goes to GitHub.

import { render, screen, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { AppInfo } from './info';
import { getPkgMarkdown } from '@/api/repository/appStore';
import { readLocalReadme } from '@/api/repository/onpremCatalog';

jest.mock('@/api/repository/appStore', () => ({
    getPkgMarkdown: jest.fn(),
}));
jest.mock('@/api/repository/onpremCatalog', () => ({
    readLocalReadme: jest.fn(),
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

const renderInfo = (app: any) =>
    render(
        <RecoilRoot>
            <AppInfo pCode={{ app }} />
        </RecoilRoot>
    );

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

// THE RULE: an installed package never falls through to GitHub. The pane would
// otherwise follow the network rather than what is installed, and show the
// default branch's README instead of the installed version's.
test('installed package with NO local README says so — and never goes remote', async () => {
    mockReadLocalReadme.mockResolvedValue(null);
    mockGetPkgMarkdown.mockResolvedValue('# from hub');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByText('This package has no README.md installed on this server.')).toBeInTheDocument());
    expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
    expect(screen.queryByText('No repository information available.')).not.toBeInTheDocument();
});

test('a failing remote README (not installed) keeps the existing error message', async () => {
    mockGetPkgMarkdown.mockRejectedValue(new Error('Network Error'));

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: false, github: GITHUB });

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

test('not installed and no github metadata keeps the original message', async () => {
    renderInfo({ name: 'neo-pkg-demo', installed_frontend: false });

    await waitFor(() => expect(screen.getByText('No repository information available.')).toBeInTheDocument());
    expect(mockGetPkgMarkdown).not.toHaveBeenCalled();
});

test('the local README is rendered verbatim — no raw.githubusercontent rewriting', async () => {
    mockReadLocalReadme.mockResolvedValue('![shot](./docs/shot.png)');

    renderInfo({ name: 'neo-pkg-demo', installed_frontend: true, github: GITHUB });

    await waitFor(() => expect(screen.getByTestId('readme')).toHaveTextContent('![shot](./docs/shot.png)'));
    expect(screen.getByTestId('readme').textContent).not.toContain('raw.githubusercontent.com');
});
