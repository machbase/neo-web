// New file used to POST straight away: the server POST overwrites, so creating `a.sql` where one
// already existed silently replaced its content with the default payload (issue-1544 High1).

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { FileModal } from './FileModal';
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

const parent = (aChildren: { name: string; isDir: boolean }[]) => ({ success: true, data: { isDir: true, name: '/', children: aChildren } });

const renderModal = (aPath: string) => {
    const setIsOpen = jest.fn();
    render(
        <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, aPath)}>
            <FileModal setIsOpen={setIsOpen} />
        </RecoilRoot>
    );
    return setIsOpen;
};

const clickOk = async () => {
    await act(async () => {
        fireEvent.click(screen.getByTestId('file-new-confirm'));
    });
};

describe('FileModal — existing name', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
    });

    it('asks before overwriting an existing file and does not POST until confirmed', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: false }]));
        renderModal('/a.sql');
        await clickOk();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(postFileList).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
    });

    it('does not POST when the overwrite is cancelled', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: false }]));
        renderModal('/a.sql');
        await clickOk();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull());
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('asks for a case-only different name, naming the existing file (r12)', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: false }]));
        renderModal('/A.SQL');
        await clickOk();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'a.sql' already exists.");
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('existingName (r13): A.sql typed, a.sql there → after OK the POST and tree drill use a.sql', async () => {
        const { TreeFetchDrilling } = jest.requireMock('@/utils/UpdateTree');
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: false }]));
        renderModal('/A.sql');
        await clickOk();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][2]).toBe('a.sql');
        expect(TreeFetchDrilling).toHaveBeenCalledWith(expect.anything(), '/a.sql', true);
    });

    it('existingName in a sub folder (r15): /sub/A.sql typed, a.sql there → POST dir sub + a.sql, tree drill /sub/a.sql', async () => {
        const { TreeFetchDrilling } = jest.requireMock('@/utils/UpdateTree');
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: false }]));
        renderModal('/sub/A.sql');
        await clickOk();
        expect(getFiles).toHaveBeenCalledWith('/sub/');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0].slice(1)).toEqual(['sub', 'a.sql']);
        expect(TreeFetchDrilling).toHaveBeenCalledWith(expect.anything(), '/sub/a.sql', true);
        expect(TreeFetchDrilling).not.toHaveBeenCalledWith(expect.anything(), '/sub/A.sql', true);
    });

    it('a failed parent lookup shows the server reason inside the dialog (r13)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'lookup failed' } });
        renderModal('/a.sql');
        await clickOk();
        expect(await screen.findByTestId('file-new-error')).toHaveTextContent('lookup failed');
        expect(postFileList).not.toHaveBeenCalled();
    });

    it.each([
        ['/X.DSH', 'dashboard'],
        ['/x.Wrk', 'data'],
    ])('%s gets the default payload of its type (extension via extractionExtension)', async (aPath, aKey) => {
        (getFiles as jest.Mock).mockResolvedValue(parent([]));
        renderModal(aPath);
        await clickOk();
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        const sPayload = (postFileList as jest.Mock).mock.calls[0][0];
        expect(typeof sPayload === 'string' ? sPayload : JSON.stringify(sPayload)).toContain(aKey);
    });

    it('blocks a name taken by a folder', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'a.sql', isDir: true }]));
        renderModal('/a.sql');
        await clickOk();

        expect(await screen.findByTestId('file-new-error')).toBeInTheDocument();
        expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull();
        expect(postFileList).not.toHaveBeenCalled();
    });

    it.each(['/dir/', '/a.exe', '/.hidden/a.sql', '/ .sql'])('OK before the 200ms debounce does not POST an invalid path %s', async (aPath) => {
        (getFiles as jest.Mock).mockResolvedValue(parent([]));
        renderModal(aPath);
        // no timer advance: sValResult is still its initial `true`
        await clickOk();

        expect(await screen.findByTestId('file-new-error')).toBeInTheDocument();
        expect(getFiles).not.toHaveBeenCalled();
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('posts immediately for a new name', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([{ name: 'other.sql', isDir: false }]));
        const setIsOpen = renderModal('/a.sql');
        await clickOk();

        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull();
        await waitFor(() => expect(setIsOpen).toHaveBeenCalledWith(false));
    });

    it('a failed POST shows the server reason in the dialog', async () => {
        (getFiles as jest.Mock).mockResolvedValue(parent([]));
        (postFileList as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'permission denied' } });
        renderModal('/new.sql');
        await clickOk();

        expect(await screen.findByTestId('file-new-error')).toHaveTextContent('permission denied');
    });
});
