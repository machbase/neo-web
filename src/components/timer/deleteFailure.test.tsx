// Timer delete was silent on failure — see the note in bridge/deleteFailure.test.tsx. Same
// contract asserted here: a rejected delete has to reach the user, a successful one has to confirm.

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { Timer } from './index';
import { delTimer, getTimer } from '@/api/repository/timer';
import { Toast } from '@/design-system/components';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';

jest.mock('@/api/repository/timer', () => ({
    delTimer: jest.fn(),
    getTimer: jest.fn(),
    getTimerItem: jest.fn(),
    modTimer: jest.fn(),
    sendTimerCommand: jest.fn(),
}));

// the timer page mounts SelectFileBtn / OpenFileBtn, which fetch the file list on mount — unmocked
// they fire a real XHR into jsdom and bury the result in connection-error noise
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(async () => ({ success: true, data: { children: [] } })) }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(async () => ({ data: { children: [] } })) }));

// stub the Toast module rather than the barrel — spreading the barrel trips its circular import
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const TIMER: any = { id: 7, name: 'daily-backup', type: 'TIMER', state: 'STOP', task: '/a.tql', schedule: '@every 1h', autoStart: false };

const renderTimer = () =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveTimer, TIMER.id);
                set(gTimerList, [TIMER]);
                // `as any`: GBoardListType also demands dashboard-only fields no timer board carries
                set(gBoardList, [{ id: 'board-1', type: 'timer', name: `TIMER: ${TIMER.name}`, code: TIMER, savedCode: TIMER, path: '' }] as any);
            }}
        >
            <Timer pCode={TIMER} />
        </RecoilRoot>
    );

const confirmDelete = async () => {
    fireEvent.click(screen.getByText('Delete'));
    const sOk = await screen.findByText('OK');
    await act(async () => {
        fireEvent.click(sOk);
    });
};

describe('Timer delete failure', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getTimer as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', data: [] });
    });

    it('tells the user when the server rejects the delete', async () => {
        (delTimer as jest.Mock).mockResolvedValue({ success: false, reason: 'timer is running', elapse: '' });

        renderTimer();
        await confirmDelete();

        await waitFor(() => expect(Toast.error).toHaveBeenCalled());
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('timer is running');
        expect(Toast.success).not.toHaveBeenCalled();
    });

    it('confirms the delete on success', async () => {
        (delTimer as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '' });

        renderTimer();
        await confirmDelete();

        await waitFor(() => expect(Toast.success).toHaveBeenCalled());
        expect(Toast.error).not.toHaveBeenCalled();
    });
});
