import { runShell } from '../shell';
import { runScript } from '../script';
import type { LifecycleContext } from '../types';
import { stepRunInstall } from './runInstall';

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

test('rejects SHELL success when the install completion marker is absent', async () => {
    script.mockResolvedValue({ ok: false, log: 'missing marker', reason: 'The package install did not complete successfully.' });
    expect((await stepRunInstall(context())).ok).toBe(false);
    expect(script).toHaveBeenCalledWith(expect.any(String), { action: 'install-result', name: 'sample', job: 'job-1' });
});

test('accepts a quiet install only after verifying its successful completion', async () => {
    expect((await stepRunInstall(context())).ok).toBe(true);
    expect(shell).toHaveBeenCalledWith('/work/.extension/dashboard-panels/.staging/job-1/run-install.js');
    expect(script).toHaveBeenCalledTimes(1);
});

test('returns shell failure without checking a possibly stale marker', async () => {
    const failure = { ok: false as const, log: 'failed to start', reason: 'failed to start' };
    shell.mockResolvedValue(failure);
    expect(await stepRunInstall(context())).toEqual(failure);
    expect(script).not.toHaveBeenCalled();
});

test('preserves the existing command when no extension SDK is supplied', async () => {
    const ctx = context();
    ctx.extensionInstallApi = undefined;
    expect((await stepRunInstall(ctx)).ok).toBe(true);
    expect(shell).toHaveBeenCalledWith('pkg run -C /work/public/sample install');
    expect(script).not.toHaveBeenCalled();
});

test.each([
    { appName: 'sample;exit', extensionInstallApi: api },
    { appName: '../sample', extensionInstallApi: api },
    { appName: 'sample', extensionInstallApi: api + ';exit' },
    { appName: 'sample', extensionInstallApi: '/work/.extension/dashboard-panels/.staging/../neo-install-api.js' },
])('rejects unsafe execution paths before starting the shell: %j', async (input) => {
    expect((await stepRunInstall({ ...context(), ...input })).ok).toBe(false);
    expect(shell).not.toHaveBeenCalled();
    expect(script).not.toHaveBeenCalled();
});
