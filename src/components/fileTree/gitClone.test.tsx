// issue-1544 r14/r15: the explorer's virtual folder clone (download icon on a server-listed repo folder) POSTed a clone
// straight away; the server replaces the folder's contents, deleting files the user put there. r15: it follows the
// one rule of every clone entry point — the PARENT listing has a same-name folder (case-insensitive, the virtual item
// itself excluded) → clone confirm; a same-name file → error; failed lookup → error; otherwise clone without asking.

jest.mock('@/api/repository/api', () => ({ postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(), moveFile: jest.fn() }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));
jest.mock('react-tooltip', () => ({ Tooltip: () => null }));

import { render, fireEvent, screen, waitFor, act, within } from '@testing-library/react';
import { GitIcon, handleGit } from './file-tree';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { Toast } from '@/design-system/components';

const VIRTUAL = { name: 'neo-apps', path: '/', virtual: true, gitClone: true, gitUrl: 'https://github.com/machbase/neo-apps' } as any;
const SELF = { name: 'neo-apps', isDir: true, virtual: true };

const parentWith = (...aChildren: any[]) => ({ success: true, data: { isDir: true, children: aChildren } });
const realFolder = parentWith({ name: 'Neo-Apps', isDir: true }, SELF);
const onlySelf = parentWith(SELF, { name: 'other', isDir: true });
const sameFile = parentWith({ name: 'neo-apps', isDir: false }, SELF);

beforeEach(() => {
    jest.clearAllMocks();
    (postFileList as jest.Mock).mockResolvedValue({ success: true });
});

describe('handleGit (virtual folder clone) — parent listing rule', () => {
    it('reads the PARENT listing, not the folder itself', async () => {
        (getFiles as jest.Mock).mockResolvedValue(onlySelf);
        await handleGit(VIRTUAL, jest.fn(), undefined, jest.fn());
        expect(getFiles).toHaveBeenCalledWith('/');
    });
    it('only the virtual item itself has the name: no question, 1 POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue(onlySelf);
        const sAsk = jest.fn();
        const sRefresh = jest.fn();
        await handleGit(VIRTUAL, sRefresh, undefined, sAsk);
        expect(sAsk).not.toHaveBeenCalled();
        expect((postFileList as jest.Mock).mock.calls[0]).toEqual([{ url: VIRTUAL.gitUrl, command: 'clone' }, 'neo-apps', '']);
        expect(sRefresh).toHaveBeenCalled();
    });
    it('real same-name folder (case-insensitive): asks with its real name; cancel → 0 POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue(realFolder);
        const sAsk = jest.fn().mockResolvedValue(false);
        const sRefresh = jest.fn();
        await handleGit(VIRTUAL, sRefresh, undefined, sAsk);
        expect(sAsk).toHaveBeenCalledWith('Neo-Apps');
        expect(postFileList).not.toHaveBeenCalled();
        expect(sRefresh).not.toHaveBeenCalled();
    });
    it('real same-name folder: confirm → 1 clone POST to the existing real name', async () => {
        (getFiles as jest.Mock).mockResolvedValue(realFolder);
        await handleGit(VIRTUAL, jest.fn(), undefined, () => Promise.resolve(true));
        expect(postFileList).toHaveBeenCalledTimes(1);
        expect((postFileList as jest.Mock).mock.calls[0]).toEqual([{ url: VIRTUAL.gitUrl, command: 'clone' }, 'Neo-Apps', '']);
    });
    it('same-name file: toast, 0 POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue(sameFile);
        const sAsk = jest.fn();
        await handleGit(VIRTUAL, jest.fn(), undefined, sAsk);
        expect(sAsk).not.toHaveBeenCalled();
        expect(Toast.error).toHaveBeenCalledWith("A file named 'neo-apps' already exists.", expect.anything());
        expect(postFileList).not.toHaveBeenCalled();
    });
    it('failed lookup: toast, 0 POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'boom' } });
        await handleGit(VIRTUAL, jest.fn(), undefined, jest.fn());
        expect(Toast.error).toHaveBeenCalledWith('boom', expect.anything());
        expect(postFileList).not.toHaveBeenCalled();
    });
});

describe('GitIcon renders the clone dialog itself', () => {
    const clickIcon = async (aOnRowClick: jest.Mock) => {
        const { container } = render(
            <div onClick={aOnRowClick}>
                <GitIcon aFile={VIRTUAL} aRefreshCallback={jest.fn()} />
            </div>
        );
        await act(async () => {
            fireEvent.click(container.querySelector('svg')!.closest('div')!.parentElement!);
        });
        return screen.findByTestId('clone-replace-dialog');
    };

    it('cancel → 0 POST; dialog clicks do not reach the tree row', async () => {
        (getFiles as jest.Mock).mockResolvedValue(realFolder);
        const sRow = jest.fn();
        const sDialog = await clickIcon(sRow);
        expect(sDialog).toHaveTextContent("A folder named 'Neo-Apps' already exists. Cloning will replace its contents and delete the files in it.");
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('clone-replace-dialog')).toBeNull());
        expect(postFileList).not.toHaveBeenCalled();
        expect(sRow).not.toHaveBeenCalled();
    });

    it('confirm → 1 POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue(realFolder);
        const sDialog = await clickIcon(jest.fn());
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
    });
});
