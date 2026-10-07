// Two shell paths used to fail without a word:
//
//   1. "Make a copy" — `handleCreateShell` had an `else` that only did `setActiveShellName(undefined)`,
//      so a rejected copy looked exactly like a dead button.
//   2. create → icon/theme follow-up — `createShell` calls `shell.add` and then a separate
//      `shell.update` for icon/theme. On update failure the code deliberately kept going (the shell
//      DOES exist), but said nothing, so the icon the user picked silently vanished.
//
// Both are asserted here, plus the shellRpcEnvelope quirk that makes them easy to get wrong: it
// leaves top-level `reason` UNSET on error, so the message only exists under data.reason /
// statusText. Every failure mock below uses that real shape on purpose.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ShellManage } from './index';
import { addShell, copyShell, postShell } from '@/api/repository/api';
import { getLogin } from '@/api/repository/login';
import { Toast } from '@/design-system/components';
import { gActiveShellManage, gBoardList, gShellList } from '@/recoil/recoil';

jest.mock('@/api/repository/api', () => ({
    addShell: jest.fn(),
    copyShell: jest.fn(),
    postShell: jest.fn(),
    removeShell: jest.fn(),
}));
jest.mock('@/api/repository/login', () => ({ getLogin: jest.fn() }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

/** the failure envelope `shellRpcEnvelope` actually produces — no top-level `reason` */
const shellErr = (aMsg: string) => ({ success: false, elapse: '', statusText: aMsg, data: { reason: aMsg } });

const SHELL: any = {
    id: 'SHELL-1',
    type: 'term',
    label: 'my-shell',
    command: '/bin/neo shell',
    icon: 'console',
    theme: 'default',
    attributes: [{ removable: true }, { cloneable: true }, { editable: true }],
};

const renderShell = (aCode: any = SHELL) =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveShellManage, aCode.id ?? 'create');
                set(gShellList, [SHELL]);
                // `as any`: GBoardListType also demands dashboard-only fields no shell board carries
                set(gBoardList, [{ id: 'board-1', type: 'shell-manage', name: 'SHELL: my-shell', code: aCode, savedCode: aCode, path: '' }] as any);
            }}
        >
            <ShellManage pCode={aCode} />
        </RecoilRoot>
    );

const clickButton = async (aText: string) => {
    await act(async () => {
        fireEvent.click(screen.getByText(aText));
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    (getLogin as jest.Mock).mockResolvedValue({ success: true, shells: [SHELL] });
});

describe('Shell copy failure', () => {
    it('tells the user when the copy is rejected', async () => {
        (copyShell as jest.Mock).mockResolvedValue(shellErr('shell is not cloneable'));

        renderShell();
        await clickButton('Make a copy');

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        // proves the message survived the missing top-level `reason`
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('shell is not cloneable');
    });

    it('confirms a successful copy', async () => {
        (copyShell as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', data: { ...SHELL, id: 'shell-2', label: 'my-shell copy' } });

        renderShell();
        await clickButton('Make a copy');

        await waitFor(() => expect(Toast.success).toHaveBeenCalled());
        expect(Toast.error).not.toHaveBeenCalled();
    });
});

describe('Shell create with a failing icon/theme follow-up', () => {
    // create mode = a code object with no `id`
    const CREATE_TEMPLATE: any = { label: 'new-shell', command: '/bin/neo shell', theme: 'default', icon: 'console-network-outline' };

    it('warns that the shell exists but its icon/theme were dropped', async () => {
        (addShell as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', data: 'SHELL-2' });
        (getLogin as jest.Mock).mockResolvedValue({ success: true, shells: [SHELL, { ...SHELL, id: 'SHELL-2', label: 'new-shell' }] });
        (postShell as jest.Mock).mockResolvedValue(shellErr('icon not recognized'));

        renderShell(CREATE_TEMPLATE);
        await clickButton('Create');

        await waitFor(() => expect(Toast.warning).toHaveBeenCalled());
        const sMsg = (Toast.warning as jest.Mock).mock.calls[0][0];
        expect(sMsg).toContain('icon not recognized');
        // the shell itself WAS created — the message must not read as a failed create
        expect(sMsg).toMatch(/created/i);
        // and the warning replaces the success toast rather than stacking on top of it
        expect(Toast.success).not.toHaveBeenCalled();
    });

    it('reports a plain success when the follow-up lands', async () => {
        (addShell as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', data: 'SHELL-2' });
        (getLogin as jest.Mock).mockResolvedValue({ success: true, shells: [SHELL, { ...SHELL, id: 'SHELL-2', label: 'new-shell' }] });
        (postShell as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', data: {} });

        renderShell(CREATE_TEMPLATE);
        await clickButton('Create');

        await waitFor(() => expect(Toast.success).toHaveBeenCalled());
        expect(Toast.warning).not.toHaveBeenCalled();
    });
});
