// issue #1570 F-145 — `timer.update` with a task path that does not exist answers "not found"
// AFTER storing the new task/schedule (timer FAILED). The screen kept the old values until a
// side Refresh. A failed Save must re-read the timer and show what the server holds — while a
// value the server never stored (invalid schedule) stays in the form to be fixed.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { Timer } from './index';
import { getTimerItem, modTimer } from '@/api/repository/timer';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';

jest.mock('@/api/repository/timer', () => ({
    ...jest.requireActual('@/api/repository/timer'),
    genTimer: jest.fn(),
    getTimer: jest.fn(),
    getTimerItem: jest.fn(),
    modTimer: jest.fn(),
    delTimer: jest.fn(),
}));
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(async () => ({ success: true, data: { children: [] } })) }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(async () => ({ data: { children: [] } })) }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const OLD: any = { id: 7, name: 'nightly', type: 'TIMER', state: 'STOP', task: '/old.tql', schedule: '@every 1h', autoStart: false };

let sList: any[] = [];
const Host = () => {
    const sBoards = useRecoilValue<any[]>(gBoardList);
    sList = useRecoilValue<any>(gTimerList);
    return <Timer pCode={sBoards[0].code} />;
};

const renderTimer = () =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveTimer, OLD.id);
                set(gTimerList, [OLD]);
                set(gBoardList, [{ id: 'board-1', type: 'timer', name: `TIMER: ${OLD.name}`, code: OLD, savedCode: OLD, path: '' }] as any);
            }}
        >
            <Host />
        </RecoilRoot>
    );

const editAndSave = async (aTask: string, aSchedule: string) => {
    fireEvent.change(screen.getByTestId('timer-detail-task'), { target: { value: aTask } });
    fireEvent.change(screen.getByTestId('timer-detail-schedule'), { target: { value: aSchedule } });
    await act(async () => {
        fireEvent.click(screen.getByText('Save'));
    });
};

const value = (aId: string) => (screen.getByTestId(aId) as HTMLInputElement).value ?? screen.getByTestId(aId).querySelector('input')?.value;

beforeEach(() => jest.clearAllMocks());

test('a failed save the server stored anyway shows the stored timer and keeps the error', async () => {
    (modTimer as jest.Mock).mockResolvedValue({ success: false, reason: "not found '/missing.tql'" });
    const SERVER = { ...OLD, task: '/missing.tql', schedule: '@every 2h', state: 'FAILED' };
    (getTimerItem as jest.Mock).mockResolvedValue({ success: true, data: SERVER });
    renderTimer();
    await editAndSave('/missing.tql', '@every 2h');

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(value('timer-detail-task')).toBe('/missing.tql');
    expect(value('timer-detail-schedule')).toBe('@every 2h');
    expect(screen.getByText("not found '/missing.tql'")).toBeInTheDocument();
    // the side tree reopens timers from this list
    expect(sList[0]).toEqual(SERVER);
});

test('a failed save the server did not store keeps the typed values to fix', async () => {
    (modTimer as jest.Mock).mockResolvedValue({ success: false, reason: 'invalid schedule' });
    (getTimerItem as jest.Mock).mockResolvedValue({ success: true, data: OLD });
    renderTimer();
    await editAndSave('/old.tql', 'not a schedule');

    expect(value('timer-detail-schedule')).toBe('not a schedule');
    expect(screen.getByText('invalid schedule')).toBeInTheDocument();
    expect(screen.getByText('STOP')).toBeInTheDocument();
});
