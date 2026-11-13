import { runShell } from '../shell';
import { runScript } from '../script';
import type { LifecycleContext } from '../types';
import { stepRunStop } from './runStop';

jest.mock('../shell', () => ({ runShell: jest.fn() }));
jest.mock('../script', () => ({ runScript: jest.fn() }));

const shell = runShell as jest.MockedFunction<typeof runShell>;
const script = runScript as jest.MockedFunction<typeof runScript>;
const api = '/work/.extension/dashboard-panels/.staging/job-1/neo-install-api.js';
const context = (): LifecycleContext => ({
    appName: 'sample', fullName: 'example/sample', logs: [], extensionInstallApi: api,
});

beforeEach(() => {
    jest.clearAllMocks();
    shell.mockResolvedValue({ ok: true, log: '' });
    script.mockResolvedValue({ ok: true, log: 'null' });
});

test('rejects SHELL success when the update-stop completion marker is absent', async () => {
    script.mockImplementation(async (_body, params) => params?.action === 'update-stop-begin' ? { ok: true, log: 'null' } : { ok: false, log: 'missing marker', reason: 'The package update stop did not complete successfully.' });
    expect((await stepRunStop(context())).ok).toBe(false);
    expect(script).toHaveBeenCalledWith(expect.any(String), { action: 'update-stop-result', name: 'sample', job: 'job-1' });
});

test('accepts a quiet stop only after verifying its successful completion', async () => {
    expect((await stepRunStop(context())).ok).toBe(true);
    expect(shell).toHaveBeenCalledWith('/work/.extension/dashboard-panels/.staging/job-1/run-update-stop.js');
    expect(script).toHaveBeenCalledTimes(2);
});

test('returns shell failure without checking a possibly stale marker', async () => {
    const failure = { ok: false as const, log: 'failed to start', reason: 'failed to start' };
    shell.mockResolvedValue(failure);
    expect(await stepRunStop(context())).toEqual(failure);
    expect(script).toHaveBeenCalledTimes(1);
    expect(script).toHaveBeenCalledWith(expect.any(String), { action: 'update-stop-begin', name: 'sample', job: 'job-1' });
});

test('preserves the existing command when no prepared package context is supplied', async () => {
    const ctx = context();
    ctx.extensionInstallApi = undefined;
    expect((await stepRunStop(ctx)).ok).toBe(true);
    expect(shell).toHaveBeenCalledWith('pkg run -C /work/public/sample stop');
    expect(script).not.toHaveBeenCalled();
});

test.each([
    { appName: 'sample;exit', extensionInstallApi: api },
    { appName: '../sample', extensionInstallApi: api },
    { appName: 'sample', extensionInstallApi: api + ';exit' },
    { appName: 'sample', extensionInstallApi: '/work/.extension/dashboard-panels/.staging/../neo-install-api.js' },
])('rejects unsafe execution paths before starting the shell: %j', async (input) => {
    expect((await stepRunStop({ ...context(), ...input })).ok).toBe(false);
    expect(shell).not.toHaveBeenCalled();
    expect(script).not.toHaveBeenCalled();
});

test('validation or marker-reset failure cannot fall back to the installed stop', async () => {
    const failure = {ok:false as const,log:'invalid prepared hook',reason:'invalid prepared hook'};
    script.mockResolvedValue(failure);
    expect(await stepRunStop(context())).toEqual(failure);
    expect(shell).not.toHaveBeenCalled();
});
