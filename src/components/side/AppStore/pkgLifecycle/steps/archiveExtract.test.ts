// issue #1452 — offline install step.
//
// WHAT A REAL ARCHIVE LOOKS LIKE — the reason the structural gate changed.
// Measured on machbase-neo v8.5.10-snapshot, `/public/neo-pkg-dbus.zip`:
//
//   root entry        neo-pkg-dbus-main   ← {repo}-{branch}, NOT the package name
//   onprem.json       absent (no archive has ever carried one)
//   root package.json { "name": "neo-pkg-dbus", "version": "1.0.0", … }
//
// These are GitHub source zips and will keep being. The old gate demanded the
// root directory be named after the package and an `onprem.json` be present with
// a version matching package.json — it rejected 100% of real archives. The gate
// now checks: exactly one root entry (name unexamined), a ROOT package.json, and
// `package.json.name === ctx.appName`. The script source is executed below
// against a faked `fs`, because that gate is the whole value of this step.

import { stepArchiveExtract, ARCHIVE_STAGING_PREFIX, EXTRACT_SCRIPT } from './archiveExtract';
import { ARCHIVE_SCRIPT_PRELUDE } from '../archiveScript';
import { runScript } from '../script';
import { waitForPkgInstalled, ARCHIVE_PROBE_ATTEMPTS, ARCHIVE_PROBE_DELAY_MS } from '../fsProbe';
import {
    asArrayBuffer,
    binaryEntry,
    createArchiveRuntimeFake,
    entriesFor,
    entryBytes,
    entryText,
    type ArchiveFormat,
    type FakeArchive,
    type FakeTree,
} from '../archiveRuntimeFake';
import type { LifecycleContext } from '../types';

jest.mock('../script', () => ({ runScript: jest.fn() }));
jest.mock('../fsProbe', () => ({
    ...jest.requireActual('../fsProbe'),
    waitForPkgInstalled: jest.fn(),
}));

const mockRunScript = runScript as jest.MockedFunction<typeof runScript>;
const mockWait = waitForPkgInstalled as jest.MockedFunction<typeof waitForPkgInstalled>;

const makeCtx = (over: Partial<LifecycleContext> = {}): LifecycleContext => ({
    appName: 'pkg-a',
    fullName: 'machbase/pkg-a',
    source: 'local',
    // THE VERSION, and the only thing the browser says about which file to use.
    tag: '1.2.3',
    logs: [],
    ...over,
});

// ---------------------------------------------------------------------------
// EXTRACT_SCRIPT executed for real, against a faked server runtime.
// ---------------------------------------------------------------------------

interface ExtractRun {
    yields: string[];
    /** `rm <path>` / `rename <from> -> <to>` / `copy <from> -> <to>`, in order. */
    calls: string[];
    /** Every directory the script created, in order. */
    mkdirs: string[];
    /** Absolute path → UTF-8 reading of the body, for every file written. */
    written: Map<string, string>;
    /**
     * The same files as RAW BYTES — the only view that can tell a byte-exact
     * write from a text round trip, because a decoded string has already lost
     * whatever was not valid UTF-8.
     */
    writtenBytes: Map<string, Uint8Array>;
    /**
     * The destination tree AS IT STANDS WHEN THE SCRIPT ENDS, keyed relative to
     * dest — including files that were already there. This is what the
     * config-preservation and the "a failed archive changes nothing" tests read.
     *
     * NOTE the install path ends in `renameSync`, which the fake only RECORDS
     * (it does not move the tree), so this map stays empty there by design; the
     * install assertions are about the rename call itself.
     */
    dest: Map<string, string>;
    /** …and its byte-exact twin, for the binary-fidelity assertions. */
    destBytes: Map<string, Uint8Array>;
    /**
     * Every `fs.copyFileSync` the script made. MUST STAY EMPTY: the fake offers
     * the function (the real runtime does too) precisely so a regression that
     * reaches for it is caught here rather than on a user's broken icon.
     */
    copyFileSyncCalls: string[];
}

interface ExtractOptions {
    /** Update semantics — what `stepArchiveExtract(ctx, { force: true })` sends. */
    force?: boolean;
    /** What ALREADY lives at dest, keyed relative to it (the previous install). */
    destFiles?: Record<string, string>;
    /** Directories that already live at dest, relative (e.g. an empty `logs`). */
    destDirs?: string[];
}

/** The archive directory the script has hard-coded. Stated independently here. */
const ARCHIVE_WORK_DIR = '/work/public/';

const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);

/**
 * Run the real EXTRACT_SCRIPT source with a faked `fs` and a faked archive
 * runtime (`archiveRuntimeFake.ts` — the SAME kit the catalog-scan suite drives).
 *
 * `archives` maps ARCHIVE FILE NAME → its members; the extension picks the
 * container, so one scenario runs in all four formats by renaming the key. The
 * fake insists on the real pipeline — a `.tar.gz` read without
 * `zlib.gunzipSync` throws, a tar opened with `zip.Zip` throws.
 *
 * BOTH READS COME FROM THE SAME FIXTURE, which is what makes "the lookup and the
 * extraction see one archive" testable. `entriesOnReread` is the deliberate
 * exception: it models the file being replaced between the two reads, the only
 * way to reach the structural gate now that both halves parse the same manifest.
 *
 * Never throws: the abort (if any) comes back in `thrown` together with the
 * filesystem state it left behind, which is what the "a broken archive must not
 * touch the installed tree" tests assert on. `runExtractScript` /
 * `runExtractFailure` below are the two ways to read that pair.
 */
const execExtractScript = (
    params: { name: string; version?: string; staging?: string; dest?: string },
    archives: Record<string, FakeArchive>,
    opts: ExtractOptions = {}
): { run: ExtractRun; thrown: unknown } => {
    const staging = params.staging ?? `${ARCHIVE_STAGING_PREFIX}${params.name}`;
    const dest = params.dest ?? `/work/public/${params.name}`;
    const version = params.version ?? '1.0.0';

    const runtime = createArchiveRuntimeFake(archives);

    // THE FAKE DISK STORES BYTES, NOT STRINGS. It used to store the decoded text
    // of every write, which quietly made the fake itself lossy: a member holding
    // 0x89 came back as U+FFFD no matter how correctly the script had written it,
    // so a byte-exact writer and a text round trip were indistinguishable here —
    // which is how the copyFileSync corruption shipped past a green suite.
    const dirs = new Set<string>([ARCHIVE_WORK_DIR.replace(/\/$/, '')]);
    const files = new Map<string, Uint8Array>();
    const toBytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));
    const toUtf8 = (bytes: Uint8Array) => Buffer.from(bytes).toString('utf8');
    for (const fileName of Object.keys(archives)) files.set(`${ARCHIVE_WORK_DIR}${fileName}`, toBytes('ARCHIVE BYTES'));
    const yields: string[] = [];
    const calls: string[] = [];
    const copyFileSyncCalls: string[] = [];
    const mkdirs: string[] = [];
    const written = new Map<string, string>();
    const writtenBytes = new Map<string, Uint8Array>();

    const removeTree = (p: string) => {
        for (const d of [...dirs]) if (d === p || d.startsWith(`${p}/`)) dirs.delete(d);
        for (const f of [...files.keys()]) if (f === p || f.startsWith(`${p}/`)) files.delete(f);
    };

    /** `mkdir -p`: register the path and every ancestor of it. */
    const addDirRecursive = (p: string) => {
        const parts = p.split('/');
        for (let i = 2; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
    };

    // THE PREVIOUS INSTALL. Seeded before the script runs so the update path has
    // something to preserve (or destroy).
    for (const d of opts.destDirs ?? []) addDirRecursive(`${dest}/${d}`);
    for (const [rel, body] of Object.entries(opts.destFiles ?? {})) {
        const full = `${dest}/${rel}`;
        addDirRecursive(full.slice(0, full.lastIndexOf('/')));
        files.set(full, toBytes(body));
    }

    const fsMock = {
        existsSync: (p: string) => dirs.has(p) || files.has(p),
        readdirSync: (p: string) => {
            // ARCHIVE_DIR carries a trailing slash, staging does not.
            const prefix = p.endsWith('/') ? p : `${p}/`;
            const names = new Set<string>();
            for (const entry of [...dirs, ...files.keys()]) {
                if (!entry.startsWith(prefix)) continue;
                names.add(entry.slice(prefix.length).split('/')[0]);
            }
            // `.` and `..` are REAL entries in this runtime.
            return ['.', '..', ...names];
        },
        statSync: (p: string) => {
            if (!dirs.has(p) && !files.has(p)) throw new Error(`ENOENT: ${p}`);
            // `isDirectory` is a FUNCTION here, not a boolean.
            return { isDirectory: () => dirs.has(p) };
        },
        readFileSync: (p: string, enc?: string) => {
            // 'buffer' on an archive = the opaque container bytes; 'buffer' on
            // anything else = a staged file being copied to dest, handed back as
            // an ArrayBuffer of the EXACT stored bytes, like the real thing;
            // 'utf8' = the staged package.json, decoded.
            if (enc === 'buffer') {
                if (runtime.has(baseName(p))) return runtime.readBytes(p);
                const bytes = files.get(p);
                if (bytes === undefined) throw new Error(`ENOENT: ${p}`);
                const ab = new ArrayBuffer(bytes.length);
                new Uint8Array(ab).set(bytes);
                return ab;
            }
            const body = files.get(p);
            if (body === undefined) throw new Error(`ENOENT: ${p}`);
            return toUtf8(body);
        },
        mkdirSync: (p: string, options?: { recursive?: boolean }) => {
            expect(options).toEqual({ recursive: true });
            mkdirs.push(p);
            addDirRecursive(p);
        },
        writeFileSync: (p: string, data: unknown, enc?: string) => {
            // The payload is an ArrayBuffer for zip AND tar alike, and it is
            // stored as bytes: this write is the one place the script could lose
            // them, so the fake must not lose them on its behalf.
            expect(enc).toBe('buffer');
            if (!dirs.has(p.slice(0, p.lastIndexOf('/')))) throw new Error(`ENOENT: no directory for ${p}`);
            const bytes = entryBytes(data);
            files.set(p, bytes);
            written.set(p, entryText(data));
            writtenBytes.set(p, bytes);
        },
        rmSync: (p: string) => {
            calls.push(`rm ${p}`);
            removeTree(p);
        },
        renameSync: (from: string, to: string) => {
            calls.push(`rename ${from} -> ${to}`);
        },
        // OFFERED ON PURPOSE, AND MUST NEVER BE CALLED. This runtime's /lib/fs.js
        // really does export it, so `typeof fs.copyFileSync === "function"` is
        // true on the server — and it moves the file through TEXT, replacing
        // every non-UTF-8 byte with U+FFFD (measured: a 45,507-byte icon.png
        // arrived as 80,949 bytes of broken image). The fake copies losslessly,
        // so no assertion on the CONTENT could catch a regression here; the
        // assertion that can is `copyFileSyncCalls` staying empty.
        copyFileSync: (from: string, to: string) => {
            const body = files.get(from);
            if (body === undefined) throw new Error(`ENOENT: ${from}`);
            if (!dirs.has(to.slice(0, to.lastIndexOf('/')))) throw new Error(`ENOENT: no directory for ${to}`);
            calls.push(`copy ${from} -> ${to}`);
            copyFileSyncCalls.push(`copy ${from} -> ${to}`);
            files.set(to, body);
        },
    };

    const requireMock = (id: string) =>
        id === 'fs' ? fsMock : id === 'archive/zip' ? runtime.zipModule : id === 'archive/tar' ? runtime.tarModule : id === 'zlib' ? runtime.zlibModule : {};
    const scriptParams: Record<string, string> = { name: params.name, version, staging, dest };
    // The step only sends `force` on the update path — mirrored here, so a script
    // that read the flag the wrong way round could not pass by accident.
    if (opts.force) scriptParams.force = '1';
    const $ = { params: scriptParams, yield: (row: string) => yields.push(row) };

    let thrown: unknown;
    try {
        // eslint-disable-next-line no-new-func
        new Function('require', '$', EXTRACT_SCRIPT)(requireMock, $);
    } catch (e) {
        thrown = e;
    }

    const destTree = new Map<string, string>();
    const destTreeBytes = new Map<string, Uint8Array>();
    for (const [p, body] of files) {
        if (!p.startsWith(`${dest}/`)) continue;
        destTree.set(p.slice(dest.length + 1), toUtf8(body));
        destTreeBytes.set(p.slice(dest.length + 1), body);
    }

    return { run: { yields, calls, mkdirs, written, writtenBytes, dest: destTree, destBytes: destTreeBytes, copyFileSyncCalls }, thrown };
};

/**
 * Run the script and let an abort surface as a throw — what a TQL script failure
 * is on the server (`runScript` turns it into `{ ok: false, reason }`).
 */
const runExtractScript = (
    params: { name: string; version?: string; staging?: string; dest?: string },
    archives: Record<string, FakeArchive>,
    opts: ExtractOptions = {}
): ExtractRun => {
    const { run, thrown } = execExtractScript(params, archives, opts);
    if (thrown !== undefined) throw thrown;
    return run;
};

/** Same run, but for the abort cases: the state left behind IS the assertion. */
const runExtractFailure = (
    params: { name: string; version?: string; staging?: string; dest?: string },
    archives: Record<string, FakeArchive>,
    opts: ExtractOptions = {}
): { message: string; run: ExtractRun } => {
    const { run, thrown } = execExtractScript(params, archives, opts);
    if (thrown === undefined) throw new Error('expected the extract script to abort, but it succeeded');
    return { message: (thrown as Error).message ?? String(thrown), run };
};

/** The real neo-pkg-dbus tree: root is `{repo}-{branch}`, three package.json. */
const dbusTree = (over: Record<string, unknown> = {}): FakeTree => ({
    dirs: ['neo-pkg-dbus-main/cgi-bin', 'neo-pkg-dbus-main/frontend'],
    files: {
        'neo-pkg-dbus-main/package.json': JSON.stringify({
            name: 'neo-pkg-dbus',
            version: '1.0.0',
            description: 'CGI and jobs service for neo-pkg-dbus',
            minServerVersion: '8.5.6',
            ...over,
        }),
        'neo-pkg-dbus-main/README.md': '# dbus',
        'neo-pkg-dbus-main/cgi-bin/package.json': JSON.stringify({ name: 'dbus-cgi', version: '9.9.9' }),
        'neo-pkg-dbus-main/frontend/package.json': JSON.stringify({ name: 'dbus-frontend', version: '0.0.1' }),
    },
});

/** The one-archive case, keyed by the real file name. */
const dbusArchives = (over: Record<string, unknown> = {}): Record<string, FakeArchive> => ({
    'neo-pkg-dbus.zip': { entries: entriesFor('zip', dbusTree(over)) },
});

/** A minimal tree whose root package.json says exactly `name`@`version`. */
const pkgTree = (root: string, name: string, version: string): FakeTree => ({
    files: { [`${root}/package.json`]: JSON.stringify({ name, version }) },
});

/** …as an archive, in `format` (zip unless stated — most cases are format-blind). */
const pkgArchive = (root: string, name: string, version: string, format: ArchiveFormat = 'zip'): FakeArchive => ({
    entries: entriesFor(format, pkgTree(root, name, version)),
});

/**
 * A REAL BINARY MEMBER: the PNG magic number, then bytes no UTF-8 decoder
 * accepts (FF FE 80 C0).
 *
 * THE REASON THE CORRUPTION SHIPPED GREEN: every fixture in this suite used to
 * be ASCII, and below 0x80 a text round trip and a byte-for-byte copy produce
 * the same file. With 0x89 in it they do not — `fs.copyFileSync` turned exactly
 * these 12 bytes into 22 (89 → EF BF BD, U+FFFD) on machbase-neo
 * v8.5.10-snapshot, which is how /public/neo-pkg-opcua-client/icon.png grew from
 * 45,507 to 80,949 bytes and stopped rendering. Any new test that writes package
 * content should use bytes, not a string.
 */
const BINARY_MEMBER_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x80, 0xc0];

/** Length AND every byte — a truncating or expanding writer must fail here. */
const expectExactBytes = (actual: Uint8Array | undefined, expected: number[]) => {
    expect(actual).toBeDefined();
    expect(actual as Uint8Array).toHaveLength(expected.length);
    expect([...(actual as Uint8Array)]).toEqual(expected);
};

describe('EXTRACT_SCRIPT — finding the archive', () => {
    // THE POINT OF THE REWRITE: the browser sends { name, version }; the server
    // scans the same directory the catalog scanned and matches the same way.
    test('the zip is found by package.json name+version, and the file name never matters', () => {
        const { yields, calls } = runExtractScript(
            { name: 'neo-pkg-replication', version: '1.0.4' },
            {
                // A REAL FILE ON A REAL SERVER: named 1.0.5, contains 1.0.4.
                'neo-pkg-replication-1.0.5.zip': pkgArchive('neo-pkg-replication-main', 'neo-pkg-replication', '1.0.4'),
                'neo-pkg-dbus.zip': { entries: entriesFor('zip', dbusTree()) },
            }
        );

        expect(yields).toContain('using neo-pkg-replication-1.0.5.zip for neo-pkg-replication 1.0.4');
        expect(yields).toContain('verified neo-pkg-replication@1.0.4');
        expect(calls).toContain(
            `rename ${ARCHIVE_STAGING_PREFIX}neo-pkg-replication/neo-pkg-replication-main -> /work/public/neo-pkg-replication`
        );
    });

    test('asking for the version printed on the file name (1.0.5) finds nothing', () => {
        expect(() =>
            runExtractScript(
                { name: 'neo-pkg-replication', version: '1.0.5' },
                { 'neo-pkg-replication-1.0.5.zip': pkgArchive('neo-pkg-replication-main', 'neo-pkg-replication', '1.0.4') }
            )
        ).toThrow('no archive for neo-pkg-replication 1.0.5');
    });

    test('no archive at all for that name+version aborts before touching staging', () => {
        const run = () => runExtractScript({ name: 'neo-pkg-dbus', version: '9.9.9' }, dbusArchives());
        expect(run).toThrow('no archive for neo-pkg-dbus 9.9.9');
    });

    test('an empty archive directory aborts the same way', () => {
        expect(() => runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, {})).toThrow('no archive for neo-pkg-dbus 1.0.0');
    });

    // Two files claiming the same package at the same version: the server cannot
    // know which one the user meant, and a coin flip is worse than a failure that
    // names both files.
    test('two archives claiming the same name+version abort, naming both files', () => {
        const run = () =>
            runExtractScript(
                { name: 'neo-pkg-replication', version: '1.0.4' },
                {
                    'neo-pkg-replication-1.0.5.zip': pkgArchive('neo-pkg-replication-main', 'neo-pkg-replication', '1.0.4'),
                    'neo-pkg-replication.zip': pkgArchive('neo-pkg-replication-1.0.4', 'neo-pkg-replication', '1.0.4'),
                }
            );

        expect(run).toThrow('duplicate archives for neo-pkg-replication 1.0.4');
        expect(run).toThrow('neo-pkg-replication-1.0.5.zip');
        expect(run).toThrow('neo-pkg-replication.zip');
    });

    test('nothing is extracted or renamed when the lookup fails', () => {
        let calls: string[] = [];
        try {
            ({ calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '9.9.9' }, dbusArchives()));
        } catch {
            /* expected */
        }
        expect(calls.some((c) => c.startsWith('rename '))).toBe(false);
    });

    test('the same package at another version picks the other file', () => {
        const archives = {
            'a.zip': pkgArchive('pkg-a-1.0.0', 'pkg-a', '1.0.0'),
            'b.zip': pkgArchive('pkg-a-2.0.0', 'pkg-a', '2.0.0'),
        };

        expect(runExtractScript({ name: 'pkg-a', version: '2.0.0' }, archives).yields).toContain('using b.zip for pkg-a 2.0.0');
        expect(runExtractScript({ name: 'pkg-a', version: '1.0.0' }, archives).yields).toContain('using a.zip for pkg-a 1.0.0');
    });

    test('no archive PATH is accepted from the caller any more', () => {
        expect(EXTRACT_SCRIPT).not.toContain('param("archive")');
        expect(EXTRACT_SCRIPT).toContain('param("name")');
        expect(EXTRACT_SCRIPT).toContain('param("version")');
        // The directory is the script's own literal, shared with the catalog scan.
        expect(EXTRACT_SCRIPT).toContain(`var ARCHIVE_DIR = "${ARCHIVE_WORK_DIR}";`);
    });
});

describe('EXTRACT_SCRIPT — the server-side half, run for real', () => {
    // THE FIX: `neo-pkg-dbus-main` is the root, `neo-pkg-dbus` is the package.
    // The previous `roots[0] !== appName` check failed here, i.e. on every real
    // archive. Do not put the directory-name comparison back.
    test('a root directory named {repo}-{branch} installs fine', () => {
        const { yields, calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives());

        expect(yields).toContain('verified neo-pkg-dbus@1.0.0');
        expect(yields).toContain('installed /work/public/neo-pkg-dbus');
        // {staging}/{root} → /work/public/{package.json name}
        expect(calls).toContain(`rename ${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus/neo-pkg-dbus-main -> /work/public/neo-pkg-dbus`);
    });

    test('the nested cgi-bin / frontend package.json are not consulted', () => {
        const { yields } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives());

        // 9.9.9 / 0.0.1 belong to the sub-projects; only the root version shows.
        expect(yields.join('\n')).toContain('@1.0.0');
        expect(yields.join('\n')).not.toContain('9.9.9');
    });

    // THE BUG THIS SPLIT EXISTS FOR. The script used to `rm -rf dest` before the
    // rename, in BOTH modes, which wiped every file the archive does not carry —
    // conf/, logs/, data/ — on a real server, on every local update.
    test('the destination is NEVER removed, in either mode', () => {
        expect(EXTRACT_SCRIPT).not.toContain('fs.rmSync(dest');

        const update = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives(), {
            force: true,
            destFiles: { 'conf/collector.json': 'KEEP ME' },
        });
        expect(update.calls.filter((c) => c.startsWith('rm /work/public/'))).toEqual([]);
        expect(update.dest.get('conf/collector.json')).toBe('KEEP ME');
    });

    // THE BINARY-CORRUPTION BUG. `fs.copyFileSync` exists in this runtime and
    // moves the file through TEXT: 89 50 4E 47 … came back as EF BF BD 50 4E 47 …,
    // 12 bytes in, 22 bytes out, byte-identical to a readFileSync(utf8) →
    // writeFileSync(utf8) round trip. The merge must copy with read+write
    // ("buffer") ONLY — see the byte-fidelity tests in the format matrix below.
    test('the merge copies with read+write and NEVER calls copyFileSync', () => {
        const { dest, calls, copyFileSyncCalls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives(), {
            force: true,
            destFiles: { 'conf/collector.json': 'KEEP ME' },
        });

        // The fake OFFERS copyFileSync, exactly like the server does.
        expect(copyFileSyncCalls).toEqual([]);
        expect(calls.some((c) => c.startsWith('copy '))).toBe(false);
        expect(dest.get('conf/collector.json')).toBe('KEEP ME');
        expect(dest.get('README.md')).toBe('# dbus');
        expect(JSON.parse(dest.get('package.json') as string)).toMatchObject({ name: 'neo-pkg-dbus', version: '1.0.0' });
    });

    test('the script source does not reach for copyFileSync at all', () => {
        expect(EXTRACT_SCRIPT).not.toContain('fs.copyFileSync(');
        expect(EXTRACT_SCRIPT).not.toContain('typeof fs.copyFileSync');
        // The one write shape allowed for a package member.
        expect(EXTRACT_SCRIPT).toContain('fs.writeFileSync(to, fs.readFileSync(from, "buffer"), "buffer");');
    });

    // Install is offered only for a package that is not installed, so a populated
    // dest means the caller confused the two operations — and deciding silently
    // is how the deletion bug shipped.
    test('install (no force) refuses an existing destination and changes nothing', () => {
        const { message, run } = runExtractFailure({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives(), {
            destFiles: { 'conf/collector.json': 'KEEP ME' },
        });

        expect(message).toContain('destination already exists: /work/public/neo-pkg-dbus');
        expect(run.dest.get('conf/collector.json')).toBe('KEEP ME');
        expect(run.calls.some((c) => c.startsWith('rename ') || c.startsWith('copy ') || c.startsWith('rm /work/public/'))).toBe(false);
    });

    // THE STRUCTURAL GATE still runs after the lookup, and these fixtures are how
    // it can be reached: the archive advertises one thing to the lookup and
    // unpacks another, i.e. the file changed underneath the catalog. That is
    // precisely what the gate is for.
    const advertisedAsDbus = (extracts: FakeTree): Record<string, FakeArchive> => ({
        'neo-pkg-dbus.zip': { ...pkgArchive('neo-pkg-dbus-main', 'neo-pkg-dbus', '1.0.0'), entriesOnReread: entriesFor('zip', extracts) },
    });

    test('package.json.name !== the requested name aborts before anything reaches /work/public', () => {
        expect(() =>
            runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, advertisedAsDbus(pkgTree('root', 'neo-pkg-other', '1.0.0')))
        ).toThrow("archive holds 'neo-pkg-other', expected 'neo-pkg-dbus'");
    });

    test('a root package.json with no name aborts', () => {
        expect(() =>
            runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, advertisedAsDbus({ files: { 'root/package.json': JSON.stringify({ version: '1.0.0' }) } }))
        ).toThrow('archive package.json has no name');
    });

    test('two root entries abort — the archive is not one package', () => {
        expect(() =>
            runExtractScript(
                { name: 'neo-pkg-dbus', version: '1.0.0' },
                advertisedAsDbus({ files: { 'a/package.json': JSON.stringify({ name: 'neo-pkg-dbus' }), 'b/README.md': 'x' } })
            )
        ).toThrow('archive must contain exactly one root entry, found 2');
    });

    test('a missing ROOT package.json aborts even when a nested one exists', () => {
        expect(() =>
            runExtractScript(
                { name: 'neo-pkg-dbus', version: '1.0.0' },
                advertisedAsDbus({ files: { 'neo-pkg-dbus-main/cgi-bin/package.json': JSON.stringify({ name: 'neo-pkg-dbus' }) } })
            )
        ).toThrow('archive is missing package.json');
    });

    test('a root entry that is a plain file aborts', () => {
        expect(() => runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, advertisedAsDbus({ files: { 'loose.txt': 'x' } }))).toThrow(
            "archive root 'loose.txt' is not a directory"
        );
    });

    // The traversal guard on the EXTRACTION side specifically: the archive was
    // clean when the catalog read it and grew an escaping member before the
    // install. Nothing is written, and staging is purged.
    test('a member that escapes staging on the second read aborts the extraction', () => {
        expect(() =>
            runExtractScript(
                { name: 'neo-pkg-dbus', version: '1.0.0' },
                {
                    'neo-pkg-dbus.zip': {
                        ...pkgArchive('neo-pkg-dbus-main', 'neo-pkg-dbus', '1.0.0'),
                        entriesOnReread: [
                            ...entriesFor('zip', pkgTree('neo-pkg-dbus-main', 'neo-pkg-dbus', '1.0.0')),
                            { name: '../evil.js', data: asArrayBuffer('pwned'), isDir: false },
                        ],
                    },
                }
            )
        ).toThrow('cannot read neo-pkg-dbus.zip: archive entry escapes its directory: ../evil.js');
    });

    test('onprem.json is neither read nor required anywhere in the script', () => {
        expect(EXTRACT_SCRIPT).not.toContain('onprem');
        // …and the root DIRECTORY name must never be compared to the app name.
        expect(EXTRACT_SCRIPT).not.toContain('roots[0] !== appName');
    });
});

// ---------------------------------------------------------------------------
// THE SAME INSTALL, IN ALL FOUR CONTAINERS
// ---------------------------------------------------------------------------
// The formats diverge ONLY inside `readArchiveEntries`; the writer, the
// structural gate and the atomic rename are shared. So the zip suite above is
// re-run per extension here — including the zip leg, because the zip path itself
// CHANGED (it used to delegate to `zip.Zip#extractAllTo`, it now goes through the
// same entry writer as tar) and that is the regression risk of this feature.
const ALL_FORMATS: ArchiveFormat[] = ['zip', 'tar', 'tar.gz', 'tgz'];

describe.each(ALL_FORMATS)('EXTRACT_SCRIPT — %s', (format) => {
    const fileName = `neo-pkg-dbus.${format}`;
    const archivesOf = (tree: FakeTree = dbusTree()): Record<string, FakeArchive> => ({ [fileName]: { entries: entriesFor(format, tree) } });

    test('the archive is found by package.json name+version and installed', () => {
        const { yields, calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf());

        expect(yields).toContain(`using ${fileName} for neo-pkg-dbus 1.0.0`);
        expect(yields).toContain('verified neo-pkg-dbus@1.0.0');
        expect(yields).toContain('installed /work/public/neo-pkg-dbus');
        expect(calls).toContain(`rename ${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus/neo-pkg-dbus-main -> /work/public/neo-pkg-dbus`);
    });

    // THE WHOLE POINT of writing the entries ourselves: every member has to land
    // at its own relative path under staging, nested directories included.
    test('every member lands at its own relative path under staging', () => {
        const staging = `${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus`;
        const { written } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf());

        expect([...written.keys()].sort()).toEqual(
            [
                `${staging}/neo-pkg-dbus-main/README.md`,
                `${staging}/neo-pkg-dbus-main/cgi-bin/package.json`,
                `${staging}/neo-pkg-dbus-main/frontend/package.json`,
                `${staging}/neo-pkg-dbus-main/package.json`,
            ].sort()
        );
        expect(written.get(`${staging}/neo-pkg-dbus-main/README.md`)).toBe('# dbus');
        expect(JSON.parse(written.get(`${staging}/neo-pkg-dbus-main/package.json`) as string)).toMatchObject({ name: 'neo-pkg-dbus', version: '1.0.0' });
        // Nothing escaped into the archive directory or the destination.
        for (const p of written.keys()) expect(p.startsWith(`${staging}/`)).toBe(true);
    });

    test('a deeply nested member gets its parent directories created', () => {
        const staging = `${ARCHIVE_STAGING_PREFIX}pkg-a`;
        const { written, mkdirs } = runExtractScript(
            { name: 'pkg-a', version: '1.0.0' },
            {
                [`pkg-a.${format}`]: {
                    entries: entriesFor(format, {
                        files: {
                            'pkg-a-main/package.json': JSON.stringify({ name: 'pkg-a', version: '1.0.0' }),
                            'pkg-a-main/a/b/c/deep.txt': 'deep',
                        },
                    }),
                },
            }
        );

        expect(written.get(`${staging}/pkg-a-main/a/b/c/deep.txt`)).toBe('deep');
        expect(mkdirs).toContain(`${staging}/pkg-a-main/a/b/c`);
    });

    test('the nested cgi-bin / frontend package.json are not consulted for the identity check', () => {
        const { yields } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf());

        expect(yields.join('\n')).toContain('@1.0.0');
        expect(yields.join('\n')).not.toContain('9.9.9');
    });

    // -----------------------------------------------------------------------
    // INSTALL vs UPDATE — the two ways the staged tree reaches /work/public
    // -----------------------------------------------------------------------
    // The `dest` prefix and the fixture of a package that has been RUNNING: its
    // conf/, its logs/ and its data/ are not in any archive, and the update that
    // deletes them is the bug this suite guards.
    const DEST = '/work/public/neo-pkg-dbus';
    const previousInstall = () => ({
        destFiles: {
            // The user's own configuration — the whole point.
            'conf/collector.json': '{"endpoint":"opc.tcp://plant1"}',
            'logs/collector-a.log': 'old log line',
            // Shipped by the archive too, so it must end up REPLACED.
            'package.json': JSON.stringify({ name: 'neo-pkg-dbus', version: '0.9.0' }),
            'README.md': '# old dbus',
        },
        destDirs: ['data'],
    });

    test('update (force): files the archive does NOT carry survive', () => {
        const { dest, calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf(), { force: true, ...previousInstall() });

        expect(dest.get('conf/collector.json')).toBe('{"endpoint":"opc.tcp://plant1"}');
        expect(dest.get('logs/collector-a.log')).toBe('old log line');
        // …and nothing was deleted to get there.
        expect(calls.filter((c) => c.startsWith('rm ') && c.includes('/work/public/'))).toEqual([]);
        expect(calls.some((c) => c.startsWith('rename '))).toBe(false);
    });

    test('update (force): files the archive DOES carry are overwritten', () => {
        const { dest } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf(), { force: true, ...previousInstall() });

        expect(JSON.parse(dest.get('package.json') as string)).toMatchObject({ name: 'neo-pkg-dbus', version: '1.0.0' });
        expect(dest.get('README.md')).toBe('# dbus');
    });

    test('update (force): directories new in the archive are created under dest', () => {
        const { dest, mkdirs } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf(), { force: true, ...previousInstall() });

        expect(mkdirs).toContain(`${DEST}/cgi-bin`);
        expect(mkdirs).toContain(`${DEST}/frontend`);
        expect(JSON.parse(dest.get('cgi-bin/package.json') as string)).toMatchObject({ name: 'dbus-cgi' });
        expect(JSON.parse(dest.get('frontend/package.json') as string)).toMatchObject({ name: 'dbus-frontend' });
    });

    test('install (no force): a missing destination is filled by the atomic rename', () => {
        const { calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf());

        expect(calls).toContain(`rename ${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus/neo-pkg-dbus-main -> ${DEST}`);
        expect(calls.some((c) => c.startsWith('copy '))).toBe(false);
    });

    test('install (no force): an existing destination aborts and is left alone', () => {
        const { message, run } = runExtractFailure({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesOf(), previousInstall());

        expect(message).toContain(`destination already exists: ${DEST}`);
        expect(run.dest.get('conf/collector.json')).toBe('{"endpoint":"opc.tcp://plant1"}');
        expect(JSON.parse(run.dest.get('package.json') as string)).toMatchObject({ version: '0.9.0' });
        expect(run.calls.some((c) => c.startsWith('rename ') || c.startsWith('copy '))).toBe(false);
    });

    // -----------------------------------------------------------------------
    // BINARY FIDELITY — both paths, every format
    // -----------------------------------------------------------------------
    // Packages ship icons, fonts, shared objects and .db files. Nothing in this
    // pipeline may read or write a member as text: this runtime's `copyFileSync`
    // does, and it silently replaced every non-UTF-8 byte with U+FFFD on the
    // update path. The two tests below are the only ones in this file that can
    // tell that apart, because they are the only ones with a byte over 0x7F.
    const ICON = 'icon.png';
    const archivesWithBinary = (): Record<string, FakeArchive> => ({
        [fileName]: { entries: [...entriesFor(format, dbusTree()), binaryEntry(`neo-pkg-dbus-main/${ICON}`, BINARY_MEMBER_BYTES)] },
    });

    test('install: a binary member is written to staging byte-for-byte', () => {
        const staging = `${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus`;
        const { writtenBytes, copyFileSyncCalls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesWithBinary());

        expectExactBytes(writtenBytes.get(`${staging}/neo-pkg-dbus-main/${ICON}`), BINARY_MEMBER_BYTES);
        expect(copyFileSyncCalls).toEqual([]);
    });

    test('update (force): a binary member reaches dest byte-for-byte, without copyFileSync', () => {
        const { destBytes, copyFileSyncCalls, calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archivesWithBinary(), {
            force: true,
            ...previousInstall(),
        });

        // staging -> dest went through the merge, i.e. through copyFile.
        expectExactBytes(destBytes.get(ICON), BINARY_MEMBER_BYTES);
        // …and not through the byte-eating shortcut.
        expect(copyFileSyncCalls).toEqual([]);
        expect(calls.some((c) => c.startsWith('copy '))).toBe(false);
        // The rest of the update still holds with a binary member in the tree.
        expect(destBytes.get('conf/collector.json')).toBeDefined();
    });

    // VALIDATION BEFORE MUTATION. Each fixture advertises a valid manifest to the
    // lookup and unpacks something broken (the file changed underneath the
    // catalog); the installed tree must come out byte-for-byte unchanged.
    const advertisedAsDbus = (extracts: FakeTree): Record<string, FakeArchive> => ({
        [fileName]: {
            entries: entriesFor(format, pkgTree('neo-pkg-dbus-main', 'neo-pkg-dbus', '1.0.0')),
            entriesOnReread: entriesFor(format, extracts),
        },
    });

    test.each([
        ['two root entries', { files: { 'a/package.json': JSON.stringify({ name: 'neo-pkg-dbus' }), 'b/README.md': 'x' } }],
        ['no root package.json', { files: { 'neo-pkg-dbus-main/cgi-bin/package.json': JSON.stringify({ name: 'neo-pkg-dbus' }) } }],
        ['a package.json naming another package', pkgTree('neo-pkg-dbus-main', 'neo-pkg-other', '1.0.0')],
    ])('update (force): %s aborts with the installed tree untouched', (_label, extracts) => {
        const before = previousInstall();
        const { run } = runExtractFailure({ name: 'neo-pkg-dbus', version: '1.0.0' }, advertisedAsDbus(extracts as FakeTree), { force: true, ...before });

        expect(Object.fromEntries(run.dest)).toEqual(before.destFiles);
        expect(run.calls.some((c) => c.startsWith('rename ') || c.startsWith('copy ') || c.includes(`rm ${DEST}`))).toBe(false);
    });

    test('two root entries abort — the archive is not one package', () => {
        expect(() =>
            runExtractScript(
                { name: 'neo-pkg-dbus', version: '1.0.0' },
                archivesOf({ files: { 'a/package.json': JSON.stringify({ name: 'neo-pkg-dbus', version: '1.0.0' }), 'b/README.md': 'x' } })
            )
        ).toThrow('archive must contain exactly one root entry, found 2');
    });

    test('no archive for that name+version aborts before anything is written', () => {
        let run: ExtractRun | undefined;
        expect(() => {
            run = runExtractScript({ name: 'neo-pkg-dbus', version: '9.9.9' }, archivesOf());
        }).toThrow('no archive for neo-pkg-dbus 9.9.9');
        expect(run).toBeUndefined();
    });

    // ZIP SLIP / TAR SLIP — the guard that came with writing the entries
    // ourselves. `extractAllTo` used to own it; now we do, for every format.
    test.each([['../evil.js'], ['/etc/cron.d/evil'], ['neo-pkg-dbus-main/../../evil.js'], ['..\\evil.js']])(
        'a member named %p condemns the whole archive — nothing is written',
        (evil) => {
            const tree = dbusTree();
            const archives: Record<string, FakeArchive> = {
                [fileName]: { entries: [...entriesFor(format, tree), { name: evil, data: asArrayBuffer('pwned') }] },
            };

            let run: ExtractRun | undefined;
            expect(() => {
                run = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archives);
            }).toThrow(/escapes its directory|no archive for/);
            // Rejected at SCAN time, so the lookup never even offers the archive.
            expect(run).toBeUndefined();
        }
    );

    // -----------------------------------------------------------------------
    // GITHUB TARBALL METADATA — the `pax_global_header` regression (issue #1452)
    // -----------------------------------------------------------------------
    // https://github.com/{owner}/{repo}/archive/refs/heads/main.tar.gz puts a
    // `pax_global_header` member (the source commit hash) FIRST, ahead of
    // `{repo}-{branch}/`. `tar -tzf` hides it; `archive/tar` hands it over as an
    // ordinary entry, so the root count came out as
    // ['pax_global_header', 'neo-pkg-dbus-main'] and EVERY GitHub .tar.gz aborted
    // with "archive must contain exactly one root entry, found 2" — while the .zip
    // of the same repo installed fine, because the zip container has no such
    // member. Run in all four formats: the filter lives in the shared prelude and
    // a zip that ever carries one must behave identically.
    const withMetaFirst = (tree: FakeTree = dbusTree()): Record<string, FakeArchive> => ({
        [fileName]: {
            entries: [
                // The real payload of that member: a pax record, not a package file.
                { name: 'pax_global_header', data: asArrayBuffer('52 comment=8e0f1c3a9b7d5e2f4a6c8b0d2e4f6a8c0b2d4e6f\n') },
                ...entriesFor(format, tree),
            ],
        },
    });

    test('THE REGRESSION: a leading pax_global_header does not become a second root', () => {
        const { yields, calls } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, withMetaFirst());

        expect(yields).toContain('verified neo-pkg-dbus@1.0.0');
        expect(yields).toContain('installed /work/public/neo-pkg-dbus');
        expect(calls).toContain(`rename ${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus/neo-pkg-dbus-main -> /work/public/neo-pkg-dbus`);
        expect(yields.join('\n')).not.toContain('exactly one root entry');
    });

    test('the metadata member is never written to disk', () => {
        const staging = `${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus`;
        const { written, mkdirs } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, withMetaFirst());

        expect([...written.keys()]).not.toContain(`${staging}/pax_global_header`);
        expect([...written.keys()].every((p) => p.startsWith(`${staging}/neo-pkg-dbus-main/`))).toBe(true);
        expect(mkdirs).not.toContain(`${staging}/pax_global_header`);
    });

    // GNU/BSD tar write per-file pax records as `PaxHeaders.<pid>/<name>`, at the
    // root or beside the file they describe — and `PaxHeaders.0/package.json` is
    // the nasty one: it has exactly two segments, so an unfiltered reader would
    // hand its binary payload to JSON.parse as if it were the manifest.
    test.each([
        ['PaxHeaders.0/package.json'],
        ['PaxHeaders/README.md'],
        ['./PaxHeaders.6/whatever'],
        ['neo-pkg-dbus-main/PaxHeaders.0/README.md'],
        ['pax_header'],
    ])('a %p member is dropped, and the package still installs', (meta) => {
        const staging = `${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus`;
        const archives: Record<string, FakeArchive> = {
            [fileName]: { entries: [{ name: meta, data: asArrayBuffer('tar bookkeeping, not a file') }, ...entriesFor(format, dbusTree())] },
        };

        const { yields, written } = runExtractScript({ name: 'neo-pkg-dbus', version: '1.0.0' }, archives);

        expect(yields).toContain('installed /work/public/neo-pkg-dbus');
        for (const p of written.keys()) expect(p.toLowerCase()).not.toContain('pax');
        expect(written.get(`${staging}/neo-pkg-dbus-main/README.md`)).toBe('# dbus');
    });

    // A tar entry's `isDir` is NOT confirmed to exist, so the trailing slash has
    // to be enough. `entriesFor` omits the flag for every tar format.
    test('a member ending in "/" becomes a directory, never a file', () => {
        const staging = `${ARCHIVE_STAGING_PREFIX}pkg-a`;
        const { written, mkdirs } = runExtractScript(
            { name: 'pkg-a', version: '1.0.0' },
            {
                [`pkg-a.${format}`]: {
                    entries: entriesFor(format, {
                        dirs: ['pkg-a-main', 'pkg-a-main/empty-dir'],
                        files: { 'pkg-a-main/package.json': JSON.stringify({ name: 'pkg-a', version: '1.0.0' }) },
                    }),
                },
            }
        );

        expect(mkdirs).toContain(`${staging}/pkg-a-main/empty-dir`);
        expect([...written.keys()]).not.toContain(`${staging}/pkg-a-main/empty-dir`);
        expect([...written.keys()]).not.toContain(`${staging}/pkg-a-main/empty-dir/`);
    });
});

// ---------------------------------------------------------------------------
// HOW AN ABORT REACHES THE USER — YIELD, THEN THROW (issue #1452)
// ---------------------------------------------------------------------------
// The throw alone reaches nobody: TQL answers `success: true` for a script that
// threw and returns only the rows yielded BEFORE it (measured — see `runScript`).
// So every abort must put its reason on a row first. Skipping that is what turned
// "archive must contain exactly one root entry, found 2" into the user-visible
// "archive extract reported success but /public/neo-pkg-dbus is missing".
describe('EXTRACT_SCRIPT — the abort protocol', () => {
    /** Stated independently of the implementation, like every other constant here. */
    const SENTINEL = '__PKG_SCRIPT_ERROR__';

    test('the reason is YIELDED before the throw, as the last row', () => {
        const { message, run } = runExtractFailure({ name: 'neo-pkg-dbus', version: '9.9.9' }, dbusArchives());

        expect(message).toBe('no archive for neo-pkg-dbus 9.9.9');
        // The row exists at all — that is the only thing the browser will see.
        expect(run.yields).toContain(`${SENTINEL} no archive for neo-pkg-dbus 9.9.9`);
        // …and it is the LAST one: the throw came after it, not before.
        expect(run.yields[run.yields.length - 1]).toBe(`${SENTINEL} no archive for neo-pkg-dbus 9.9.9`);
    });

    test('the rows produced before the failure are kept — they are the trace', () => {
        const { run } = runExtractFailure({ name: 'neo-pkg-dbus', version: '1.0.0' }, dbusArchives(), {
            destFiles: { 'conf/collector.json': 'KEEP ME' },
        });

        expect(run.yields[0]).toBe('using neo-pkg-dbus.zip for neo-pkg-dbus 1.0.0');
        expect(run.yields[run.yields.length - 1]).toContain(`${SENTINEL} destination already exists:`);
    });

    // The abort still cleans up: yielding must not become a way to leave the
    // staging tree behind.
    test('staging is purged BEFORE the reason is yielded', () => {
        const { run } = runExtractFailure(
            { name: 'neo-pkg-dbus', version: '1.0.0' },
            { 'neo-pkg-dbus.zip': { ...pkgArchive('neo-pkg-dbus-main', 'neo-pkg-dbus', '1.0.0'), entriesOnReread: [] } }
        );

        expect(run.calls).toContain(`rm ${ARCHIVE_STAGING_PREFIX}neo-pkg-dbus`);
        expect(run.yields[run.yields.length - 1]).toContain(SENTINEL);
    });

    test('every abort goes through failScript — the extract body throws nothing itself', () => {
        expect(EXTRACT_SCRIPT).toContain('function failScript(');
        expect(EXTRACT_SCRIPT).toContain('$.yield(SCRIPT_ERROR_SENTINEL + " " + text);');
        // The extract-specific half of the source (everything the prelude did not
        // contribute) must not contain a single bare throw: one that skipped the
        // yield would be invisible to the browser all over again.
        const body = EXTRACT_SCRIPT.slice(ARCHIVE_SCRIPT_PRELUDE.length);
        expect(body).not.toContain('throw new Error(');
        expect(body).toContain('failScript(msg);');
    });
});

// A `.tar.bz2` never becomes a catalog row, so the install cannot be reached from
// the UI; the script still refuses it rather than handing the bytes to untarSync.
describe('EXTRACT_SCRIPT — unsupported compression', () => {
    test('a .tar.xz in the directory is invisible to the lookup', () => {
        expect(() =>
            runExtractScript({ name: 'pkg-a', version: '1.0.0' }, { 'pkg-a.tar.xz': { entries: entriesFor('tar', pkgTree('pkg-a-main', 'pkg-a', '1.0.0')) } })
        ).toThrow('no archive for pkg-a 1.0.0');
    });

    test('the script carries the format table, not a lone .zip test', () => {
        expect(EXTRACT_SCRIPT).toContain('function archiveKind(');
        expect(EXTRACT_SCRIPT).toContain('function readArchiveEntries(');
        expect(EXTRACT_SCRIPT).not.toContain('isZipName');
        // The extractAllTo CALL is gone (the prelude still mentions it in prose):
        // one writer serves every format, and owns the traversal guard that came
        // with taking the job over.
        expect(EXTRACT_SCRIPT).not.toContain('.extractAllTo(');
        expect(EXTRACT_SCRIPT).toContain('function writeEntries(');
    });
});

describe('stepArchiveExtract', () => {
    beforeEach(() => jest.resetAllMocks());

    test('success: sends name + version (no path) and reports ok', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'installed /work/public/pkg-a' });
        mockWait.mockResolvedValue(true);

        const ctx = makeCtx();
        const progress: string[] = [];
        ctx.onProgress = (l) => progress.push(l);

        await expect(stepArchiveExtract(ctx)).resolves.toEqual({ ok: true, log: 'installed /work/public/pkg-a' });

        expect(mockRunScript).toHaveBeenCalledTimes(1);
        const [, params] = mockRunScript.mock.calls[0];
        expect(params).toEqual({
            // WHAT to install. The zip is the server's problem.
            name: 'pkg-a',
            version: '1.2.3',
            // staging must live outside /work/public — a partially written tree
            // there would be scanned as an installed package.
            staging: `${ARCHIVE_STAGING_PREFIX}pkg-a`,
            dest: '/work/public/pkg-a',
        });
        expect(params).not.toHaveProperty('archive');
        expect(params?.staging.startsWith('/work/public/')).toBe(false);

        expect(ctx.logs.join('\n')).toContain('== extract pkg-a 1.2.3 -> /work/public/pkg-a ==');
        expect(ctx.logs).toContain('installed /work/public/pkg-a');
        expect(ctx.logs).toContain('(ok) directory found');
        expect(progress).toEqual(['extract archive', 'verify extract']);
    });

    // The update path, mirroring `stepPkgCopy(ctx, { force: true })`. `force`
    // travels as its own param so the script can keep the destination instead of
    // deleting it — see the merge tests above.
    test('force: true sends force=1 and says so in the log and the progress', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'installed /work/public/pkg-a' });
        mockWait.mockResolvedValue(true);

        const ctx = makeCtx();
        const progress: string[] = [];
        ctx.onProgress = (l) => progress.push(l);

        await expect(stepArchiveExtract(ctx, { force: true })).resolves.toEqual({ ok: true, log: 'installed /work/public/pkg-a' });

        expect(mockRunScript.mock.calls[0][1]).toEqual({
            name: 'pkg-a',
            version: '1.2.3',
            staging: `${ARCHIVE_STAGING_PREFIX}pkg-a`,
            dest: '/work/public/pkg-a',
            force: '1',
        });
        expect(ctx.logs.join('\n')).toContain('== extract pkg-a 1.2.3 -> /work/public/pkg-a (merge) ==');
        expect(progress).toEqual(['extract archive -f', 'verify extract']);
    });

    test.each([
        ['no options', undefined],
        ['force: false', { force: false }],
    ])('%s → no force param (install semantics)', async (_label, opts) => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'ok' });
        mockWait.mockResolvedValue(true);

        await stepArchiveExtract(makeCtx(), opts);

        expect(mockRunScript.mock.calls[0][1]).not.toHaveProperty('force');
    });

    // `ctx.tag` is the version the user picked in the menu (usePkgCommand fills
    // it from the picked row, falling back to latest_version) — the SAME field
    // the GitHub path appends as `@<tag>`.
    test('the version comes from ctx.tag', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'ok' });
        mockWait.mockResolvedValue(true);

        await stepArchiveExtract(makeCtx({ tag: '2.5.0' }));

        expect(mockRunScript.mock.calls[0][1]).toMatchObject({ name: 'pkg-a', version: '2.5.0' });
    });

    test('uses the archive-specific probe budget, not the pkg-copy default', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'ok' });
        mockWait.mockResolvedValue(true);

        await stepArchiveExtract(makeCtx());

        expect(mockWait).toHaveBeenCalledWith('pkg-a', {
            attempts: ARCHIVE_PROBE_ATTEMPTS,
            delayMs: ARCHIVE_PROBE_DELAY_MS,
        });
    });

    test('script ok but the directory never appears → ok:false naming /public/{name}', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'script log' });
        mockWait.mockResolvedValue(false);

        const ctx = makeCtx();
        const res = await stepArchiveExtract(ctx);

        expect(res.ok).toBe(false);
        expect((res as { reason: string }).reason).toBe('archive extract reported success but /public/pkg-a is missing');
        expect(ctx.logs).toContain('(fail) directory not found');
    });

    test('script failure is returned verbatim and skips the probe', async () => {
        mockRunScript.mockResolvedValue({ ok: false, log: 'boom', reason: 'archive is missing package.json' });

        const ctx = makeCtx();
        const res = await stepArchiveExtract(ctx);

        expect(res).toEqual({ ok: false, log: 'boom', reason: 'archive is missing package.json' });
        expect(mockWait).not.toHaveBeenCalled();
        expect(ctx.logs).toContain('boom');
    });

    describe('self-defence: local source with no version', () => {
        // Offline gating lives in item.tsx; usePkgCommand forwards `source`
        // unvalidated, so this step must refuse on its own rather than send an
        // empty version to the server (which would match no archive anyway, but
        // with a message about the wrong thing).
        test.each([
            ['undefined', undefined],
            ['empty string', ''],
            ['whitespace only', '   '],
        ])('%s tag → immediate ok:false, no script call', async (_label, tag) => {
            const ctx = makeCtx({ tag });

            const res = await stepArchiveExtract(ctx);

            expect(res.ok).toBe(false);
            expect((res as { reason: string }).reason).toBe('no version selected for pkg-a');
            expect(mockRunScript).not.toHaveBeenCalled();
            expect(mockWait).not.toHaveBeenCalled();
            expect(ctx.logs.join('\n')).toContain('(fail) no version selected for pkg-a');
        });
    });
});
