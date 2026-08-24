// issue #1452 — `runScript` is the SCRIPT("js", …) sibling of `runShell`.
//
// Two things are pinned here:
//   1. the StepResult contract is byte-for-byte the one `runShell` returns, so
//      lifecycle steps can be swapped between the two transports; and
//   2. NO runtime value ever reaches the TQL body. The body is JavaScript
//      source — a package name carrying a quote, a backtick or a newline that
//      got concatenated in would be arbitrary code running on the server, not a
//      broken string. That is the regression this file exists to catch.

import { getTqlChart } from '@/api/repository/machiot';
import { runScript } from './script';

jest.mock('@/api/repository/machiot', () => ({
    getTqlChart: jest.fn(),
}));

const mockTql = getTqlChart as jest.MockedFunction<typeof getTqlChart>;

const okResponse = (rows: unknown[]) => ({ data: { success: true, data: { rows } } }) as any;

describe('runScript — request shape', () => {
    beforeEach(() => jest.resetAllMocks());

    test("posts as type 'pkg' and passes bindings through the axios params object", async () => {
        mockTql.mockResolvedValue(okResponse([]));

        await runScript('$.yield("hi");', { app: 'pkg-a', archive: '/work/pkg-archives/pkg-a-1.0.0.zip' });

        expect(mockTql).toHaveBeenCalledTimes(1);
        const [body, type, signal, params] = mockTql.mock.calls[0];
        expect(type).toBe('pkg');
        expect(signal).toBeUndefined();
        // params must be the 4th argument (axios `params`), NOT a query string
        // glued onto the url — the api core rewrites `/api/tql/pkg` to
        // `/api/tql`, which would discard a hand-built query.
        expect(params).toEqual({ app: 'pkg-a', archive: '/work/pkg-archives/pkg-a-1.0.0.zip' });
        expect(body).toContain('SCRIPT("js"');
        expect(body).toContain('JSON(rowsFlatten(true))');
    });

    test('omits params entirely when the caller has no bindings', async () => {
        mockTql.mockResolvedValue(okResponse([]));

        await runScript('$.yield(1);');

        expect(mockTql.mock.calls[0][3]).toBeUndefined();
    });
});

describe('runScript — code injection regression (issue #1452)', () => {
    beforeEach(() => jest.resetAllMocks());

    // Values chosen to break out of every quoting style a naive implementation
    // might have used, plus a statement separator and a newline.
    const hostile = `a"); require('fs').rmSync('/work'); //\n\`\${x}\`'`;

    test('a hostile app name lands in params and never in the TQL body', async () => {
        mockTql.mockResolvedValue(okResponse([]));

        await runScript('$.yield("noop");', { app: hostile, archive: '/work/pkg-archives/x.zip' });

        const [body, , , params] = mockTql.mock.calls[0];
        expect(params).toEqual({ app: hostile, archive: '/work/pkg-archives/x.zip' });
        // No fragment of the payload may appear in the script source.
        expect(body).not.toContain(hostile);
        expect(body).not.toContain('rmSync');
        expect(body).not.toContain('a");');
        expect(body).not.toContain('${x}');
        expect(body).not.toContain('`');
    });

    test('the assembled body depends only on the script argument, not on params', async () => {
        mockTql.mockResolvedValue(okResponse([]));

        await runScript('$.yield("noop");', { app: 'safe', archive: '/a.zip' });
        await runScript('$.yield("noop");', { app: hostile, archive: '/b.zip' });

        expect(mockTql.mock.calls[0][0]).toBe(mockTql.mock.calls[1][0]);
    });
});

describe('runScript — result contract (identical to runShell)', () => {
    beforeEach(() => jest.resetAllMocks());

    test('success rows are joined into the log', async () => {
        mockTql.mockResolvedValue(okResponse(['extracted', 'verified pkg-a@1.0.0', 'installed']));

        await expect(runScript('x')).resolves.toEqual({
            ok: true,
            log: 'extracted\nverified pkg-a@1.0.0\ninstalled',
        });
    });

    test('non-string rows are stringified', async () => {
        mockTql.mockResolvedValue(okResponse([{ a: 1 }]));

        const res = await runScript('x');
        expect(res.ok).toBe(true);
        expect(res.log).toBe('{"a":1}');
    });

    // -----------------------------------------------------------------------
    // THE ROWS ARE THE RESULT — `success` IS NOT (issue #1452)
    // -----------------------------------------------------------------------
    // MEASURED on machbase-neo v8.5.10-snapshot through this exact pipeline:
    //
    //   $.yield("A"); $.yield("B");            → success=true  rows=['A','B']
    //   $.yield("A"); throw new Error("boom"); → success=true  rows=['A']
    //   throw new Error("boom");               → success=true  rows=[]
    //
    // i.e. the transport reports a script that died exactly like one that
    // finished, and the rows yielded before the throw are the ONLY thing that
    // survives. Reading `success` alone is what swallowed "archive must contain
    // exactly one root entry, found 2" and let `stepArchiveExtract` blame a
    // missing directory two steps later.

    test('a sentinel row is a FAILURE, and carries the script\'s own reason', async () => {
        mockTql.mockResolvedValue(okResponse(['using pkg-a.tar.gz for pkg-a 1.0.0', '__PKG_SCRIPT_ERROR__ archive must contain exactly one root entry, found 2']));

        const res = await runScript('x');

        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('archive must contain exactly one root entry, found 2');
        // The rows before the abort are kept: they are the trace of how far it got.
        expect(res.log).toContain('using pkg-a.tar.gz for pkg-a 1.0.0');
    });

    test('a sentinel row anywhere in the output is found, not only the last one', async () => {
        mockTql.mockResolvedValue(okResponse(['__PKG_SCRIPT_ERROR__ no archive for pkg-a 9.9.9', 'trailing noise']));

        expect((await runScript('x')).ok).toBe(false);
    });

    test('a sentinel with no message still fails, with a generic reason', async () => {
        mockTql.mockResolvedValue(okResponse(['__PKG_SCRIPT_ERROR__']));

        const res = await runScript('x');
        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('script aborted');
    });

    // A log line that merely MENTIONS an error is a log line. The sentinel is
    // deliberately unmistakable so a package's own output cannot fake a failure.
    test('an ordinary line that talks about errors is not a failure', async () => {
        mockTql.mockResolvedValue(okResponse(['ERROR: cosmetic', 'error while warming cache (ignored)', 'installed /work/public/pkg-a']));

        await expect(runScript('x')).resolves.toEqual({
            ok: true,
            log: 'ERROR: cosmetic\nerror while warming cache (ignored)\ninstalled /work/public/pkg-a',
        });
    });

    // NO ROWS = IT NEVER GOT TO SPEAK. Every script this runs yields at least once
    // (the scan its document, the extract "using <archive> …"), so silence means a
    // throw from the prelude, a syntax error, a missing module — never success.
    test('success with NO rows is a failure, not an empty log', async () => {
        mockTql.mockResolvedValue({ data: { success: true, data: {} } } as any);

        const res = await runScript('x');
        expect(res.ok).toBe(false);
        expect(res.log).toBe('');
        expect((res as { reason: string }).reason).toBe('script produced no output (it likely threw before yielding)');
    });

    test('one plain row is enough to be a success', async () => {
        mockTql.mockResolvedValue(okResponse(['installed /work/public/pkg-a']));

        await expect(runScript('x')).resolves.toEqual({ ok: true, log: 'installed /work/public/pkg-a' });
    });

    test('success:false surfaces the server reason', async () => {
        mockTql.mockResolvedValue({ data: { success: false, reason: 'archive is missing package.json' } } as any);

        const res = await runScript('x');
        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('archive is missing package.json');
    });

    test('an unparsed JSON error body still yields its reason', async () => {
        // Non-2xx: the api core hands back the raw response and the /api/tql
        // JSON parsing (success path only) never ran, so data is still text.
        mockTql.mockResolvedValue({ data: '{"success":false,"reason":"version mismatch"}' } as any);

        const res = await runScript('x');
        expect(res.ok).toBe(false);
        expect(res.log).toBe('{"success":false,"reason":"version mismatch"}');
        expect((res as { reason: string }).reason).toBe('version mismatch');
    });

    test('an unparseable body falls back to a generic reason', async () => {
        mockTql.mockResolvedValue({ data: 'boom' } as any);

        const res = await runScript('x');
        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('script failed');
    });

    test('a thrown transport error becomes {ok:false} rather than propagating', async () => {
        mockTql.mockRejectedValue(new Error('network down'));

        await expect(runScript('x')).resolves.toEqual({ ok: false, log: 'network down', reason: 'network down' });
    });
});
