// issue #1570 F-144 — after Create succeeds the tab must move to the new timer's detail (the
// filled form used to stay and a second click created a duplicate), and Create must not send
// a second `timer.add` while the first is still in flight.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { Timer } from './index';
import { genTimer, getTimer } from '@/api/repository/timer';
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

const CREATED: any = { id: 42, name: 'nightly', type: 'TIMER', state: 'STOP', task: '/a.tql', schedule: '@every 1h', autoStart: false };

// the tab body re-reads its code from the board list, as MainContent does
const Host = () => {
    const sBoards = useRecoilValue<any[]>(gBoardList);
    return <Timer pCode={sBoards[0].code} />;
};

const renderCreate = () =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveTimer, undefined);
                set(gTimerList, []);
                set(gBoardList, [{ id: 'board-1', type: 'timer', name: 'TIMER: create', code: undefined, savedCode: false, path: '' }] as any);
            }}
        >
            <Host />
        </RecoilRoot>
    );

const fill = () => {
    fireEvent.change(screen.getByTestId('timer-name'), { target: { value: 'nightly' } });
    fireEvent.change(screen.getByTestId('timer-schedule'), { target: { value: '@every 1h' } });
    fireEvent.change(screen.getByTestId('timer-path'), { target: { value: '/a.tql' } });
};

beforeEach(() => {
    jest.clearAllMocks();
    (getTimer as jest.Mock).mockResolvedValue({ success: true, data: [CREATED] });
});

test('a successful create opens the created timer', async () => {
    (genTimer as jest.Mock).mockResolvedValue({ success: true, reason: 'success', elapse: '', id: 42 });
    renderCreate();
    fill();
    await act(async () => {
        fireEvent.click(screen.getByTestId('timer-create-submit'));
    });

    expect(screen.queryByTestId('timer-create-submit')).not.toBeInTheDocument();
    expect(screen.getByText('nightly')).toBeInTheDocument();
});

test('clicking Create three times while the request is pending sends one request', async () => {
    let resolve: (v: any) => void = () => {};
    (genTimer as jest.Mock).mockImplementation(() => new Promise((r) => (resolve = r)));
    renderCreate();
    fill();
    const sButton = screen.getByTestId('timer-create-submit');
    fireEvent.click(sButton);
    fireEvent.click(sButton);
    fireEvent.click(sButton);
    await act(async () => {
        resolve({ success: true, reason: 'success', elapse: '', id: 42 });
    });

    expect(genTimer).toHaveBeenCalledTimes(1);
});

test('a rejected create keeps the form and its message', async () => {
    (genTimer as jest.Mock).mockResolvedValue({ success: false, reason: 'invalid schedule', elapse: '' });
    (getTimer as jest.Mock).mockResolvedValue({ success: true, data: [] });
    renderCreate();
    fill();
    await act(async () => {
        fireEvent.click(screen.getByTestId('timer-create-submit'));
    });

    expect(screen.getByTestId('timer-create-submit')).toBeInTheDocument();
    expect(screen.getByText('invalid schedule')).toBeInTheDocument();
});
