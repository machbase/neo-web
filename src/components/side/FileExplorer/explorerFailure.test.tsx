// The request layer resolves failures instead of rejecting (HTTP error → error.response,
// network → AxiosError). The explorer used to feed those straight into the tree parser (empty
// tree), leave '...' forever on a network failure, and swallow folder/delete failures — or crash
// on `.data.reason` of an AxiosError (issue-1544).

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { AxiosError } from 'axios';
import { FileExplorer } from './index';
import { getFiles, deleteFile } from '@/api/repository/fileTree';
import { Toast } from '@/design-system/components';
import { gDeleteFileList } from '@/recoil/fileTree';

jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
    deleteFile: jest.fn(),
    moveFile: jest.fn(),
}));
// Wrap gDeleteFileTree so the item handed to DeleteFileTree can be asserted (it delegates to the real selector).
const mockDeleteFileTreeSpy = jest.fn();
jest.mock('@/recoil/fileTree', () => {
    const sActual = jest.requireActual('@/recoil/fileTree');
    const { selector } = jest.requireActual('recoil');
    return {
        ...sActual,
        gDeleteFileTree: selector({
            key: 'gDeleteFileTree_spy',
            get: () => {},
            set: (aOpts: any, aValue: any) => {
                mockDeleteFileTreeSpy(aValue);
                aOpts.set(sActual.gDeleteFileTree, aValue);
            },
        }),
    };
});
jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
    postFileList: jest.fn(),
}));
// Stub the Toast MODULE, not the barrel (circular import; see bridge/deleteFailure.test.tsx).
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const ROOT = {
    success: true,
    data: {
        name: '/',
        isDir: true,
        gitClone: false,
        children: [
            { name: 'keep.sql', isDir: false, type: '.sql', lastModifiedUnixMillis: 1, gitClone: false, virtual: false },
            { name: 'docs', isDir: true, type: 'dir', lastModifiedUnixMillis: 1, gitClone: false, virtual: false },
        ],
    },
};

const itemId = (aPathName: string) => `file-tree-item-${encodeURIComponent(aPathName)}`;

const renderExplorer = (aInit?: (set: any) => void) =>
    render(
        <RecoilRoot initializeState={({ set }) => aInit?.(set)}>
            <FileExplorer pGetInfo={jest.fn()} pSavedPath={undefined} pDisplay={true} />
        </RecoilRoot>
    );

const mountWithTree = async (aInit?: (set: any) => void) => {
    (getFiles as jest.Mock).mockResolvedValueOnce(ROOT);
    renderExplorer(aInit);
    await screen.findByTestId(itemId('/keep.sql'));
};

const clickRefresh = async () => {
    await act(async () => {
        fireEvent.click(screen.getByTestId('file-explorer-refresh'));
    });
};

describe('FileExplorer failure notice', () => {
    beforeEach(() => jest.clearAllMocks());

    it('keeps the previous tree and toasts the reason when Refresh gets an HTTP 500', async () => {
        await mountWithTree();
        (getFiles as jest.Mock).mockResolvedValueOnce({ status: 500, statusText: 'Internal', headers: {}, data: { success: false, reason: 'disk failure' } });
        await clickRefresh();

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('disk failure');
        expect(screen.getByTestId(itemId('/keep.sql'))).toBeInTheDocument();
        expect(screen.queryByText('...')).toBeNull();
    });

    it('releases the "..." loading state and toasts on a network error', async () => {
        await mountWithTree();
        (getFiles as jest.Mock).mockResolvedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
        await clickRefresh();

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect(screen.queryByText('...')).toBeNull();
        expect(screen.getByTestId(itemId('/keep.sql'))).toBeInTheDocument();
    });

    it('toasts when opening a folder fails', async () => {
        await mountWithTree();
        (getFiles as jest.Mock).mockResolvedValueOnce({ status: 403, headers: {}, data: { success: false, reason: 'no permission' } });
        await act(async () => {
            fireEvent.click(screen.getByTestId(itemId('/docs')));
        });

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('no permission');
    });

    it('opening a corrupt .dsh from the tree toasts instead of an unhandled rejection, and opens no tab', async () => {
        const sRootWithDsh = { ...ROOT, data: { ...ROOT.data, children: [...ROOT.data.children, { name: 'broken.dsh', isDir: false, type: '.dsh', lastModifiedUnixMillis: 1, gitClone: false, virtual: false }] } };
        (getFiles as jest.Mock).mockResolvedValueOnce(sRootWithDsh);
        renderExplorer();
        await screen.findByTestId(itemId('/broken.dsh'));
        (getFiles as jest.Mock).mockResolvedValueOnce('{"dashboard": {not json');
        const sUnhandled = jest.fn();
        process.on('unhandledRejection', sUnhandled);
        try {
            await act(async () => {
                fireEvent.click(screen.getByTestId(itemId('/broken.dsh')));
            });
            await waitFor(() => expect(Toast.error).toHaveBeenCalled());
            expect((Toast.error as jest.Mock).mock.calls[0][1]).toEqual(expect.objectContaining({ testId: 'file-explorer-error-toast' }));
            await new Promise((r) => setTimeout(r, 0));
            expect(sUnhandled).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', sUnhandled);
        }
    });

    it('a single delete that gets an AxiosError toasts instead of throwing a TypeError', async () => {
        await mountWithTree();
        (deleteFile as jest.Mock).mockResolvedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
        fireEvent.contextMenu(screen.getByTestId(itemId('/keep.sql')));
        await act(async () => {
            fireEvent.click(await screen.findByText('Delete'));
        });
        await act(async () => {
            fireEvent.click(await screen.findByTestId('file-delete-confirm'));
        });

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect(deleteFile).toHaveBeenCalledWith('/', 'keep.sql', { recursive: false });
        expect(screen.getByTestId(itemId('/keep.sql'))).toBeInTheDocument();
    });

    it('multi-delete calls deleteFile per item with its own recursive flag and no undefined entries', async () => {
        const sFolder = { depth: 1, dirs: [], files: [], id: 'docs', name: 'docs', parentId: '0', type: 1, path: '/', gitClone: false, gitUrl: undefined, gitStatus: undefined, virtual: false, isOpen: false };
        const sFile = { content: '1', depth: 1, id: 'keep.sql', name: 'keep.sql', parentId: '0', type: 0, path: '/' };
        await mountWithTree((set) => set(gDeleteFileList, [sFolder, sFile] as any));
        (deleteFile as jest.Mock).mockResolvedValueOnce({ success: true, reason: 'success' }).mockResolvedValueOnce({ status: 409, headers: {}, data: { success: false, reason: 'busy' } });

        fireEvent.contextMenu(screen.getByTestId(itemId('/keep.sql')));
        await act(async () => {
            fireEvent.click(await screen.findByText('Delete'));
        });
        await act(async () => {
            fireEvent.click(await screen.findByText('Recursive delete directory'));
        });
        await act(async () => {
            fireEvent.click(await screen.findByTestId('file-delete-confirm'));
        });

        await waitFor(() => expect(deleteFile).toHaveBeenCalledTimes(2));
        const sCalls = (deleteFile as jest.Mock).mock.calls;
        expect(sCalls).toContainEqual(['/', 'docs', { recursive: true }]);
        expect(sCalls).toContainEqual(['/', 'keep.sql', { recursive: false }]);
        sCalls.forEach((aCall) => aCall.forEach((aArg: unknown) => expect(aArg).not.toBeUndefined()));
        // only the succeeded folder reaches DeleteFileTree, and it carries type/depth (removeDir needs them)
        await waitFor(() => expect(mockDeleteFileTreeSpy).toHaveBeenCalledTimes(1));
        expect(mockDeleteFileTreeSpy).toHaveBeenCalledWith(expect.objectContaining({ path: '/', name: 'docs', type: 1, depth: 1 }));
        await waitFor(() => expect(screen.queryByTestId(itemId('/docs'))).toBeNull());
        expect(screen.getByTestId(itemId('/keep.sql'))).toBeInTheDocument();
        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls.at(-1)[0]).toContain('busy');
    });
});
