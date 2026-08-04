// issue #1452 — install flow source branching.
//
// The only thing that may change with `source` is WHERE the bytes come from.
// Every other step, and their order, must be identical between the GitHub and
// the local-archive path — that invariant is what these tests hold down.

import { runInstall } from './installFlow';
import { stepArchiveExtract } from './steps/archiveExtract';
import { stepPkgCopy } from './steps/pkgCopy';
import { stepReadManifest } from './steps/readManifest';
import { stepRunInstall } from './steps/runInstall';
import type { LifecycleContext } from './types';

jest.mock('./steps/archiveExtract', () => ({ stepArchiveExtract: jest.fn() }));
jest.mock('./steps/pkgCopy', () => ({ stepPkgCopy: jest.fn() }));
jest.mock('./steps/readManifest', () => ({ stepReadManifest: jest.fn() }));
jest.mock('./steps/runInstall', () => ({ stepRunInstall: jest.fn() }));

const mockExtract = stepArchiveExtract as jest.MockedFunction<typeof stepArchiveExtract>;
const mockCopy = stepPkgCopy as jest.MockedFunction<typeof stepPkgCopy>;
const mockRead = stepReadManifest as jest.MockedFunction<typeof stepReadManifest>;
const mockInstall = stepRunInstall as jest.MockedFunction<typeof stepRunInstall>;

const makeCtx = (over: Partial<LifecycleContext> = {}): LifecycleContext => ({
    appName: 'pkg-a',
    fullName: 'machbase/pkg-a',
    logs: [],
    ...over,
});

describe('runInstall — fetch step selection', () => {
    let order: string[];

    beforeEach(() => {
        jest.resetAllMocks();
        order = [];
        mockExtract.mockImplementation(async () => {
            order.push('archiveExtract');
            return { ok: true, log: 'extracted' };
        });
        mockCopy.mockImplementation(async () => {
            order.push('pkgCopy');
            return { ok: true, log: 'copied' };
        });
        mockRead.mockImplementation(async () => {
            order.push('readManifest');
            return { ok: true, log: 'manifest loaded' };
        });
        mockInstall.mockImplementation(async () => {
            order.push('runInstall');
            return { ok: true, log: 'installed' };
        });
    });

    // issue #1452 — `source` ALONE decides. There is no archive path to check for
    // any more: the browser sends `{ name, version }` and the server finds the zip.
    test("source 'local' → archiveExtract, never pkgCopy", async () => {
        const ctx = makeCtx({ source: 'local', tag: '1.0.0' });

        await expect(runInstall(ctx)).resolves.toEqual({ ok: true, log: '' });

        expect(mockExtract).toHaveBeenCalledWith(ctx);
        expect(mockCopy).not.toHaveBeenCalled();
        expect(order).toEqual(['archiveExtract', 'readManifest']);
    });

    // INSTALL IS NOT FORCED — only `runUpdate` passes `{ force: true }`. For the
    // archive path the flag is what decides between "the destination must not
    // exist, rename into it" and "merge over it, keeping the user's conf/".
    test('neither fetch step is forced on the install flow', async () => {
        await runInstall(makeCtx({ source: 'local', tag: '1.0.0' }));
        expect(mockExtract.mock.calls[0][1]).toBeUndefined();

        jest.clearAllMocks();
        await runInstall(makeCtx({ source: 'hub', tag: 'v1.0.0' }));
        expect(mockCopy.mock.calls[0][1]).toBeUndefined();
    });

    test("source 'hub' → pkgCopy, never archiveExtract", async () => {
        const ctx = makeCtx({ source: 'hub', tag: 'v1.0.0' });

        await runInstall(ctx);

        expect(mockCopy).toHaveBeenCalledWith(ctx);
        expect(mockExtract).not.toHaveBeenCalled();
    });

    test('undefined source → pkgCopy (no row was picked; NOT an offline signal)', async () => {
        const ctx = makeCtx();

        await runInstall(ctx);

        expect(mockCopy).toHaveBeenCalledTimes(1);
        expect(mockExtract).not.toHaveBeenCalled();
    });

    // The step itself refuses a context with no version (archiveExtract.ts); the
    // flow must NOT quietly reroute it to GitHub, which on an air-gapped server
    // would fail with a network error instead of saying what is wrong.
    test("source 'local' with no version still routes to archiveExtract", async () => {
        const ctx = makeCtx({ source: 'local' });

        await runInstall(ctx);

        expect(mockExtract).toHaveBeenCalledTimes(1);
        expect(mockCopy).not.toHaveBeenCalled();
    });

    test('the remaining sequence is unchanged on the local path (install script runs)', async () => {
        mockRead.mockImplementation(async (ctx: LifecycleContext) => {
            order.push('readManifest');
            ctx.manifest = { scripts: { install: 'setup.sh' } };
            return { ok: true, log: 'manifest loaded' };
        });
        const ctx = makeCtx({ source: 'local', tag: '1.0.0' });

        await expect(runInstall(ctx)).resolves.toEqual({ ok: true, log: '' });

        expect(order).toEqual(['archiveExtract', 'readManifest', 'runInstall']);
    });

    test('a failing archiveExtract aborts before readManifest', async () => {
        mockExtract.mockResolvedValue({ ok: false, log: 'boom', reason: 'archive is missing package.json' });
        const ctx = makeCtx({ source: 'local', tag: '1.0.0' });
        ctx.logs.push('ctx log');

        const res = await runInstall(ctx);

        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('archive is missing package.json');
        expect(res.log).toBe('ctx log');
        expect(mockRead).not.toHaveBeenCalled();
    });
});
