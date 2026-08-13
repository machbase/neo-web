// issue #1452 — update flow source branching.
//
// `stepArchiveExtract` replaces `stepPkgCopy(ctx, { force: true })` — including
// its force semantics, which it now takes as the SAME `{ force: true }` option:
// merge the new tree over the installed one and keep the files the archive does
// not carry (conf/, logs/, data/). Passing it is load-bearing, so it is asserted
// here and not merely implied. Everything around it (stop → copy → re-read →
// install → start) must stay put.

import { runUpdate } from './updateFlow';
import { stepArchiveExtract } from './steps/archiveExtract';
import { stepPkgCopy } from './steps/pkgCopy';
import { stepReadManifest } from './steps/readManifest';
import { stepRunInstall } from './steps/runInstall';
import { stepRunStart } from './steps/runStart';
import { stepRunStop } from './steps/runStop';
import type { LifecycleContext } from './types';

jest.mock('./steps/archiveExtract', () => ({ stepArchiveExtract: jest.fn() }));
jest.mock('./steps/pkgCopy', () => ({ stepPkgCopy: jest.fn() }));
jest.mock('./steps/readManifest', () => ({ stepReadManifest: jest.fn() }));
jest.mock('./steps/runInstall', () => ({ stepRunInstall: jest.fn() }));
jest.mock('./steps/runStart', () => ({ stepRunStart: jest.fn() }));
jest.mock('./steps/runStop', () => ({ stepRunStop: jest.fn() }));

const mockExtract = stepArchiveExtract as jest.MockedFunction<typeof stepArchiveExtract>;
const mockCopy = stepPkgCopy as jest.MockedFunction<typeof stepPkgCopy>;
const mockRead = stepReadManifest as jest.MockedFunction<typeof stepReadManifest>;
const mockInstall = stepRunInstall as jest.MockedFunction<typeof stepRunInstall>;
const mockStart = stepRunStart as jest.MockedFunction<typeof stepRunStart>;
const mockStop = stepRunStop as jest.MockedFunction<typeof stepRunStop>;

const makeCtx = (over: Partial<LifecycleContext> = {}): LifecycleContext => ({
    appName: 'pkg-a',
    fullName: 'machbase/pkg-a',
    logs: [],
    ...over,
});

describe('runUpdate — fetch step selection', () => {
    let order: string[];

    /** Manifest scripts returned by the 1st and the 2nd stepReadManifest call. */
    const withManifests = (pre: LifecycleContext['manifest'], post: LifecycleContext['manifest']) => {
        let call = 0;
        mockRead.mockImplementation(async (ctx: LifecycleContext) => {
            order.push('readManifest');
            ctx.manifest = call++ === 0 ? pre : post;
            return { ok: true, log: 'manifest loaded' };
        });
    };

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
        mockInstall.mockImplementation(async () => {
            order.push('runInstall');
            return { ok: true, log: 'installed' };
        });
        mockStart.mockImplementation(async () => {
            order.push('runStart');
            return { ok: true, log: 'started' };
        });
        mockStop.mockImplementation(async () => {
            order.push('runStop');
            return { ok: true, log: 'stopped' };
        });
        withManifests(undefined, undefined);
    });

    // issue #1452 — `source` ALONE decides; the archive is found server-side from
    // the package name and `ctx.tag`.
    test("source 'local' → archiveExtract with force:true, replacing pkgCopy -f", async () => {
        const ctx = makeCtx({ source: 'local', tag: '2.0.0' });

        await expect(runUpdate(ctx)).resolves.toEqual({ ok: true, log: '' });

        // WITHOUT `{ force: true }` the extract step refuses an existing
        // destination — an update would fail outright. And the older reading of
        // force (delete dest, then rename) is what destroyed user config.
        expect(mockExtract).toHaveBeenCalledWith(ctx, { force: true });
        expect(mockCopy).not.toHaveBeenCalled();
        expect(order).toEqual(['readManifest', 'archiveExtract', 'readManifest']);
    });

    test("source 'hub' → pkgCopy with force:true", async () => {
        const ctx = makeCtx({ source: 'hub', tag: 'v2.0.0' });

        await runUpdate(ctx);

        expect(mockCopy).toHaveBeenCalledWith(ctx, { force: true });
        expect(mockExtract).not.toHaveBeenCalled();
    });

    test('undefined source → pkgCopy with force:true (unchanged legacy path)', async () => {
        await runUpdate(makeCtx());

        expect(mockCopy).toHaveBeenCalledWith(makeCtx(), { force: true });
        expect(mockExtract).not.toHaveBeenCalled();
    });

    // No silent reroute to GitHub: the extract step refuses a versionless context
    // with a message, which is what an air-gapped admin needs to see.
    test("source 'local' with no version still routes to archiveExtract", async () => {
        await runUpdate(makeCtx({ source: 'local' }));

        expect(mockExtract).toHaveBeenCalledTimes(1);
        expect(mockExtract.mock.calls[0][1]).toEqual({ force: true });
        expect(mockCopy).not.toHaveBeenCalled();
    });

    test('local + pre-update stop script → stop → extract → re-read → install → start', async () => {
        withManifests({ scripts: { stop: 'stop.sh' } }, { scripts: { install: 'setup.sh' } });
        const ctx = makeCtx({ source: 'local', tag: '2.0.0' });

        await expect(runUpdate(ctx)).resolves.toEqual({ ok: true, log: '' });

        expect(order).toEqual(['readManifest', 'runStop', 'archiveExtract', 'readManifest', 'runInstall', 'runStart']);
    });

    test('local + stop but no post-update install script → still restarts', async () => {
        withManifests({ scripts: { stop: 'stop.sh' } }, {});
        const ctx = makeCtx({ source: 'local', tag: '2.0.0' });

        await runUpdate(ctx);

        expect(order).toEqual(['readManifest', 'runStop', 'archiveExtract', 'readManifest', 'runStart']);
    });

    test('a failing archiveExtract aborts before the post-update manifest read', async () => {
        mockExtract.mockResolvedValue({ ok: false, log: 'boom', reason: 'version mismatch' });
        const ctx = makeCtx({ source: 'local', tag: '2.0.0' });

        const res = await runUpdate(ctx);

        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('version mismatch');
        expect(mockRead).toHaveBeenCalledTimes(1);
        expect(mockInstall).not.toHaveBeenCalled();
        expect(mockStart).not.toHaveBeenCalled();
    });
});
