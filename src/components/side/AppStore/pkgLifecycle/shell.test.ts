// issue #1570 F-76 — a version typed in the experiment-mode "Custom version" box
// is a shell ARGUMENT: it must not split into more arguments, add a command, or
// end the SHELL(`…`) literal it travels in.

import { getTqlChart } from '@/api/repository/machiot';
import { runShell, shellQuote } from './shell';
import { stepPkgCopy } from './steps/pkgCopy';
import { waitForPkgInstalled } from './fsProbe';

jest.mock('@/api/repository/machiot', () => ({ getTqlChart: jest.fn() }));
jest.mock('./fsProbe', () => ({ waitForPkgInstalled: jest.fn() }));

const mockTql = getTqlChart as jest.MockedFunction<typeof getTqlChart>;
const okResponse = (rows: unknown[]) => ({ data: { success: true, data: { rows } } }) as any;

beforeEach(() => {
    jest.resetAllMocks();
    mockTql.mockResolvedValue(okResponse(['done']));
    (waitForPkgInstalled as jest.Mock).mockResolvedValue(true);
});

describe('shellQuote', () => {
    test.each([
        ['1.0.6', `'1.0.6'`],
        ['1.0 extra', `'1.0 extra'`],
        ['1.0;rm -rf /work', `'1.0;rm -rf /work'`],
        ['1.0$(id)', `'1.0$(id)'`],
        ["it's", `'it'"'"'s'`],
    ])('%s → %s', (value, quoted) => {
        expect(shellQuote(value)).toBe(quoted);
    });
});

describe('runShell', () => {
    test('a command without args is sent as one backtick literal, no params', async () => {
        await runShell('pkg copy github.com/a/b /work/public/b');
        const [body, type, , params] = mockTql.mock.calls[0];
        expect(body).toBe('FAKE(once(1))\nSHELL(`pkg copy github.com/a/b /work/public/b`)\nJSON(rowsFlatten(true))');
        expect(type).toBe('pkg');
        expect(params).toBeUndefined();
    });

    test('an arg is read back with param() and sent quoted, never as TQL text', async () => {
        const hostile = '1.0 `x` $(id); rm -rf /work';
        await runShell('pkg copy github.com/a/b@{tag} /work/public/b', { tag: hostile });
        const [body, , , params] = mockTql.mock.calls[0];
        expect(body).toBe('FAKE(once(1))\nSHELL(`pkg copy github.com/a/b@` + param("tag") + ` /work/public/b`)\nJSON(rowsFlatten(true))');
        expect(body).not.toContain('rm -rf');
        expect(params).toEqual({ tag: `'${hostile}'` });
    });
});

describe('stepPkgCopy', () => {
    const ctx = (tag?: string) => ({ appName: 'neo-pkg-demo', fullName: 'machbase/neo-pkg-demo', tag, logs: [] as string[] }) as any;

    test.each(['1.0 extra', '1.0`id`', '1.0$(id)'])('a typed version %p stays one argument', async (tag) => {
        await stepPkgCopy(ctx(tag));
        const [body, , , params] = mockTql.mock.calls[0];
        expect(body).toContain('SHELL(`pkg copy github.com/machbase/neo-pkg-demo@` + param("tag") + ` /work/public/neo-pkg-demo`)');
        expect(body).not.toContain(tag);
        expect(params).toEqual({ tag: `'${tag}'` });
    });

    test('a normal version still goes out as @<tag>', async () => {
        const c = ctx('1.0.6-dev');
        await stepPkgCopy(c);
        expect(mockTql.mock.calls[0][3]).toEqual({ tag: `'1.0.6-dev'` });
        expect(c.logs[0]).toBe('== pkg copy github.com/machbase/neo-pkg-demo@1.0.6-dev /work/public/neo-pkg-demo ==');
    });

    test('no version keeps the HEAD checkout and no params', async () => {
        await stepPkgCopy(ctx(undefined));
        const [body, , , params] = mockTql.mock.calls[0];
        expect(body).toContain('SHELL(`pkg copy github.com/machbase/neo-pkg-demo /work/public/neo-pkg-demo`)');
        expect(params).toBeUndefined();
    });
});
