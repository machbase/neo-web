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
