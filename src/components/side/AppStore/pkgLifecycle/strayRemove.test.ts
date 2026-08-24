// issue #1452 — deleting a `/public/` directory that was never installed.
//
// TWO THINGS ARE UNDER TEST AND BOTH ARE ABOUT THE SAME BUG.
//
// 1. WHAT IS ALLOWED THROUGH. The removal used to be `rm -rf /work/public/<dir>`,
//    a COMMAND STRING, so the validator had to refuse every name a shell would
//    mangle — and macOS's own name for a duplicated download,
//    `neo-pkg-replication-1.0.6 2`, is exactly such a name. The commonest stray
//    there is was the one the feature could not remove ("… is not a removable
//    directory name."). The shell is gone, so spaces (and unicode, and brackets)
//    are ordinary directory names again. The traversal refusals stay: those are
//    about which DIRECTORY is named, which no transport makes safe.
//
// 2. WHAT ACTUALLY RUNS. `runShell` must not be reached at all — the assertion is
//    written against the mocked module rather than against the command string, so
//    a future "simplification" back to `rm -rf` fails here instead of on a user's
//    neighbouring directory. The script SOURCE is then executed against a faked
//    `fs`, with `"has space 2"` and `"keep"` side by side, because "one argument,
//    not two" is the entire point and only a run can show it.

import { checkStrayRemoval, runStrayRemove, strayDisplayPath, STRAY_REMOVE_ROOT, STRAY_REMOVE_SCRIPT } from './strayRemove';
import { runScript } from './script';
import { runShell } from './shell';
import { waitForPkgRemoved } from './fsProbe';
import { SCRIPT_ERROR_SENTINEL } from './types';

jest.mock('./script', () => ({ runScript: jest.fn() }));
// Mocked ONLY so the "it is never called" assertion has something to watch.
jest.mock('./shell', () => ({ runShell: jest.fn() }));
// The polling itself is `fsProbe`'s own tested behaviour; stubbing it here keeps
// this suite about the removal and the refusals instead of about 9s of timers.
jest.mock('./fsProbe', () => ({ waitForPkgRemoved: jest.fn() }));

const mockScript = runScript as jest.MockedFunction<typeof runScript>;
const mockShell = runShell as jest.MockedFunction<typeof runShell>;
const mockRemoved = waitForPkgRemoved as jest.MockedFunction<typeof waitForPkgRemoved>;

beforeEach(() => {
    jest.clearAllMocks();
    mockScript.mockResolvedValue({ ok: true, log: '' });
    // The directory is gone by the time the probe looks.
    mockRemoved.mockResolvedValue(true);
});

const NOTHING_KNOWN: ReadonlySet<string> = new Set<string>();

/** The name from the bug report: what macOS calls a second copy of a download. */
const DUPLICATE_DIR = 'neo-pkg-replication-1.0.6 2';

describe('checkStrayRemoval — what is allowed', () => {
    test.each([
        ['an ordinary directory', 'neo-pkg-foo-main'],
        ['a versioned directory', 'neo-pkg-replication-1.0.5'],
        // THE REGRESSION. This is the name the user could not remove.
        ["macOS's duplicate suffix", DUPLICATE_DIR],
        ['several spaces', 'my copy of neo pkg'],
        ['unicode', '패키지-사본 2'],
        ['a bracketed copy', 'neo-pkg-foo (1)'],
        ['a single dot inside', 'neo.pkg.foo'],
        ['a leading dot', '.neo-pkg-foo-main'],
        ['a leading dash', '-neo-pkg-foo'],
    ])('%s is allowed', (_label, dir) => {
        expect(checkStrayRemoval(dir, NOTHING_KNOWN)).toBeNull();
    });
});

describe('checkStrayRemoval — the refusals', () => {
    // THE ONE THAT PROTECTS AN INSTALL. Removing a known package this way would
    // delete it WITHOUT running its uninstall script.
    test('a name the catalog knows is refused', () => {
        expect(checkStrayRemoval('neo-pkg-foo', new Set(['neo-pkg-foo']))).toBe('known_package_directory');
    });

    // …and it is refused even now that the name itself is perfectly legal.
    test('a known package with a space in its name is still refused', () => {
        expect(checkStrayRemoval(DUPLICATE_DIR, new Set([DUPLICATE_DIR]))).toBe('known_package_directory');
    });

    // WHAT IS LEFT IS PATH SAFETY AND NOTHING ELSE: these name a different
    // directory than the card shows, which no transport can make safe.
    test.each([
        ['a traversal', '../../etc'],
        ['a bare dot-dot', '..'],
        ['a bare dot', '.'],
        ['a dot-dot inside', 'neo-pkg..foo'],
        ['a separator', 'neo-pkg-foo/bin'],
        ['a backslash', 'neo-pkg-foo\\bin'],
        ['an encoded separator', 'neo-pkg%2Ffoo'],
        ['an encoded backslash', 'neo-pkg%5Cfoo'],
        ['an encoded traversal', 'neo%2E%2Efoo'],
        ['a half-encoded traversal', 'neo.%2Efoo'],
        ['an absolute path', '/work/public'],
        ['empty', ''],
        ['whitespace only', '   '],
    ])('%s is refused', (_label, dir) => {
        expect(checkStrayRemoval(dir, NOTHING_KNOWN)).toBe('unsafe_directory_name');
    });
});

describe('runStrayRemove — how the removal travels', () => {
    // THE ANTI-REGRESSION ASSERTION. A shell command built from a directory name
    // is what split `neo-pkg-replication-1.0.6 2` into two arguments.
    test('no shell command is ever run', async () => {
        await runStrayRemove(DUPLICATE_DIR, NOTHING_KNOWN);

        expect(mockShell).not.toHaveBeenCalled();
        expect(mockScript).toHaveBeenCalledTimes(1);
    });

    test('the directory name rides in $.params, never in the script body', async () => {
        await runStrayRemove(DUPLICATE_DIR, NOTHING_KNOWN);

        const [body, params] = mockScript.mock.calls[0];
        expect(params).toEqual({ dir: DUPLICATE_DIR });
        // The body is a constant: it is the same source for every directory.
        expect(body).toBe(STRAY_REMOVE_SCRIPT);
        expect(body).not.toContain(DUPLICATE_DIR);
        expect(body).not.toContain('neo-pkg');
    });

    // The root is decided by the SCRIPT, not by the caller — a root that arrived
    // as a parameter would let the browser pick the directory to delete from.
    test('the root is a literal inside the script, and the client sends no path', async () => {
        await runStrayRemove('neo-pkg-foo-main', NOTHING_KNOWN);

        expect(STRAY_REMOVE_ROOT).toBe('/work/public/');
        expect(STRAY_REMOVE_SCRIPT).toContain('"/work/public/"');
        expect(mockScript.mock.calls[0][1]).toEqual({ dir: 'neo-pkg-foo-main' });
        // …and the probe watches that same DIRECTORY name.
        expect(mockRemoved).toHaveBeenCalledWith('neo-pkg-foo-main');
    });

    // NO PACKAGE SCRIPT RUNS. `scripts.install` never ran for this tree, so an
    // uninstall script would be undoing something that was never done — possibly
    // against the REAL installed copy of the same package.
    test('exactly one server call is made', async () => {
        const res = await runStrayRemove('neo-pkg-foo-main', NOTHING_KNOWN);

        expect(mockScript).toHaveBeenCalledTimes(1);
        expect(res.ok).toBe(true);
    });

    test.each([
        ['a traversal', '../../etc', NOTHING_KNOWN],
        ['a known package', 'neo-pkg-foo', new Set(['neo-pkg-foo'])],
    ])('%s never reaches the server', async (_label, dir, known) => {
        const res = await runStrayRemove(dir as string, known as ReadonlySet<string>);

        expect(mockScript).not.toHaveBeenCalled();
        expect(mockShell).not.toHaveBeenCalled();
        expect(res.ok).toBe(false);
    });

    test('a failing script is reported, not swallowed', async () => {
        mockScript.mockResolvedValue({ ok: false, log: 'boom', reason: 'permission denied' });

        const res = await runStrayRemove('neo-pkg-foo-main', NOTHING_KNOWN);

        expect(res).toMatchObject({ ok: false, reason: 'permission denied' });
        expect(mockRemoved).not.toHaveBeenCalled();
    });

    // TQL can return before /api/files reflects the removal, and the caller
    // rebuilds the catalog off that api — "success" against a stale listing would
    // leave the card on screen and read as "the button did nothing".
    test('a directory that is still there afterwards is a failure', async () => {
        mockRemoved.mockResolvedValue(false);

        const res = await runStrayRemove('neo-pkg-foo-main', NOTHING_KNOWN);

        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toContain('/public/neo-pkg-foo-main/');
    });
});

// ---------------------------------------------------------------------------
// STRAY_REMOVE_SCRIPT executed for real, against a faked server runtime.
// ---------------------------------------------------------------------------
// The same technique the extract-script suite uses: the source is run with
// `new Function('require', '$', …)` over a faked `fs`. It is the only way to show
// the thing the bug was about — that ONE directory is removed and the one next to
// it is untouched — and the only way to prove the script's own guards, which are
// what actually stands between a parameter and `rmSync`.

interface RemoveRun {
    /** Paths `rmSync` was called with, in order. */
    removed: string[];
    /** What is still under /work/public/ when the script ends. */
    remaining: string[];
    yields: string[];
    thrown?: Error;
}

const execRemoveScript = (dirParam: string, tree: string[] = ['has space 2', 'keep']): RemoveRun => {
    const dirs = new Set(tree.map((d) => `/work/public/${d}`));
    const removed: string[] = [];
    const yields: string[] = [];

    const fsMock = {
        rmSync: (p: string, options?: { recursive?: boolean; force?: boolean }) => {
            // `force` is what makes an already-gone directory a success; without
            // `recursive` a populated package directory would not go at all.
            expect(options).toEqual({ recursive: true, force: true });
            removed.push(p);
            for (const d of [...dirs]) if (d === p || d.startsWith(`${p}/`)) dirs.delete(d);
        },
    };

    const $ = { params: { dir: dirParam }, yield: (row: string) => yields.push(row) };

    let thrown: Error | undefined;
    try {
        // eslint-disable-next-line no-new-func
        new Function('require', '$', STRAY_REMOVE_SCRIPT)((id: string) => (id === 'fs' ? fsMock : {}), $);
    } catch (e) {
        thrown = e as Error;
    }
    return { removed, remaining: [...dirs].map((d) => d.slice('/work/public/'.length)), yields, thrown };
};

describe('STRAY_REMOVE_SCRIPT — what the server actually does', () => {
    // THE BUG, END TO END. `rm -rf /work/public/has space 2` meant TWO paths;
    // `fs.rmSync(REMOVE_ROOT + dir, …)` means one, whatever is in the name.
    test('a name with a space removes exactly that directory and no neighbour', () => {
        const run = execRemoveScript('has space 2');

        expect(run.thrown).toBeUndefined();
        expect(run.removed).toEqual(['/work/public/has space 2']);
        expect(run.remaining).toEqual(['keep']);
    });

    test('the path is joined from the root literal, not sent by the client', () => {
        const run = execRemoveScript('neo-pkg-foo-main', ['neo-pkg-foo-main']);

        expect(run.removed).toEqual(['/work/public/neo-pkg-foo-main']);
    });

    // It yields before it deletes AND after: `runScript` reads rows, and a script
    // that never yields is reported as "produced no output".
    test('it yields on the way in and on the way out', () => {
        const run = execRemoveScript('has space 2');

        expect(run.yields.length).toBeGreaterThanOrEqual(2);
        expect(run.yields[0]).toContain('/work/public/has space 2');
        expect(run.yields.some((row) => row.startsWith(SCRIPT_ERROR_SENTINEL))).toBe(false);
    });

    // THE SERVER-SIDE HALF OF THE GUARD. The client check is a UI courtesy; this
    // one is what a hand-made request meets.
    test.each([
        ['a separator', 'foo/bar'],
        ['a backslash', 'foo\\bar'],
        ['a traversal', '../evil'],
        ['a bare dot-dot', '..'],
        ['a bare dot', '.'],
        ['nothing at all', ''],
    ])('%s deletes nothing and reports why', (_label, dir) => {
        const run = execRemoveScript(dir);

        expect(run.removed).toEqual([]);
        expect(run.remaining).toEqual(['has space 2', 'keep']);
        // The reason leaves as a sentinel ROW; the throw only stops the script.
        expect(run.yields.some((row) => row.startsWith(SCRIPT_ERROR_SENTINEL))).toBe(true);
        expect(run.thrown).toBeInstanceOf(Error);
    });

    // A failed delete must report the reason rather than come back as a silent
    // success (TQL answers success=true for a script that threw).
    test('an fs failure leaves as a sentinel row', () => {
        const yields: string[] = [];
        const fsMock = {
            rmSync: () => {
                throw new Error('permission denied');
            },
        };
        const $ = { params: { dir: 'has space 2' }, yield: (row: string) => yields.push(row) };

        expect(() => {
            // eslint-disable-next-line no-new-func
            new Function('require', '$', STRAY_REMOVE_SCRIPT)((id: string) => (id === 'fs' ? fsMock : {}), $);
        }).toThrow(/permission denied/);
        expect(yields.some((row) => row.startsWith(SCRIPT_ERROR_SENTINEL) && row.includes('permission denied'))).toBe(true);
    });
});

describe('strayDisplayPath', () => {
    // The browser's spelling, which is what the user sees in the file explorer —
    // the server-side script spells the same place /work/public/.
    test('is the path the user can go and look at', () => {
        expect(strayDisplayPath('neo-pkg-foo-main')).toBe('/public/neo-pkg-foo-main/');
        expect(strayDisplayPath(DUPLICATE_DIR)).toBe('/public/neo-pkg-replication-1.0.6 2/');
    });
});
