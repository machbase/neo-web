import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { FolderModal } from './FolderModal';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { gRecentDirectory } from '@/recoil/fileTree';

jest.mock('@/api/repository/api', () => ({
    postFileList: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
}));
jest.mock('@/utils/UpdateTree', () => ({
    TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })),
}));

const renderModal = (aPath: string, aIsGit = false) => {
    const setIsOpen = jest.fn();
    render(
        <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, aPath)}>
            <FolderModal setIsOpen={setIsOpen} pIsGit={aIsGit} />
        </RecoilRoot>
    );
    return setIsOpen;
};

const clickOk = async () => {
    await act(async () => {
        fireEvent.click(screen.getByTestId('folder-new-confirm'));
    });
};

describe('FolderModal — existing name', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
    });

    it('does not POST and shows an error when the folder exists', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'docs', isDir: true }] } });
        renderModal('/docs');
        await clickOk();

        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent('already exists');
        expect(postFileList).not.toHaveBeenCalled();
    });

    // r14: clone REPLACES the existing folder's contents (measured) → a clone confirm, not a block
    const cloneOntoExisting = async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'Repo', isDir: true }] } });
        renderModal('/repo', true);
        fireEvent.change(screen.getByTestId('folder-new-git-url-input'), { target: { value: 'https://example.com/x/repo.git' } });
        // the debounced url handler rewrites the path to /repo
        await act(async () => {
            await new Promise((r) => setTimeout(r, 300));
        });
        await clickOk();
        return screen.findByTestId('clone-replace-dialog');
    };

    it('clone onto an existing folder (case-insensitive) asks first; cancel → 0 POST', async () => {
        const sDialog = await cloneOntoExisting();
        expect(sDialog).toHaveTextContent(
            "A folder named 'Repo' already exists. Cloning will replace its contents and delete the files in it. Do you want to continue?"
        );
        expect(postFileList).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('clone-replace-dialog')).toBeNull());
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('clone onto an existing folder: confirm → 1 clone POST into the real folder name', async () => {
        const sDialog = await cloneOntoExisting();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][0]).toEqual({ url: 'https://example.com/x/repo.git', command: 'clone' });
        expect((postFileList as jest.Mock).mock.calls[0][1]).toBe('/Repo');
    });

    it('clone onto an existing FILE of that name is blocked (no dialog, no POST)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'repo', isDir: false }] } });
        renderModal('/repo', true);
        fireEvent.change(screen.getByTestId('folder-new-git-url-input'), { target: { value: 'https://example.com/x/repo.git' } });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 300));
        });
        await clickOk();
        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent('already exists');
        expect(screen.queryByTestId('clone-replace-dialog')).toBeNull();
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('plain New folder onto an existing folder still blocks (case-insensitive, no dialog)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'Docs', isDir: true }] } });
        renderModal('/docs');
        await clickOk();
        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent("'Docs' already exists.");
        expect(screen.queryByTestId('clone-replace-dialog')).toBeNull();
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('posts a new folder', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'other', isDir: true }] } });
        renderModal('/newdir');
        await clickOk();

        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][1]).toBe('/newdir');
    });

    it('a failed POST (e.g. clone refused) shows the server reason in the dialog', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        (postFileList as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'git clone: authentication required' } });
        const setIsOpen = renderModal('/newdir');
        await clickOk();

        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent('git clone: authentication required');
        expect(setIsOpen).not.toHaveBeenCalledWith(false);
    });

    it('does not POST and shows an error when the parent folder is missing (404)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 404, headers: {}, data: { success: false, reason: 'not found' } });
        renderModal('/a/b/c');
        await clickOk();

        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent('does not exist');
        expect(getFiles).toHaveBeenCalledWith('/a/b/');
        expect(postFileList).not.toHaveBeenCalled();
    });

    it.each([
        ['%23', 'https://example.com/x/re%23po.git'],
        ['%2F', 'https://example.com/x/a%2Fb.git'],
        ['%3F', 'https://example.com/x/re%3Fpo.git'],
        // r17: the name rule inside nameFromUrl — leading '.' (server hides it) and an empty name (root clone)
        ['leading dot', 'https://github.com/org/.github'],
        ['empty name', 'https://example.com'],
    ])('rejects a clone url whose decoded name carries %s (no POST)', async (_aChar, aUrl) => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        renderModal('/', true);
        fireEvent.change(screen.getByTestId('folder-new-git-url-input'), { target: { value: aUrl } });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 300));
        });
        expect(await screen.findByTestId('folder-new-error')).toHaveTextContent('Invalid folder name');
        expect(screen.getByTestId('folder-new-path-input')).toHaveValue('/');
        await clickOk();
        expect(postFileList).not.toHaveBeenCalled();
    });
});

describe('FolderModal — git clone name from url (nameFromUrl)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
    });

    const cloneWith = async (aUrl: string) => {
        renderModal('/', true);
        fireEvent.change(screen.getByTestId('folder-new-git-url-input'), { target: { value: aUrl } });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 300));
        });
        await clickOk();
    };

    it.each([
        ['https://example.com/x/my%20repo.git', '/my repo'],
        ['git@github.com:org/repo.git', '/repo'],
        ['ssh://git@h/x/r.git', '/r'],
        ['git@h:repo.git', '/repo'],
        ['https://example.com/x/repo#frag', '/repo'],
        ['https://example.com/x/repo.git?f=a', '/repo'],
    ])('%s → POST folder %s', async (aUrl, aFolder) => {
        await cloneWith(aUrl);
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][1]).toBe(aFolder);
        expect((postFileList as jest.Mock).mock.calls[0][0]).toEqual({ url: aUrl, command: 'clone' });
    });
});
