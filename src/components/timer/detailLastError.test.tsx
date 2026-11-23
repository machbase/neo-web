// issue #768 — the timer detail. A timer that stopped on a failure comes back as
// `STOP, <failure>`: the state badge shows the word only, and the failure is shown once, in the
// Last Error block.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { Timer } from './index';
import { gActiveTimer, gBoardList, gTimerList } from '@/recoil/recoil';
import { getTimerItem, sendTimerCommand } from '@/api/repository/timer';

jest.mock('@/api/repository/timer', () => ({
    ...jest.requireActual('@/api/repository/timer'),
    genTimer: jest.fn(),
    getTimer: jest.fn(),
    getTimerItem: jest.fn(),
    modTimer: jest.fn(),
    delTimer: jest.fn(),
    sendTimerCommand: jest.fn(),
}));
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(async () => ({ success: true, data: { children: [] } })) }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(async () => ({ data: { children: [] } })) }));

const FAILURE = 'MACHCLI-ERR-2025, Table SENSOR_DATA does not exist.';
const BASE: any = { id: 7, name: 'nightly', type: 'TIMER', state: 'STOP', task: '/nightly.tql', schedule: '@every 10s', autoStart: false, continueOnError: true };

const renderTimer = (aTimer: any) =>
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gActiveTimer, aTimer.id);
                set(gTimerList, [aTimer]);
                set(gBoardList, [{ id: 'board-1', type: 'timer', name: `TIMER: ${aTimer.name}`, code: aTimer, savedCode: aTimer, path: '' }] as any);
            }}
        >
            <Timer pCode={aTimer} />
        </RecoilRoot>
    );

test('the state badge shows the state word without the failure the server appended', () => {
    renderTimer({ ...BASE, continueOnError: false, state: `STOP, ${FAILURE}`, lastError: FAILURE, lastErrorAt: '2026-11-19T17:13:21.002041+09:00' });
    expect(screen.getByText('STOP')).toBeInTheDocument();
    expect(screen.queryByText(`STOP, ${FAILURE}`)).not.toBeInTheDocument();
});

test('a plain state shows as it is', () => {
    renderTimer({ ...BASE, state: 'RUNNING' });
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
});

// local wall-clock time of an instant, the way the block shows it
const localText = (aIso: string) => {
    const d = new Date(aIso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

describe('Last Error', () => {
    test('no failure on record shows no block', () => {
        renderTimer({ ...BASE, state: 'RUNNING' });
        expect(screen.queryByText('Last Error')).not.toBeInTheDocument();
        expect(screen.queryByTestId('timer-last-error')).not.toBeInTheDocument();
    });

    // the same record in every state — what the timer does now is the switch's to say
    const STATES: [string, any][] = [
        ['running after a failure it ran past', { state: 'RUNNING', continueOnError: true }],
        ['stopped by the failure (the server appends it to the state)', { state: `STOP, ${FAILURE}`, continueOnError: false }],
        ['stopped, after a server restart dropped what the state carried', { state: 'STOP', continueOnError: false }],
        ['stopped by the user', { state: 'STOP', continueOnError: true }],
    ];
    test.each(STATES)('%s: the time and the failure, nothing about running or stopping, no error colour', (_aCase, aState) => {
        renderTimer({ ...BASE, ...aState, lastError: FAILURE, lastErrorAt: '2026-11-19T17:13:21.002041+09:00' });
        const sBlock = screen.getByTestId('timer-last-error');
        expect(screen.getByText('Last Error')).toBeInTheDocument();
        expect(sBlock.textContent).toBe(`${screen.getByTestId('timer-last-error-at').textContent}${FAILURE}`);
        expect(sBlock).not.toHaveTextContent(/kept running|stopped the timer/);
        expect(sBlock.querySelector('svg')).toBeNull();
        expect(sBlock.querySelector('pre')).toHaveTextContent(FAILURE);
        expect(sBlock.querySelector('pre')?.className).toBe('message');
        // the failure shows once — not in the badge as well
        expect(screen.getAllByText(FAILURE, { exact: false })).toHaveLength(1);
    });

    test('the time is local YYYY-MM-DD HH:mm:ss, not the server string', () => {
        const sAt = '2026-11-19T17:13:25.002041+09:00';
        renderTimer({ ...BASE, state: 'RUNNING', lastError: FAILURE, lastErrorAt: sAt });
        expect(screen.getByTestId('timer-last-error-at')).toHaveTextContent(localText(sAt));
        expect(screen.getByTestId('timer-last-error-at').textContent).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(screen.queryByText(sAt, { exact: false })).not.toBeInTheDocument();
    });

    test('a time that does not parse is left out rather than shown raw', () => {
        renderTimer({ ...BASE, state: 'RUNNING', lastError: FAILURE, lastErrorAt: 'not-a-time' });
        expect(screen.queryByTestId('timer-last-error-at')).not.toBeInTheDocument();
        expect(screen.getByTestId('timer-last-error').textContent).toBe(FAILURE);
    });

    test('the block sits under Task, above Delete/Save', () => {
        renderTimer({ ...BASE, state: 'RUNNING', lastError: FAILURE, lastErrorAt: '2026-11-19T17:13:25+09:00' });
        const sTask = screen.getByTestId('timer-detail-task');
        const sBlock = screen.getByTestId('timer-last-error');
        const sDelete = screen.getByTestId('timer-delete');
        expect(sTask.compareDocumentPosition(sBlock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(sBlock.compareDocumentPosition(sDelete) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});

describe('start/stop', () => {
    const clickSwitch = async () => {
        await act(async () => fireEvent.click(screen.getByTestId('timer-detail').querySelector('label[for^="switch-"]') as HTMLElement));
    };

    test('a start that fails at once shows the new failure, not the one the screen opened with', async () => {
        const OLD_FAILURE = 'old failure';
        const NEW_FAILURE = 'MACHCLI-ERR-2025, Table OTHER does not exist.';
        const sOpened = { ...BASE, continueOnError: false, state: 'STOP', lastError: OLD_FAILURE, lastErrorAt: '2026-11-19T17:13:21+09:00' };
        (sendTimerCommand as jest.Mock).mockResolvedValue({ success: true });
        (getTimerItem as jest.Mock).mockResolvedValue({ success: true, data: { ...sOpened, state: `STOP, ${NEW_FAILURE}`, lastError: NEW_FAILURE, lastErrorAt: '2026-11-23T09:00:00+09:00' } });
        renderTimer(sOpened);
        expect(screen.getByTestId('timer-last-error')).toHaveTextContent(OLD_FAILURE);
        await clickSwitch();
        const sBlock = screen.getByTestId('timer-last-error');
        expect(sBlock).toHaveTextContent(NEW_FAILURE);
        expect(sBlock).not.toHaveTextContent(OLD_FAILURE);
    });

    test('a failure that happened while the screen was open appears after start/stop', async () => {
        const sOpened = { ...BASE, continueOnError: false, state: 'RUNNING' };
        (sendTimerCommand as jest.Mock).mockResolvedValue({ success: true });
        (getTimerItem as jest.Mock).mockResolvedValue({ success: true, data: { ...sOpened, state: `STOP, ${FAILURE}`, lastError: FAILURE, lastErrorAt: '2026-11-23T09:00:00+09:00' } });
        renderTimer(sOpened);
        expect(screen.queryByTestId('timer-last-error')).not.toBeInTheDocument();
        await clickSwitch();
        expect(screen.getByTestId('timer-last-error')).toHaveTextContent(FAILURE);
    });

    test('edits typed into the form survive start/stop', async () => {
        const sOpened = { ...BASE, state: 'STOP' };
        (sendTimerCommand as jest.Mock).mockResolvedValue({ success: true });
        (getTimerItem as jest.Mock).mockResolvedValue({ success: true, data: { ...sOpened, state: 'RUNNING' } });
        renderTimer(sOpened);
        fireEvent.change(screen.getByTestId('timer-detail-schedule'), { target: { value: '@every 5m' } });
        await clickSwitch();
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
        expect(screen.getByTestId('timer-detail-schedule')).toHaveValue('@every 5m');
    });
});
