// Reference "Quick install" took the folder name with its own substring rule; Git clone used another one.
// Both now go through nameFromUrl(kind 'repo') (issue-1544 r8/r9). r11: an invalid name is a verdict
// (`ok:false` → toast, no POST) and the clone target goes through the shared existence check.

jest.mock('@/api/repository/api', () => ({ getReferenceList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/utils/UpdateTree', () => ({ TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })) }));
// the Toast MODULE (not the barrel, see deleteFailure.test.tsx): the clone ConfirmModal needs the real Modal
jest.mock('@/design-system/components/Toast', () => ({ Toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

import { renderHook, act, render, screen, fireEvent, within } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { RecoilRoot } from 'recoil';
import { quickInstallFolder, useQuickInstall } from './referenceActions';
import { nameFromUrl } from '@/utils/fileName';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { Toast } from '@/design-system/components';

const item = (aAddress: string) => ({ title: 'Tutorials', type: 'url', address: aAddress });

describe('quickInstallFolder', () => {
    it.each([
        'https://github.com/machbase/education',
        'https://github.com/machbase/neo-tutorials',
        'https://github.com/machbase/demo-web-app/',
        'https://h/x/my%20repo.git',
        'https://h/x/repo.git?f=a#frag',
        'git@github.com:org/repo.git',
    ])('matches nameFromUrl(kind repo) for %s', (aAddress) => {
        const sExpected = nameFromUrl(aAddress, { kind: 'repo' });
        expect(sExpected.ok).toBe(true);
        expect(quickInstallFolder(item(aAddress))).toEqual(sExpected);
    });
    it('keeps the current entries unchanged', () => {
        expect(quickInstallFolder(item('https://github.com/machbase/education'))).toEqual({ ok: true, name: 'education' });
        expect(quickInstallFolder(item('https://h/x/my%20repo.git'))).toEqual({ ok: true, name: 'my repo' });
    });
    it('gives ok:false for an address without a valid name', () => {
        expect(quickInstallFolder(item('https://h/x/re%2Fpo')).ok).toBe(false);
        expect(quickInstallFolder(item('https://h')).ok).toBe(false);
    });
    it('r17: .github (leading dot) and an empty address are rejected; my%20repo is fine', () => {
        expect(quickInstallFolder(item('https://github.com/org/.github')).ok).toBe(false);
        expect(quickInstallFolder(item('')).ok).toBe(false);
        expect(quickInstallFolder({ title: 't', type: 'url' } as any).ok).toBe(false);
        expect(quickInstallFolder(item('https://h/x/my%20repo')).ok).toBe(true);
    });
});

describe('useQuickInstall — install', () => {
    const wrapper = ({ children }: { children: ReactNode }) => createElement(RecoilRoot, null, children);
    beforeEach(() => jest.clearAllMocks());

    it('invalid name → toast, no lookup, no POST', async () => {
        const { result } = renderHook(() => useQuickInstall(), { wrapper });
        await act(async () => {
            await result.current.install(item('https://h/x/re%2Fpo'));
        });
        expect(Toast.error).toHaveBeenCalledTimes(1);
        expect(getFiles).not.toHaveBeenCalled();
        expect(postFileList).not.toHaveBeenCalled();
    });

    // r14: the clone replaces the existing folder's contents → the hook asks through its `prompt`, which the
    // callers (RefeList, ReferencesWidget) only render. The harness renders it the same way.
    const Harness = ({ onReady }: { onReady: (aApi: ReturnType<typeof useQuickInstall>) => void }) => {
        const sApi = useQuickInstall();
        onReady(sApi);
        return createElement('div', null, sApi.prompt);
    };
    const installOntoExisting = async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'Education', isDir: true }] } });
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        let sApi: ReturnType<typeof useQuickInstall> | undefined;
        render(createElement(RecoilRoot, null, createElement(Harness, { onReady: (aApi) => (sApi = aApi) })));
        let sDone: Promise<void> | undefined;
        await act(async () => {
            sDone = sApi!.install(item('https://github.com/machbase/education'));
        });
        const sDialog = await screen.findByTestId('clone-replace-dialog');
        return { sDialog, sDone: sDone! };
    };

    it('existing folder (case-only difference too) → clone confirm; cancel → 0 POST', async () => {
        const { sDialog, sDone } = await installOntoExisting();
        expect(getFiles).toHaveBeenCalledWith('/');
        expect(sDialog).toHaveTextContent("A folder named 'Education' already exists. Cloning will replace its contents and delete the files in it.");
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
            await sDone;
        });
        expect(postFileList).not.toHaveBeenCalled();
        expect(Toast.error).not.toHaveBeenCalled();
    });

    it('existing folder → confirm → 1 clone POST into the real folder name', async () => {
        const { sDialog, sDone } = await installOntoExisting();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
            await sDone;
        });
        expect(postFileList).toHaveBeenCalledTimes(1);
        expect((postFileList as jest.Mock).mock.calls[0]).toEqual([{ url: 'https://github.com/machbase/education', command: 'clone' }, '/Education', '']);
    });

    it('a same-name FILE blocks with a toast (no dialog, no POST)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'education', isDir: false }] } });
        const { result } = renderHook(() => useQuickInstall(), { wrapper });
        await act(async () => {
            await result.current.install(item('https://github.com/machbase/education'));
        });
        expect(Toast.error).toHaveBeenCalledWith(expect.stringContaining("'education'"));
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('failed lookup → toast, no POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'boom' } });
        const { result } = renderHook(() => useQuickInstall(), { wrapper });
        await act(async () => {
            await result.current.install(item('https://github.com/machbase/education'));
        });
        expect(Toast.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('free name → one clone POST', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useQuickInstall(), { wrapper });
        await act(async () => {
            await result.current.install(item('https://github.com/machbase/education'));
        });
        expect(postFileList).toHaveBeenCalledTimes(1);
        expect((postFileList as jest.Mock).mock.calls[0][1]).toBe('/education');
    });
});
