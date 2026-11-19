// issue #768 — the timer detail. A timer that stopped on a failure comes back as
// `STOP, <failure>`: the state badge shows the word only, and the failure is shown once, in the
// Last Error block.

import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { Timer } from './index';
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

    test('a failure the timer ran past is a neutral record: "kept running", no error colour', () => {
        renderTimer({ ...BASE, state: 'RUNNING', lastError: FAILURE, lastErrorAt: '2026-11-19T17:13:25.002041+09:00' });
        const sBlock = screen.getByTestId('timer-last-error');
        expect(screen.getByText('Last Error')).toBeInTheDocument();
        expect(sBlock).toHaveAttribute('data-stopped', 'false');
        expect(sBlock.className).toBe('');
        expect(sBlock).toHaveTextContent('· kept running');
        expect(sBlock).not.toHaveTextContent('stopped the timer');
        expect(sBlock.querySelector('svg')).toBeNull();
        expect(sBlock.querySelector('pre')).toHaveTextContent(FAILURE);
    });

    test('the failure that stopped the timer is red and says so — and shows once, not in the badge as well', () => {
        renderTimer({ ...BASE, continueOnError: false, state: `STOP, ${FAILURE}`, lastError: FAILURE, lastErrorAt: '2026-11-19T17:13:21.002041+09:00' });
        const sBlock = screen.getByTestId('timer-last-error');
        expect(sBlock).toHaveAttribute('data-stopped', 'true');
        expect(sBlock.className).toBe('stopped');
        expect(sBlock).toHaveTextContent('· stopped the timer');
        expect(sBlock.querySelector('svg')).not.toBeNull();
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
        expect(screen.getByTestId('timer-last-error')).toHaveTextContent(/^kept running/);
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
