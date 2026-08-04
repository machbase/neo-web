// issue #1452 — the local-archive leg of the App Store catalog.
//
// WHAT A REAL ARCHIVE LOOKS LIKE — READ THIS BEFORE "FIXING" A FIXTURE
// -------------------------------------------------------------------
// Measured on machbase-neo v8.5.10-snapshot, `/public/neo-pkg-dbus.zip`:
//
//   root entry        neo-pkg-dbus-main        ← {repo}-{branch}, NOT the pkg name
//   onprem.json       absent (no archive has ever had one)
//   package.json      THREE of them — root, cgi-bin/, frontend/
//   root package.json { "name": "neo-pkg-dbus", "version": "1.0.0",
//                       "description": "...", "minServerVersion": "8.5.6" }
//
// These are GitHub source zips and will keep being. So the contract under test is:
// meta comes from the ROOT package.json only, the root DIRECTORY name is ignored,
// `description` may be absent, and `minServerVersion` becomes `minServer`.
//
// WHY THESE TESTS MOCK `runScript` AND NOT `getFiles`
// ---------------------------------------------------
// The first implementation listed the archive directory with the file api
// (`getFiles`) and cross-checked an `index.json` against it. On a real server
// that listing NEVER contains a `.zip`: `/api/files` filters directory listings
// through an extension allowlist (css csv html jpg js json md png sh svg txt) and
// `zip` is not on it. Measured on v8.5.10-snapshot in one directory:
//
//   SHELL ls -l /work/_ziptest   → neo-pkg-demo-9.9.9.zip, note.txt
//   GET   /api/files/_ziptest/   → note.txt
//
// So every entry was discarded and the offline catalog was permanently empty —
// and the old tests passed anyway, because they mocked `getFiles` and fed it zip
// names the real api can never return. Mocking the transport that cannot see the
// files is what hid the bug for six phases.
//
// WHY SCAN_SCRIPT IS ALSO EXECUTED HERE, IN A SANDBOX
// ---------------------------------------------------
// Stubbing `runScript` tests the TypeScript half of the seam and NOTHING that
// runs on the server. The bug that rejected 100% of real archives lived in the
// script string: zip entry `.data` is an ArrayBuffer, `String(data)` produced
// "[object ArrayBuffer]", and `JSON.parse` answered "invalid character 'o'".
// Every TS-side test was green throughout. So the script source is executed
// below against a faked `fs` / `archive/zip`.

import {
    buildLocalCatalog,
    fetchLocalArchiveEntries,
    dirsFromInstalledNames,
    getInstalledDirs,
    getInstalledIcons,
    getLastArchiveScanErrors,
    normalizeInstalledDirs,
    invalidateLocalArchiveCache,
    isLocalOnlyMode,
    normalizeArchiveEntry,
    parseArchiveScan,
    readLocalReadme,
    refreshLocalArchives,
    scanLocalArchives,
    SCAN_SCRIPT,
} from './onpremCatalog';
import { getFiles } from './fileTree';
import { getFileList } from '@/api/repository/api';
import { runScript } from '@/components/side/AppStore/pkgLifecycle/script';
import {
    asArrayBuffer,
    createArchiveRuntimeFake,
    entriesFor,
    pkgJsonEntry,
    type ArchiveFormat,
    type FakeArchive,
} from '@/components/side/AppStore/pkgLifecycle/archiveRuntimeFake';
import { computeEligibility } from '@/utils/version/utils';

jest.mock('@/components/side/AppStore/pkgLifecycle/script', () => ({ runScript: jest.fn() }));
jest.mock('./fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn() }));

const mockRunScript = runScript as jest.MockedFunction<typeof runScript>;
const mockGetFiles = getFiles as jest.MockedFunction<any>;
const mockGetFileList = getFileList as jest.MockedFunction<any>;

/**
 * The archive directory as the SCRIPT sees it. Written out here on purpose: the
 * module exports no path constant any more (that is the point — no path crosses
 * the wire), so the test states the expected literal independently and the
 * assertions below prove the script agrees with it.
 */
const ARCHIVE_WORK_DIR = '/work/public/';

/**
 * The local-only policy file, as the SCRIPT addresses it. Stated independently
 * here for the same reason as the directory above: no TypeScript constant carries
 * it, so the assertions below are what prove the script agrees.
 */
const PKG_CONF_PATH = `${ARCHIVE_WORK_DIR}.pkg-conf.json`;

/**
 * One record as the scan script emits it: the archive file name plus the four
 * fields a root package.json can supply. NOTE the archive name carries no
 * version — `/public/neo-pkg-dbus.zip` is what a real one is called.
 */
const scanned = (name: string, over: Record<string, unknown> = {}) => ({
    archive: `${name}.zip`,
    name,
    version: '1.2.3',
    description: `${name} description`,
    minServer: '8.5.0',
    ...over,
});

/**
 * What `runScript` resolves to for a successful scan of `rows` — the CURRENT
 * envelope shape (issue #1452). `localOnly` defaults to false, i.e. the ordinary
 * online server.
 */
const scanOk = (rows: unknown[], localOnly = false) => ({ ok: true as const, log: JSON.stringify({ localOnly, archives: rows }) });

/**
 * The ORIGINAL bare-array output, kept as a first-class fixture.
 *
 * `SCAN_SCRIPT` is a string shipped in the bundle, so a browser on a cached older
 * build really can hand this shape to a newer parser. It must keep producing
 * cards, and must read as online.
 */
const scanLegacy = (rows: unknown[]) => ({ ok: true as const, log: JSON.stringify(rows) });

beforeEach(() => {
    jest.clearAllMocks();
    invalidateLocalArchiveCache();
});

// The directory used to be a TS constant handed to the script as a `dir` param
// and joined into paths that travelled back to the browser. It is now a literal
// in the script source and nothing else.
describe('the archive directory lives in the script, not in TypeScript', () => {
    test('the script names the directory itself', () => {
        expect(SCAN_SCRIPT).toContain(`var ARCHIVE_DIR = "${ARCHIVE_WORK_DIR}";`);
    });

    test('nothing reads a directory parameter any more', () => {
        expect(SCAN_SCRIPT).not.toContain('param("dir")');
    });
});

// ---------------------------------------------------------------------------
// SCAN_SCRIPT executed for real, against a faked server runtime.
// ---------------------------------------------------------------------------

interface FakeScanArchive extends FakeArchive {
    /** The name is a directory, not a file — the scan must skip it. */
    isDir?: boolean;
    /** `fs.statSync` itself blows up. */
    statThrows?: boolean;
    /**
     * Contents of the directory, i.e. an INSTALLED package's own files
     * (issue #1452). Only meaningful together with `isDir`; the icon scan reads
     * these to report the real icon FILE NAME instead of guessing `icon.png`.
     */
    dirFiles?: string[];
    /** `fs.readdirSync` on this directory blows up (permissions, a race, …). */
    dirReadThrows?: boolean;
    /**
     * `<dir>/package.json` of an INSTALLED package (issue #1452 — manual-extraction
     * detection). Only meaningful together with `isDir`.
     *
     * OMITTED means the file is not there at all, which is the interrupted-`pkg
     * copy` case and must stay indistinguishable from "nothing to report". A
     * string is served verbatim (malformed json belongs here); an object is
     * stringified; an ArrayBuffer covers the runtime that answers bytes for "utf8".
     */
    pkgJson?: string | ArrayBuffer | Record<string, unknown>;
    /** `fs.readFileSync` on that package.json blows up. */
    pkgJsonThrows?: boolean;
    /**
     * A `.git` entry sits in the directory (issue #1452) — i.e. it is a working
     * clone, not an unpacked source archive. Only meaningful together with `isDir`.
     */
    git?: boolean;
}

/**
 * Run the real SCAN_SCRIPT source with a faked `fs` / `archive/zip` /
 * `archive/tar` / `zlib` (see `archiveRuntimeFake.ts` — the SAME kit the extract
 * suite drives, so the two halves cannot disagree about what a `.tar.gz` is).
 *
 * `$.params` IS EMPTY — the script takes none. Every key of `files` is a name the
 * fake `readdirSync` reports (plus the `.` / `..` the real one includes), the file
 * NAME picks the container format, and the fake asserts the script asked for the
 * fixed directory.
 */
/**
 * `/work/public/.pkg-conf.json` as the fake filesystem holds it (issue #1452).
 * Omit the argument entirely for "the file does not exist", which is the default
 * every pre-existing case below runs under.
 */
interface FakePkgConf {
    /** Raw bytes of the file. `undefined` + `readThrows: false` ⇒ an empty file. */
    raw?: string;
    /** `fs.readFileSync` blows up (permissions, a race with a writer, …). */
    readThrows?: boolean;
}

const runScanScript = (files: Record<string, FakeScanArchive>, conf?: FakePkgConf) => {
    const yields: string[] = [];
    const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);
    const runtime = createArchiveRuntimeFake(files);

    /**
     * The installed package directory behind `/work/public/<dir>/package.json`, or
     * `null` when the path is not one of those (issue #1452).
     */
    const installedDirOf = (p: string): FakeScanArchive | null => {
        const m = /^\/work\/public\/([^/]+)\/package\.json$/.exec(p);
        if (!m) return null;
        const dir = files[m[1]];
        return dir?.isDir ? dir : null;
    };

    /**
     * The directory behind a `/work/public/<dir>/.git` probe (issue #1452), or null
     * when the path is not one of those. `.git` is checked with `existsSync` rather
     * than looked for in the listing because a runtime is free to hide dot entries
     * from `readdirSync`, and a missed `.git` would turn a developer's clone into a
     * removable directory.
     */
    const gitProbeOf = (p: string): FakeScanArchive | null => {
        const m = /^\/work\/public\/([^/]+)\/\.git$/.exec(p);
        if (!m) return null;
        const dir = files[m[1]];
        return dir?.isDir ? dir : null;
    };

    const fsMock = {
        readdirSync: (p: string) => {
            // The real readdirSync includes "." / ".." at EVERY level; not
            // filtering them was observed killing the script outright, so the fake
            // hands them back for the archive directory and for the installed
            // packages' own directories alike.
            if (p === ARCHIVE_WORK_DIR) return ['.', '..', ...Object.keys(files)];
            // An installed package's directory (issue #1452 — the icon scan). The
            // script must address it under the archive directory and nowhere else.
            expect(p.startsWith(ARCHIVE_WORK_DIR)).toBe(true);
            const dir = files[baseName(p.replace(/\/$/, ''))];
            if (!dir || !dir.isDir) throw new Error(`ENOTDIR: ${p}`);
            if (dir.dirReadThrows) throw new Error(`EACCES: ${p}`);
            return ['.', '..', ...(dir.dirFiles ?? [])];
        },
        // TWO callers, and no others: the policy file, and an installed package's
        // own package.json (issue #1452). The archives are found by readdirSync,
        // never probed by name.
        existsSync: (p: string) => {
            if (p === PKG_CONF_PATH) return conf !== undefined;
            const gitDir = gitProbeOf(p);
            if (gitDir) return !!gitDir.git;
            const dir = installedDirOf(p);
            expect(dir).not.toBeNull();
            return dir?.pkgJson !== undefined || !!dir?.pkgJsonThrows;
        },
        statSync: (p: string) => {
            const f = files[baseName(p)];
            if (f?.statThrows) throw new Error('stat failed');
            // `isDirectory` is a FUNCTION in this runtime, not a boolean.
            return { isDirectory: () => !!f?.isDir };
        },
        readFileSync: (p: string, enc: string) => {
            // The policy file and an installed package's manifest are read as text;
            // the tar formats read raw bytes and a zip is opened by path.
            if (p === PKG_CONF_PATH) {
                expect(enc).toBe('utf8');
                if (conf?.readThrows) throw new Error('EACCES: permission denied');
                return conf?.raw ?? '';
            }
            const dir = installedDirOf(p);
            if (dir) {
                expect(enc).toBe('utf8');
                if (dir.pkgJsonThrows) throw new Error(`EACCES: ${p}`);
                if (dir.pkgJson === undefined) throw new Error(`ENOENT: ${p}`);
                return typeof dir.pkgJson === 'string' || dir.pkgJson instanceof ArrayBuffer ? dir.pkgJson : JSON.stringify(dir.pkgJson);
            }
            expect(enc).toBe('buffer');
            return runtime.readBytes(p);
        },
    };

    const requireMock = (id: string) =>
        id === 'fs' ? fsMock : id === 'archive/zip' ? runtime.zipModule : id === 'archive/tar' ? runtime.tarModule : id === 'zlib' ? runtime.zlibModule : {};
    const $ = { params: {} as Record<string, string>, yield: (row: string) => yields.push(row) };

    // eslint-disable-next-line no-new-func
    new Function('require', '$', SCAN_SCRIPT)(requireMock, $);
    return { yields, scan: parseArchiveScan(yields.join('\n')) };
};

/** The real /public/neo-pkg-dbus.zip: root is `{repo}-{branch}`, three package.json. */
const DBUS_ARCHIVE: FakeArchive = {
    entries: [
        { name: 'neo-pkg-dbus-main/', isDir: true },
        pkgJsonEntry('neo-pkg-dbus-main/package.json', {
            name: 'neo-pkg-dbus',
            version: '1.0.0',
            description: 'CGI and jobs service for neo-pkg-dbus',
            minServerVersion: '8.5.6',
        }),
        { name: 'neo-pkg-dbus-main/README.md', data: asArrayBuffer('# dbus') },
        { name: 'neo-pkg-dbus-main/cgi-bin/', isDir: true },
        pkgJsonEntry('neo-pkg-dbus-main/cgi-bin/package.json', { name: 'dbus-cgi', version: '9.9.9' }),
        { name: 'neo-pkg-dbus-main/frontend/', isDir: true },
        pkgJsonEntry('neo-pkg-dbus-main/frontend/package.json', { name: 'dbus-frontend', version: '0.0.1' }),
    ],
};

describe('SCAN_SCRIPT — the server-side half, run for real', () => {
    test('THE REAL ARCHIVE: root dir is neo-pkg-dbus-main, the card is neo-pkg-dbus', () => {
        const { yields, scan } = runScanScript({ 'neo-pkg-dbus.zip': DBUS_ARCHIVE });

        // One row, holding the whole JSON array.
        expect(yields).toHaveLength(1);
        expect(scan.errors).toEqual([]);
        expect(scan.archives).toHaveLength(1);
        expect(scan.archives[0]).toMatchObject({
            archive: 'neo-pkg-dbus.zip',
            // From the ROOT package.json. The root DIRECTORY is `neo-pkg-dbus-main`
            // ({repo}-{branch}) and must never be used as the package name.
            name: 'neo-pkg-dbus',
            version: '1.0.0',
            description: 'CGI and jobs service for neo-pkg-dbus',
            // minServerVersion in the file → minServer on the entry.
            minServer: '8.5.6',
        });
    });

    test('the nested package.json of cgi-bin / frontend are ignored', () => {
        const { scan } = runScanScript({ 'neo-pkg-dbus.zip': DBUS_ARCHIVE });

        expect(scan.archives.map((a) => a.name)).toEqual(['neo-pkg-dbus']);
        expect(scan.archives.map((a) => a.name)).not.toContain('dbus-cgi');
        expect(scan.archives.map((a) => a.name)).not.toContain('dbus-frontend');
        expect(scan.archives[0].version).toBe('1.0.0'); // not 9.9.9 / 0.0.1
    });

    // THE BUG THAT ONLY THE SERVER SAW. `entry.data` is an ArrayBuffer;
    // `String(data)` yields "[object ArrayBuffer]" and JSON.parse answers
    // "invalid character 'o'". Do not replace these fixtures with strings.
    test('ArrayBuffer payloads decode — the failure that rejected every real archive', () => {
        const { scan } = runScanScript({
            'pkg.zip': { entries: [pkgJsonEntry('any-root-name/package.json', { name: 'pkg-a', version: '2.0.0' })] },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives[0]).toMatchObject({ name: 'pkg-a', version: '2.0.0' });
    });

    test.each([
        ['a plain string', (t: string) => t],
        ['a Uint8Array', (t: string) => new Uint8Array(Buffer.from(t, 'utf8'))],
        ['a plain byte array', (t: string) => [...Buffer.from(t, 'utf8')]],
    ])('%s payload decodes too (other runtimes / builds)', (_label, encode) => {
        const body = JSON.stringify({ name: 'pkg-a', version: '1.0.0' });
        const { scan } = runScanScript({ 'pkg.zip': { entries: [{ name: 'root/package.json', data: encode(body) }] } });

        expect(scan.archives[0]).toMatchObject({ name: 'pkg-a', version: '1.0.0' });
    });

    // String.fromCharCode.apply(null, wholeArray) throws RangeError well before
    // this size. The decode MUST stay chunked.
    test('a large package.json decodes instead of blowing the argument limit', () => {
        const big = { name: 'pkg-big', version: '1.0.0', description: 'x'.repeat(300000) };
        const { scan } = runScanScript({ 'big.zip': { entries: [pkgJsonEntry('big-main/package.json', big)] } });

        expect(scan.errors).toEqual([]);
        expect(scan.archives[0].description).toHaveLength(300000);
    });

    test('a non-ASCII description survives the byte decode', () => {
        const { scan } = runScanScript({
            'pkg.zip': { entries: [pkgJsonEntry('root/package.json', { name: 'pkg-a', version: '1.0.0', description: '한글 설명 · ünïcode' })] },
        });

        expect(scan.archives[0].description).toBe('한글 설명 · ünïcode');
    });

    test('description and minServerVersion are optional — opcua-client / replication ship without them', () => {
        const { scan } = runScanScript({
            // The two packages actually installed on the measured server.
            'neo-pkg-opcua-client.zip': {
                entries: [pkgJsonEntry('neo-pkg-opcua-client-main/package.json', { name: 'neo-pkg-opcua-client', version: '1.0.8', minServerVersion: '8.5.10' })],
            },
            'neo-pkg-replication.zip': {
                entries: [pkgJsonEntry('neo-pkg-replication-main/package.json', { name: 'neo-pkg-replication', version: '1.0.6', minServerVersion: '8.5.6' })],
            },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives.map((a) => [a.name, a.version, a.minServer, a.description])).toEqual([
            ['neo-pkg-opcua-client', '1.0.8', '8.5.10', ''],
            ['neo-pkg-replication', '1.0.6', '8.5.6', ''],
        ]);
    });

    test('a zip with no ROOT package.json is reported, not silently dropped', () => {
        const { scan } = runScanScript({
            // Only a nested one — the archive describes no package of its own.
            'weird.zip': { entries: [pkgJsonEntry('root/cgi-bin/package.json', { name: 'nested', version: '1.0.0' })] },
        });

        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([{ archive: 'weird.zip', error: 'no <root>/package.json' }]);
    });

    test('a directory entry named `<root>/package.json` is not mistaken for the manifest', () => {
        const { scan } = runScanScript({ 'odd.zip': { entries: [{ name: 'root/package.json', isDir: true }] } });

        expect(scan.errors).toEqual([{ archive: 'odd.zip', error: 'no <root>/package.json' }]);
    });

    test('non-zip names, directories and unstattable files are skipped or reported per file', () => {
        const { scan } = runScanScript({
            'notes.txt': {},
            'a-directory.zip': { isDir: true },
            'gone.zip': { statThrows: true },
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([{ archive: 'gone.zip', error: 'stat failed' }]);
    });

    test('one corrupt zip costs exactly itself', () => {
        const { scan } = runScanScript({
            'broken.zip': { throws: 'zip: not a valid zip file' },
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([{ archive: 'broken.zip', error: 'zip: not a valid zip file' }]);
    });

    test('malformed JSON in the root package.json is reported for that archive only', () => {
        const { scan } = runScanScript({
            'bad.zip': { entries: [{ name: 'bad-main/package.json', data: asArrayBuffer('{ not json') }] },
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toHaveLength(1);
        expect(scan.errors[0].archive).toBe('bad.zip');
    });

    // The path used to go server → client → server. Now nothing but the FILE NAME
    // ever leaves the server, and that only so the UI can name a bad archive.
    test('the emitted records carry a file name and no path at all', () => {
        const { yields } = runScanScript({
            'neo-pkg-dbus.zip': DBUS_ARCHIVE,
            'broken.zip': { throws: 'zip: not a valid zip file' },
        });

        const emitted = yields.join('\n');
        expect(emitted).toContain('neo-pkg-dbus.zip');
        expect(emitted).not.toContain(ARCHIVE_WORK_DIR);
        expect(emitted).not.toContain('/work/');
        for (const record of JSON.parse(yields[0]).archives) {
            expect(record.path).toBeUndefined();
            expect(record.archivePath).toBeUndefined();
        }
    });

    // A REAL FILE ON A REAL SERVER: /public/neo-pkg-replication-1.0.5.zip whose
    // root package.json says 1.0.4. The file name is decoration; package.json is
    // the record. If this ever flips, the card offers a version the extract step
    // (which matches on package.json too) can never find.
    test('the version comes from package.json, NOT from the file name', () => {
        const { scan } = runScanScript({
            'neo-pkg-replication-1.0.5.zip': {
                entries: [pkgJsonEntry('neo-pkg-replication-main/package.json', { name: 'neo-pkg-replication', version: '1.0.4' })],
            },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives).toHaveLength(1);
        expect(scan.archives[0]).toMatchObject({ archive: 'neo-pkg-replication-1.0.5.zip', version: '1.0.4' });

        const [card] = buildLocalCatalog(scan);
        expect(card.versions?.map((v) => v.version)).toEqual(['1.0.4']);
        expect(card.latest_version).toBe('1.0.4');
    });

    // TWO ZIPS, ONE name+version: refuse both. Choosing silently would leave the
    // user unable to tell what is about to be installed, and would let the card
    // display one file while the extract step matched another.
    describe('duplicate name+version is refused, never resolved', () => {
        const twoClaimants = {
            'neo-pkg-replication-1.0.5.zip': {
                entries: [pkgJsonEntry('neo-pkg-replication-main/package.json', { name: 'neo-pkg-replication', version: '1.0.4' })],
            },
            'neo-pkg-replication.zip': {
                entries: [pkgJsonEntry('neo-pkg-replication-1.0.4/package.json', { name: 'neo-pkg-replication', version: '1.0.4' })],
            },
        };

        test('neither archive becomes a version row', () => {
            const { scan } = runScanScript(twoClaimants);

            expect(scan.archives).toEqual([]);
            expect(buildLocalCatalog(scan)).toEqual([]);
        });

        test('both are reported, naming every colliding file', () => {
            const { scan } = runScanScript(twoClaimants);

            expect(scan.errors.map((e) => e.archive).sort()).toEqual(['neo-pkg-replication-1.0.5.zip', 'neo-pkg-replication.zip']);
            for (const err of scan.errors) {
                expect(err.error).toContain('duplicate neo-pkg-replication 1.0.4');
                expect(err.error).toContain('neo-pkg-replication-1.0.5.zip');
                expect(err.error).toContain('neo-pkg-replication.zip');
            }
        });

        test('a collision costs only the colliding version — other archives survive', () => {
            const { scan } = runScanScript({
                ...twoClaimants,
                // Same package, DIFFERENT version: not a duplicate.
                'neo-pkg-replication-1.0.6.zip': {
                    entries: [pkgJsonEntry('neo-pkg-replication-main/package.json', { name: 'neo-pkg-replication', version: '1.0.6' })],
                },
                'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
            });

            expect(scan.archives.map((a) => a.version).sort()).toEqual(['1.0.0', '1.0.6']);
            const byName = new Map(buildLocalCatalog(scan).map((c) => [c.name, c]));
            expect(byName.get('neo-pkg-replication')?.versions?.map((v) => v.version)).toEqual(['1.0.6']);
            expect(byName.get('good')).toBeDefined();
        });

        // Two zips with the same name at DIFFERENT versions are the normal
        // multi-version case and must keep folding into one card.
        test('same name, different versions is not a collision', () => {
            const { scan } = runScanScript({
                'a.zip': { entries: [pkgJsonEntry('a-main/package.json', { name: 'pkg-a', version: '1.0.0' })] },
                'b.zip': { entries: [pkgJsonEntry('b-main/package.json', { name: 'pkg-a', version: '2.0.0' })] },
            });

            expect(scan.errors).toEqual([]);
            expect(buildLocalCatalog(scan)[0].versions?.map((v) => v.version)).toEqual(['2.0.0', '1.0.0']);
        });
    });
});

// ---------------------------------------------------------------------------
// THE SAME SCAN, IN ALL FOUR CONTAINERS
// ---------------------------------------------------------------------------
// `.zip`, `.tar`, `.tar.gz` and `.tgz` differ ONLY inside `readArchiveEntries`;
// from the root-package.json lookup onwards there is one code path. These cases
// are the zip suite above, re-run per extension — if any of them ever needs a
// format-specific expectation, the shared path has been broken.
//
// The fake insists on the real pipeline: a `.tar.gz` read without
// `zlib.gunzipSync` throws "still gzipped", and a tar opened with `zip.Zip`
// throws. Green here means the script drives the right modules in the right order.
const ALL_FORMATS: ArchiveFormat[] = ['zip', 'tar', 'tar.gz', 'tgz'];

describe.each(ALL_FORMATS)('SCAN_SCRIPT — %s archives', (format) => {
    const named = (stem: string) => `${stem}.${format}`;

    /** The real neo-pkg-dbus tree, in this format's entry flavour. */
    const dbusEntries = () =>
        entriesFor(format, {
            dirs: ['neo-pkg-dbus-main', 'neo-pkg-dbus-main/cgi-bin', 'neo-pkg-dbus-main/frontend'],
            files: {
                'neo-pkg-dbus-main/package.json': JSON.stringify({
                    name: 'neo-pkg-dbus',
                    version: '1.0.0',
                    description: 'CGI and jobs service for neo-pkg-dbus',
                    minServerVersion: '8.5.6',
                }),
                'neo-pkg-dbus-main/README.md': '# dbus',
                'neo-pkg-dbus-main/cgi-bin/package.json': JSON.stringify({ name: 'dbus-cgi', version: '9.9.9' }),
                'neo-pkg-dbus-main/frontend/package.json': JSON.stringify({ name: 'dbus-frontend', version: '0.0.1' }),
            },
        });

    test('a root named {repo}-{branch} still yields a card built from package.json', () => {
        const { scan } = runScanScript({ [named('neo-pkg-dbus')]: { entries: dbusEntries() } });

        expect(scan.errors).toEqual([]);
        expect(scan.archives).toEqual([
            expect.objectContaining({
                archive: named('neo-pkg-dbus'),
                name: 'neo-pkg-dbus',
                version: '1.0.0',
                description: 'CGI and jobs service for neo-pkg-dbus',
                minServer: '8.5.6',
            }),
        ]);
    });

    test('the nested cgi-bin / frontend package.json are ignored', () => {
        const { scan } = runScanScript({ [named('neo-pkg-dbus')]: { entries: dbusEntries() } });

        expect(scan.archives.map((a) => a.name)).toEqual(['neo-pkg-dbus']);
        expect(scan.archives[0].version).toBe('1.0.0'); // not 9.9.9 / 0.0.1
    });

    // tar entries carry ArrayBuffer payloads exactly like zip ones — which is why
    // `toText` is reused and not reimplemented per format.
    test('ArrayBuffer payloads decode', () => {
        const { scan } = runScanScript({
            [named('pkg')]: { entries: [pkgJsonEntry('any-root-name/package.json', { name: 'pkg-a', version: '2.0.0' })] },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives[0]).toMatchObject({ name: 'pkg-a', version: '2.0.0' });
    });

    test('no ROOT package.json is reported, not silently dropped', () => {
        const { scan } = runScanScript({
            [named('weird')]: { entries: [pkgJsonEntry('root/cgi-bin/package.json', { name: 'nested', version: '1.0.0' })] },
        });

        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([{ archive: named('weird'), error: 'no <root>/package.json' }]);
    });

    test('one corrupt archive costs exactly itself', () => {
        const { scan } = runScanScript({
            [named('broken')]: { throws: 'not a valid archive' },
            [named('good')]: { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([{ archive: named('broken'), error: 'not a valid archive' }]);
    });

    test('the version comes from package.json, not from the file name', () => {
        const { scan } = runScanScript({
            [named('neo-pkg-replication-1.0.5')]: {
                entries: [pkgJsonEntry('neo-pkg-replication-main/package.json', { name: 'neo-pkg-replication', version: '1.0.4' })],
            },
        });

        expect(scan.archives[0]).toMatchObject({ archive: named('neo-pkg-replication-1.0.5'), version: '1.0.4' });
        expect(buildLocalCatalog(scan)[0].latest_version).toBe('1.0.4');
    });

    test('two archives claiming one name+version are both refused', () => {
        const entries = [pkgJsonEntry('pkg-a-main/package.json', { name: 'pkg-a', version: '1.0.0' })];
        const { scan } = runScanScript({ [named('a')]: { entries }, [named('b')]: { entries } });

        expect(scan.archives).toEqual([]);
        expect(scan.errors.map((e) => e.archive).sort()).toEqual([named('a'), named('b')].sort());
    });

    // ZIP SLIP / TAR SLIP. We write the members ourselves now, so a name that
    // climbs out of the staging directory condemns the whole archive — at SCAN
    // time already, so no card is ever offered for it.
    test.each([['../evil/package.json'], ['/etc/cron.d/x'], ['root/../../evil.js'], ['..\\evil\\package.json']])(
        'an entry named %p rejects the whole archive',
        (evil) => {
            const { scan } = runScanScript({
                [named('evil')]: {
                    entries: [pkgJsonEntry('evil-main/package.json', { name: 'evil', version: '1.0.0' }), { name: evil, data: asArrayBuffer('x') }],
                },
                [named('good')]: { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
            });

            expect(scan.archives.map((a) => a.name)).toEqual(['good']);
            expect(scan.errors).toHaveLength(1);
            expect(scan.errors[0].archive).toBe(named('evil'));
            expect(scan.errors[0].error).toContain('escapes its directory');
        }
    );

    // -----------------------------------------------------------------------
    // GITHUB TARBALL METADATA — `pax_global_header` (issue #1452)
    // -----------------------------------------------------------------------
    // The codeload tarball's FIRST member is `pax_global_header` (the source commit
    // hash). `tar -tzf` hides it, `archive/tar` does not — and it broke the INSTALL
    // (two root entries) while the scan happened to survive it. Both halves share
    // one filter now, so both are pinned; running it per format keeps a zip that
    // ever carries one behaving the same way.
    const META_ENTRY = { name: 'pax_global_header', data: asArrayBuffer('52 comment=8e0f1c3a9b7d5e2f4a6c8b0d2e4f6a8c0b2d4e6f\n') };

    test('a leading pax_global_header does not disturb the manifest lookup', () => {
        const { scan } = runScanScript({
            [named('neo-pkg-dbus')]: { entries: [META_ENTRY, ...dbusEntries()] },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives).toEqual([expect.objectContaining({ name: 'neo-pkg-dbus', version: '1.0.0' })]);
    });

    // THE NASTY ONE: `PaxHeaders.0/package.json` has exactly two segments, so an
    // unfiltered reader takes its binary pax record for the root manifest and the
    // archive dies on JSON.parse — no card, no explanation.
    test.each([['PaxHeaders.0/package.json'], ['PaxHeaders/package.json'], ['./PaxHeaders.6/package.json'], ['pax_header']])(
        'a %p member is ignored and the real manifest still wins',
        (meta) => {
            const { scan } = runScanScript({
                [named('pkg')]: {
                    entries: [
                        { name: meta, data: asArrayBuffer('30 mtime=1700000000.0\n') },
                        pkgJsonEntry('pkg-a-main/package.json', { name: 'pkg-a', version: '1.0.0' }),
                    ],
                },
            });

            expect(scan.errors).toEqual([]);
            expect(scan.archives[0]).toMatchObject({ name: 'pkg-a', version: '1.0.0' });
        }
    );

    // The filter must not become a hiding place: a metadata NAME with a `..` in it
    // is still an escaping member and still condemns the archive.
    test('a metadata name that escapes its directory is refused, not filtered away', () => {
        const { scan } = runScanScript({
            [named('evil')]: {
                entries: [pkgJsonEntry('evil-main/package.json', { name: 'evil', version: '1.0.0' }), { name: 'PaxHeaders.0/../../evil.js', data: asArrayBuffer('x') }],
            },
        });

        expect(scan.archives).toEqual([]);
        expect(scan.errors[0].error).toContain('escapes its directory');
    });

    // The `isDir` flag is CONFIRMED on zip entries and NOT confirmed on tar ones,
    // so directoryness must survive on the trailing slash alone. `tarEntries()`
    // deliberately omits the flag; this case pins the fallback directly.
    test('a member ending in "/" is a directory even with no isDir flag', () => {
        const { scan } = runScanScript({
            // A directory that happens to be called `<root>/package.json` must not
            // be parsed as the manifest.
            [named('odd')]: { entries: [{ name: 'root/package.json/' }] },
        });

        expect(scan.errors).toEqual([{ archive: named('odd'), error: 'no <root>/package.json' }]);
    });
});

// ---------------------------------------------------------------------------
// FORMATS WE CAN NAME BUT NOT OPEN
// ---------------------------------------------------------------------------
// `zlib` is gzip/deflate only — there is no bzip2, xz or zstd module in this
// runtime. Skipping those files would leave a user staring at a /public/ that
// visibly holds their package and an App Store that shows nothing, with no way to
// find out why. So they become error records.
describe('SCAN_SCRIPT — unsupported compression is reported, never skipped', () => {
    const UNSUPPORTED = 'unsupported compression (only zip, tar, tar.gz/tgz)';

    test.each([['pkg.tar.bz2'], ['pkg.tar.xz'], ['pkg.tar.zst'], ['pkg.tbz2'], ['pkg.txz'], ['pkg.tzst']])('%s is reported as unsupported', (fileName) => {
        const { scan } = runScanScript({
            [fileName]: {},
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([{ archive: fileName, error: UNSUPPORTED }]);
    });

    test('a file that is not an archive at all stays silent', () => {
        const { scan } = runScanScript({ 'notes.txt': {}, 'README.md': {}, 'data.json': {} });

        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([]);
    });

    // LONGEST SUFFIX WINS. `x.tar.gz` must resolve as tar.gz — not as `.tar`
    // (which would hand a gzip stream to untarSync) and not as an unknown `.gz`
    // (which would drop it). The fake throws "still gzipped" on the first mistake
    // and the archive would simply vanish on the second, so this passing means the
    // longest match really is the one that wins.
    test('x.tar.gz is read as tar.gz, not as .tar or .gz', () => {
        const { scan } = runScanScript({
            'x.tar.gz': { entries: [pkgJsonEntry('x-main/package.json', { name: 'pkg-x', version: '1.0.0' })] },
        });

        expect(scan.errors).toEqual([]);
        expect(scan.archives.map((a) => [a.archive, a.name])).toEqual([['x.tar.gz', 'pkg-x']]);
    });

    // …and the mirror case: `.tar.bz2` must not be caught by a shorter `.tar`
    // suffix and fed to untarSync as if it were an uncompressed tar.
    test('x.tar.bz2 is unsupported, not mistaken for a plain .tar', () => {
        const { scan } = runScanScript({ 'x.tar.bz2': {} });

        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([{ archive: 'x.tar.bz2', error: UNSUPPORTED }]);
    });

    // A directory called `foo.tar` is an installed package, not an archive.
    test('a DIRECTORY with an archive extension is skipped without an error', () => {
        const { scan } = runScanScript({ 'a-directory.tar.gz': { isDir: true }, 'b-directory.tar.xz': { isDir: true } });

        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([]);
    });
});

// Two formats of ONE package at ONE version is the same collision as two zips:
// the installer could not tell which file the card meant either.
describe('SCAN_SCRIPT — collisions across formats', () => {
    test('pkg.zip and pkg.tar.gz claiming the same name+version are both refused', () => {
        const entries = [pkgJsonEntry('pkg-a-main/package.json', { name: 'pkg-a', version: '1.0.0' })];
        const { scan } = runScanScript({ 'pkg-a.zip': { entries }, 'pkg-a.tar.gz': { entries } });

        expect(scan.archives).toEqual([]);
        expect(scan.errors.map((e) => e.archive).sort()).toEqual(['pkg-a.tar.gz', 'pkg-a.zip']);
        for (const err of scan.errors) expect(err.error).toContain('duplicate pkg-a 1.0.0');
    });

    test('different versions in different formats fold into one card', () => {
        const { scan } = runScanScript({
            'pkg-a.zip': { entries: [pkgJsonEntry('pkg-a-main/package.json', { name: 'pkg-a', version: '1.0.0' })] },
            'pkg-a.tgz': { entries: [pkgJsonEntry('pkg-a-main/package.json', { name: 'pkg-a', version: '2.0.0' })] },
        });

        expect(scan.errors).toEqual([]);
        expect(buildLocalCatalog(scan)[0].versions?.map((v) => v.version)).toEqual(['2.0.0', '1.0.0']);
    });
});

describe('scanLocalArchives — request shape', () => {
    test('runs one TQL script with NO parameters at all', async () => {
        mockRunScript.mockResolvedValue(scanOk([]));

        await scanLocalArchives();

        expect(mockRunScript).toHaveBeenCalledTimes(1);
        const [body, params] = mockRunScript.mock.calls[0];
        // Nothing is bound, so no user-supplied value can steer the scan — the
        // `dir` parameter (and its validation question) is gone for good.
        expect(params).toEqual({});
        expect(Object.keys(params ?? {})).toHaveLength(0);
        // The directory is a literal in the body precisely BECAUSE it is not a
        // runtime value. Values still may not be concatenated in (see
        // pkgLifecycle/script.ts) — there simply are none.
        expect(body).toContain(`var ARCHIVE_DIR = "${ARCHIVE_WORK_DIR}";`);
        expect(body).toContain('readdirSync');
        expect(body).toContain('archive/zip');
        // `.` and `..` are real readdirSync entries in this runtime; not filtering
        // them was observed killing the script outright.
        expect(body).toContain('n !== "." && n !== ".."');
        // onprem.json is dead: the meta comes from the root package.json.
        expect(body).not.toContain('onprem.json');
        expect(body).toContain('/package.json');
    });

    test('THE ZIPS ARE INVISIBLE TO /api/files — the scan must never list the directory with getFiles', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();

        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
        // A file-api listing of the archive directory answers without any `.zip`
        // child, so a cross-check against it can only ever delete real archives.
        expect(mockGetFiles).not.toHaveBeenCalled();
    });
});

describe('fetchLocalArchiveEntries — a healthy scan', () => {
    test('one archive becomes one card', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].name).toBe('pkg-a');
        expect(entries[0].latest_version).toBe('1.2.3');
        // A CARD, AND NOTHING ELSE. No archive path is published: the install
        // re-finds the zip from name+version on the server.
        expect(JSON.stringify(entries)).not.toContain(ARCHIVE_WORK_DIR);
        expect(JSON.stringify(entries)).not.toContain('.zip');
    });

    // The whole reason local entries go through mapHubEntry: `description` is
    // top-level on the entry and nested under github on the card, and the search
    // box calls github.description.toLowerCase() with no guard.
    test('description lands on github.description', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries[0].github.description).toBe('pkg-a description');
        expect(() => entries[0].github.description.toLowerCase()).not.toThrow();
    });

    // package.json's `description` is OPTIONAL (neo-pkg-opcua-client 1.0.8 and
    // neo-pkg-replication 1.0.6 both omit it). The card must still exist AND
    // still be searchable.
    test('a package.json with no description still produces a searchable card', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a', { description: undefined })]));

        const entries = await fetchLocalArchiveEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].name).toBe('pkg-a');
        expect(entries[0].github.description).toBe('');
        expect(() => entries[0].github.description.toLowerCase()).not.toThrow();
    });

    test('every version row is tagged source: local', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries[0].versions).toEqual([{ version: '1.2.3', minServer: '8.5.0', source: 'local' }]);
    });

    // package.json states exactly ONE version, so an archive contributes exactly
    // one row. Nothing may synthesize a release history: offering an install for
    // a version nobody downloaded is the failure this feature prevents.
    test('versions[] holds the archived version alone', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries[0].versions?.map((v) => v.version)).toEqual(['1.2.3']);
    });

    test('minServerVersion reaches the version row as minServer, and an absent one reads as "no constraint"', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a', { minServer: '8.7.0' }), scanned('pkg-b', { minServer: undefined })]));

        const entries = await fetchLocalArchiveEntries();
        const byName = new Map(entries.map((e) => [e.name, e]));
        expect(byName.get('pkg-a')?.versions?.[0].minServer).toBe('8.7.0');
        expect(byName.get('pkg-b')?.versions?.[0].minServer).toBe('');
    });

    test('several archives of one package fold into a single card, newest first', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a'), scanned('pkg-a', { version: '2.0.0', archive: 'pkg-a-2.0.0.zip' })]));

        const entries = await fetchLocalArchiveEntries();

        expect(entries).toHaveLength(1);
        expect(entries[0].versions?.map((v) => v.version)).toEqual(['2.0.0', '1.2.3']);
        expect(entries[0].latest_version).toBe('2.0.0');
    });

    test('a repeated name+version keeps the first occurrence only', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a'), scanned('pkg-a', { description: 'second wins?', archive: 'copy.zip' })]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].versions).toHaveLength(1);
        expect(entries[0].github.description).toBe('pkg-a description');
    });

    test('an empty directory yields an empty catalog, not an error', async () => {
        mockRunScript.mockResolvedValue(scanOk([]));

        await expect(fetchLocalArchiveEntries()).resolves.toEqual([]);
        expect(getLastArchiveScanErrors()).toEqual([]);
    });
});

describe('fetchLocalArchiveEntries — one bad archive costs exactly itself', () => {
    test('a corrupt zip is reported and the healthy ones still render', async () => {
        mockRunScript.mockResolvedValue(scanOk([{ archive: 'broken.zip', error: 'zip: not a valid zip file' }, scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();

        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
        expect(getLastArchiveScanErrors()).toEqual([{ archive: 'broken.zip', error: 'zip: not a valid zip file' }]);
    });

    test('a zip with no <root>/package.json produces no card', async () => {
        mockRunScript.mockResolvedValue(scanOk([{ archive: 'random.zip', error: 'no <root>/package.json' }]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries).toEqual([]);
    });

    test('a package.json without name/version is dropped and reported as incomplete', async () => {
        mockRunScript.mockResolvedValue(scanOk([{ archive: 'half.zip', name: 'pkg-x' }, scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
        expect(getLastArchiveScanErrors()).toEqual([{ archive: 'half.zip', error: 'incomplete package.json (name/version missing)' }]);
    });

    // A package.json carries no github block at all, so this is the NORMAL path,
    // not a degraded one: every local card gets the empty block.
    test('the absent github block is filled with safe defaults rather than dropped', async () => {
        mockRunScript.mockResolvedValue(scanOk([{ archive: 'bare.zip', name: 'bare', version: '1.0.0' }]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries[0].name).toBe('bare');
        expect(entries[0].github.description).toBe('');
        expect(entries[0].github.license).toBeNull();
        expect(entries[0].github.full_name).toBe('');
    });
});

describe('fetchLocalArchiveEntries — the scan itself fails', () => {
    test('a failed script is an empty catalog, not a throw, and is distinguishable from "no archives"', async () => {
        mockRunScript.mockResolvedValue({ ok: false, log: 'boom', reason: 'script failed' });

        await expect(fetchLocalArchiveEntries()).resolves.toEqual([]);
        // Empty `archive` = the whole scan failed, not one file.
        expect(getLastArchiveScanErrors()).toEqual([{ archive: '', error: 'script failed' }]);
    });

    test('a thrown transport error is an empty catalog too', async () => {
        mockRunScript.mockRejectedValue(new Error('network down'));

        await expect(fetchLocalArchiveEntries()).resolves.toEqual([]);
        expect(getLastArchiveScanErrors()).toEqual([{ archive: '', error: 'network down' }]);
    });

    test('output that is not JSON at all degrades to empty', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: 'ERROR: something the runtime printed' });

        await expect(fetchLocalArchiveEntries()).resolves.toEqual([]);
    });
});

describe('parseArchiveScan — output shapes', () => {
    test('accepts the single-row JSON array the script yields', () => {
        const { archives, errors } = parseArchiveScan(JSON.stringify([scanned('pkg-a')]));
        expect(archives.map((a) => a.archive)).toEqual(['pkg-a.zip']);
        expect(errors).toEqual([]);
    });

    test('also accepts line-delimited records, so an extra $.yield cannot blank the catalog', () => {
        const log = [JSON.stringify(scanned('pkg-a')), 'not json at all', JSON.stringify({ archive: 'x.zip', error: 'bad' })].join('\n');

        const { archives, errors } = parseArchiveScan(log);
        expect(archives.map((a) => a.name)).toEqual(['pkg-a']);
        expect(errors).toEqual([{ archive: 'x.zip', error: 'bad' }]);
    });

    test.each([
        ['empty log', ''],
        ['non-string', 42],
        ['a JSON scalar', '7'],
    ])('%s → nothing, without throwing', (_label, log) => {
        // `installedDirs` is always an object (never undefined): "nothing was said"
        // and "nothing is wrong" have to act the same, and an empty map is what
        // every consumer can index into without a guard.
        expect(parseArchiveScan(log)).toEqual({ archives: [], errors: [], localOnly: false, installedDirs: {} });
    });
});

// ---------------------------------------------------------------------------
// LOCAL-ONLY MODE (issue #1452)
// ---------------------------------------------------------------------------
// `/public/.pkg-conf.json` turns the external package hub off for this server. It
// rides along with the archive scan because it lives in the SAME directory the
// scan already walks — zero extra round trips, and one atomic answer.
//
// THE FILE CANNOT BE FOUND WITH THE FILE API. Measured on v8.5.10-snapshot:
// `POST /api/files/_t/.pkg-conf.json` creates it, `GET` by exact name reads it
// back, and `GET /api/files/_t/` lists NOTHING — dot files are excluded from
// directory listings. So discovery has to happen server-side, in this script.
describe('SCAN_SCRIPT — the local-only policy file', () => {
    const withConf = (raw: string) => runScanScript({ 'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] } }, { raw });

    test('the script reads the fixed path itself — no parameter, no TS constant', () => {
        expect(SCAN_SCRIPT).toContain('var PKG_CONF_PATH = ARCHIVE_DIR + ".pkg-conf.json";');
        expect(SCAN_SCRIPT).not.toContain('param("conf")');
    });

    test('NO FILE AT ALL ⇒ online (the default every existing server is in)', () => {
        const { scan } = runScanScript({ 'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] } });

        expect(scan.localOnly).toBe(false);
        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
    });

    test('{"localOnly":true} ⇒ localOnly, and the archives still come back', () => {
        const { scan } = withConf(JSON.stringify({ localOnly: true }));

        expect(scan.localOnly).toBe(true);
        // The flag switches the HUB off, not the local catalog — the whole point is
        // that the locally archived packages remain installable.
        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([]);
    });

    // ONE RULE, ONE SPELLING. A permissive reader here is the dangerous direction:
    // it would let a stray file convince a connected site it is air-gapped.
    test.each([
        ['explicit false', '{"localOnly":false}'],
        ['the key missing entirely', '{"somethingElse":true}'],
        ['a typo in the key', '{"localonly":true}'],
        ['the string "true"', '{"localOnly":"true"}'],
        ['the number 1', '{"localOnly":1}'],
        ['an empty object', '{}'],
        ['an empty file', ''],
        ['malformed json', '{ localOnly: true'],
        ['a JSON array', '[{"localOnly":true}]'],
        ['a JSON scalar', 'true'],
    ])('%s ⇒ online', (_label, raw) => {
        expect(withConf(raw).scan.localOnly).toBe(false);
    });

    // A TYPO FAILS OPEN AND SILENTLY. That is the accepted cost of a single
    // unambiguous rule — and precisely why the banner states the resolved mode
    // instead of only appearing when something is wrong.
    test('an unreadable file ⇒ online, and the scan still returns its archives', () => {
        const { scan } = runScanScript(
            { 'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] } },
            { readThrows: true }
        );

        expect(scan.localOnly).toBe(false);
        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
    });

    // It sits in the archive directory, so readdirSync reports it — and it must be
    // ignored as quietly as a README, never reported as a broken archive.
    test('the conf file itself never becomes an archive or an error record', () => {
        const { scan } = runScanScript({ '.pkg-conf.json': {}, 'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] } }, {
            raw: JSON.stringify({ localOnly: true }),
        });

        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([]);
        expect(scan.localOnly).toBe(true);
    });

    test('an empty archive directory in local-only mode is still local-only', () => {
        const { scan } = runScanScript({}, { raw: JSON.stringify({ localOnly: true }) });

        expect(scan.localOnly).toBe(true);
        expect(scan.archives).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// THE INSTALLED COPIES' ICON FILE NAMES (issue #1452)
// ---------------------------------------------------------------------------
// The browser used to hardcode `/public/{name}/icon.png`. Measured on the real
// server the extension is NOT uniform:
//
//   /public/neo-pkg-opcua-client/icon.png
//   /public/neo-pkg-dbus/icon.svg          ← the guess 404s, glyph only
//
// and in local-only mode there is no remote candidate left to recover with. The
// scan is already walking that directory, so it reports the REAL file name and
// the browser stops guessing.
describe('SCAN_SCRIPT — installedIcons, the real icon file names', () => {
    /** An installed package directory holding `files`. */
    const installed = (files: string[]): FakeScanArchive => ({ isDir: true, dirFiles: files });

    test('THE REGRESSION: an installed package with icon.svg is reported as icon.svg', () => {
        const { scan } = runScanScript({ 'neo-pkg-dbus': installed(['package.json', 'icon.svg', 'README.md']) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
    });

    test('icon.png is reported just the same — the old guess was right for this one', () => {
        const { scan } = runScanScript({ 'neo-pkg-opcua-client': installed(['package.json', 'icon.png']) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-opcua-client': 'icon.png' });
    });

    // ONE SLOT ON THE CARD, so several icons must resolve to exactly one name.
    test('both present ⇒ svg wins (it scales to the 42px list thumb AND the 100px detail thumb)', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['icon.png', 'icon.svg']) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-a': 'icon.svg' });
    });

    test('the priority does not depend on readdir order', () => {
        const forward = runScanScript({ 'neo-pkg-a': installed(['icon.gif', 'icon.jpg', 'icon.png', 'icon.svg']) });
        const reverse = runScanScript({ 'neo-pkg-a': installed(['icon.svg', 'icon.png', 'icon.jpg', 'icon.gif']) });

        expect(forward.scan.installedIcons).toEqual({ 'neo-pkg-a': 'icon.svg' });
        expect(reverse.scan.installedIcons).toEqual({ 'neo-pkg-a': 'icon.svg' });
    });

    test('png beats the lossy formats when there is no svg', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['icon.webp', 'icon.jpeg', 'icon.png']) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-a': 'icon.png' });
    });

    test.each([['icon.jpg'], ['icon.jpeg'], ['icon.webp'], ['icon.gif'], ['icon.ico']])('%s is recognised too', (file) => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['package.json', file]) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-a': file });
    });

    // "NO ICON" AND "DON'T KNOW" ARE DIFFERENT ANSWERS, and the browser acts on
    // the difference: an absent key means render the glyph and fire NO request.
    test('a package with no icon gets NO KEY — not an empty string, not icon.png', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['package.json', 'README.md']) });

        expect(scan.installedIcons).toEqual({});
        expect(scan.installedIcons).not.toHaveProperty('neo-pkg-a');
    });

    test('an empty directory gets no key either', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed([]) });

        expect(scan.installedIcons).toEqual({});
    });

    // The name must be `icon.<ext>` exactly: a package's own artwork is not the
    // card's icon, and a directory called `icon.png` is not a file.
    test('files that merely mention "icon" are not the icon', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['favicon.png', 'icon-large.png', 'icons.svg', 'icon', 'my.icon.png']) });

        expect(scan.installedIcons).toEqual({});
    });

    test('the extension match is case-insensitive', () => {
        const { scan } = runScanScript({ 'neo-pkg-a': installed(['ICON.PNG']) });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-a': 'ICON.PNG' });
    });

    test('archives are files, so they never appear in installedIcons', () => {
        const { scan } = runScanScript({
            'neo-pkg-dbus.zip': DBUS_ARCHIVE,
            'neo-pkg-dbus': installed(['icon.svg']),
        });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
        expect(scan.archives.map((a) => a.archive)).toEqual(['neo-pkg-dbus.zip']);
    });

    // FAILURE IS PER PACKAGE — the whole point of the try/catch inside the loop.
    test('an unreadable package directory costs that package only', () => {
        const { scan } = runScanScript({
            'neo-pkg-locked': { isDir: true, dirReadThrows: true },
            'neo-pkg-ok': installed(['icon.svg']),
        });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-ok': 'icon.svg' });
    });

    test('an unstattable entry costs that package only', () => {
        const { scan } = runScanScript({
            'neo-pkg-gone': { isDir: true, statThrows: true },
            'neo-pkg-ok': installed(['icon.png']),
        });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-ok': 'icon.png' });
    });

    test('several installed packages are reported together, and the archive scan is untouched', () => {
        const { scan } = runScanScript({
            'neo-pkg-dbus': installed(['icon.svg']),
            'neo-pkg-opcua-client': installed(['icon.png']),
            'neo-pkg-plain': installed(['package.json']),
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg', 'neo-pkg-opcua-client': 'icon.png' });
        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([]);
    });

    test('an empty /public/ answers an EMPTY MAP — "looked, found none", not "unknown"', () => {
        const { scan } = runScanScript({});

        expect(scan.installedIcons).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// WHAT EACH INSTALLED DIRECTORY SAYS ABOUT ITSELF (issue #1452)
// ---------------------------------------------------------------------------
// Unpacking `neo-pkg-foo.tar.gz` by hand leaves `/public/neo-pkg-foo-main/` — the
// archive's own `{repo}-{branch}` root. It looks installed and is not: no
// `scripts.install` ran, so no service was registered. The scan is already inside
// that directory for the icon, so it reads the two things that can tell the story:
// the package.json's own `name` (plus version/description, for the card) and
// whether a `.git` sits beside it (a working clone, not an unpacked archive).
//
// THE SCAN ONLY REPORTS. Which directory is a stray, a clone or somebody else's is
// decided by `classifyInstalledDir` (strayDirs.ts) — see `strayDirs.test.ts`.
describe('SCAN_SCRIPT — installedNames / installedDirs', () => {
    /** An installed package directory: its files, and what its package.json claims. */
    const installed = (dirFiles: string[], pkgJson?: FakeScanArchive['pkgJson']): FakeScanArchive => ({ isDir: true, dirFiles, pkgJson });

    test('THE CASE: a hand-unpacked {repo}-{branch} directory is reported in full', () => {
        const { scan } = runScanScript({
            'neo-pkg-foo-main': installed(['package.json', 'icon.svg'], { name: 'neo-pkg-foo', version: '1.0.0', description: 'a demo' }),
        });

        expect(scan.installedNames).toEqual({ 'neo-pkg-foo-main': 'neo-pkg-foo' });
        expect(scan.installedDirs).toEqual({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo', version: '1.0.0', description: 'a demo', git: false } });
        // NO WARNING ANY MORE. It becomes a card instead — the same finding in two
        // places is how a user reads an accusation about a directory they removed.
        expect(scan.errors).toEqual([]);
    });

    test('a properly installed package (dir name === package name) is reported the same way', () => {
        const { scan } = runScanScript({
            'neo-pkg-dbus': installed(['package.json', 'icon.svg'], { name: 'neo-pkg-dbus', version: '1.0.0' }),
        });

        expect(scan.installedNames).toEqual({ 'neo-pkg-dbus': 'neo-pkg-dbus' });
        expect(scan.installedDirs['neo-pkg-dbus']).toMatchObject({ name: 'neo-pkg-dbus', version: '1.0.0' });
        expect(scan.errors).toEqual([]);
        // …and everything else about that directory is unchanged.
        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
    });

    // THE BIT THAT DECIDES WHETHER A REMOVE BUTTON APPEARS. A GitHub source archive
    // carries no `.git`; a developer's clone does, and deleting one destroys work.
    test('a directory holding .git is reported as a clone', () => {
        const { scan } = runScanScript({
            'neo-pkg-foo-dev': { isDir: true, dirFiles: ['package.json'], pkgJson: { name: 'neo-pkg-foo' }, git: true },
        });

        expect(scan.installedDirs['neo-pkg-foo-dev'].git).toBe(true);
    });

    test('.git is probed by name, not looked for in the listing', () => {
        // A runtime is free to hide dot entries from readdirSync; a missed `.git`
        // would silently promote a clone to "removable".
        const { scan } = runScanScript({
            'neo-pkg-foo-dev': { isDir: true, dirFiles: ['package.json'], pkgJson: { name: 'neo-pkg-foo' }, git: true },
        });

        expect(scan.installedDirs['neo-pkg-foo-dev'].git).toBe(true);
        expect(SCAN_SCRIPT).toContain('/.git');
    });

    // AN INTERRUPTED `pkg copy` HAS NO package.json, and its card is the only way
    // to uninstall it. No key, no reclassification, no behaviour change.
    test.each([
        ['no package.json at all', undefined, false],
        ['an unreadable package.json', undefined, true],
        ['malformed json', '{ not json', false],
        ['a manifest with no name', JSON.stringify({ version: '1.0.0' }), false],
        ['a name that is not a string', JSON.stringify({ name: 42 }), false],
        ['an empty name', JSON.stringify({ name: '' }), false],
    ])('%s ⇒ NO key at all', (_label, pkgJson, pkgJsonThrows) => {
        const { scan } = runScanScript({
            'neo-pkg-half': { isDir: true, dirFiles: ['README.md'], pkgJson: pkgJson as string | undefined, pkgJsonThrows: pkgJsonThrows as boolean },
        });

        expect(scan.installedNames).toEqual({});
        expect(scan.installedDirs).toEqual({});
        expect(scan.errors).toEqual([]);
    });

    // version / description are OPTIONAL in package.json — both packages measured
    // on a real server ship without a description.
    test('a manifest with only a name still produces an entry', () => {
        const { scan } = runScanScript({ 'neo-pkg-foo-main': installed(['package.json'], { name: 'neo-pkg-foo' }) });

        expect(scan.installedDirs['neo-pkg-foo-main']).toEqual({ name: 'neo-pkg-foo', git: false });
    });

    // Same runtime quirk as every other file this script reads: "utf8" may still
    // answer with an ArrayBuffer, and `String(arrayBuffer)` is "[object ArrayBuffer]".
    test('an ArrayBuffer package.json decodes — the bug that rejected every real archive', () => {
        const { scan } = runScanScript({
            'neo-pkg-foo-main': installed(['package.json'], asArrayBuffer(JSON.stringify({ name: 'neo-pkg-foo', version: '1.0.0' }))),
        });

        expect(scan.installedDirs['neo-pkg-foo-main']).toMatchObject({ name: 'neo-pkg-foo', version: '1.0.0' });
    });

    test('the report is per directory: healthy neighbours are untouched', () => {
        const { scan } = runScanScript({
            'neo-pkg-dbus': installed(['icon.svg', 'package.json'], { name: 'neo-pkg-dbus' }),
            'neo-pkg-foo-main': installed(['package.json'], { name: 'neo-pkg-foo' }),
            'good.zip': { entries: [pkgJsonEntry('good-main/package.json', { name: 'good', version: '1.0.0' })] },
        });

        expect(Object.keys(scan.installedDirs).sort()).toEqual(['neo-pkg-dbus', 'neo-pkg-foo-main']);
        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
        expect(scan.archives.map((a) => a.name)).toEqual(['good']);
        expect(scan.errors).toEqual([]);
    });

    test('archives are files, so they never appear in installedDirs', () => {
        const { scan } = runScanScript({ 'neo-pkg-dbus.zip': DBUS_ARCHIVE });

        expect(scan.installedNames).toEqual({});
        expect(scan.installedDirs).toEqual({});
    });
});

describe('normalizeInstalledDirs — the wire format, in isolation', () => {
    test('name is required; version / description / git are optional', () => {
        expect(normalizeInstalledDirs({ 'neo-pkg-a': { name: 'neo-pkg-a' }, 'neo-pkg-b': { version: '1.0.0' } })).toEqual({
            'neo-pkg-a': { name: 'neo-pkg-a' },
        });
    });

    test('the whole record survives', () => {
        expect(normalizeInstalledDirs({ d: { name: 'n', version: '1.0.0', description: 'x', git: true } })).toEqual({
            d: { name: 'n', version: '1.0.0', description: 'x', git: true },
        });
    });

    // THE THREE-VALUED `git` BIT. Only a real boolean counts: coercing "false" or a
    // missing key into `false` would offer a Remove button for a working clone.
    test.each([['a string "false"', 'false'], ['a number', 0], ['null', null], ['absent', undefined]])(
        '%s does not become a git verdict',
        (_label, git) => {
            const out = normalizeInstalledDirs({ d: { name: 'n', git } })!;
            expect(out.d.git).toBeUndefined();
        }
    );

    test('a field that is not an object at all reads as "the scan said nothing"', () => {
        expect(normalizeInstalledDirs(undefined)).toBeUndefined();
        expect(normalizeInstalledDirs('nope')).toBeUndefined();
        expect(normalizeInstalledDirs([{ name: 'n' }])).toBeUndefined();
    });

    test('an empty object stays an empty map — "looked, found none"', () => {
        expect(normalizeInstalledDirs({})).toEqual({});
    });
});

describe('dirsFromInstalledNames — the older-script-body fallback', () => {
    test('names alone still name the directories', () => {
        expect(dirsFromInstalledNames({ 'neo-pkg-foo-main': 'neo-pkg-foo' })).toEqual({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo' } });
    });

    // THE POINT OF THE FALLBACK: it can never make anything removable, because the
    // `.git` bit simply is not there to be read.
    test('no entry carries a git verdict', () => {
        const out = dirsFromInstalledNames({ 'neo-pkg-foo-main': 'neo-pkg-foo' });
        expect(out['neo-pkg-foo-main'].git).toBeUndefined();
    });

    test('an absent map yields an empty one', () => {
        expect(dirsFromInstalledNames(undefined)).toEqual({});
        expect(dirsFromInstalledNames({})).toEqual({});
    });

    test('empty halves are dropped', () => {
        expect(dirsFromInstalledNames({ 'neo-pkg-a': '', '': 'neo-pkg-b' } as Record<string, string>)).toEqual({});
    });
});

describe('parseArchiveScan — installedDirs', () => {
    test('the field survives the envelope', () => {
        const scan = parseArchiveScan(JSON.stringify({ localOnly: false, archives: [], installedDirs: { d: { name: 'neo-pkg-foo', git: false } } }));

        expect(scan.installedDirs).toEqual({ d: { name: 'neo-pkg-foo', git: false } });
    });

    // AN OLDER SCRIPT BODY reports names only. A directory we can still name is
    // worth a card, so the names are lifted — minus the `.git` bit, which nobody
    // measured and which therefore must not read as `false`.
    test('an envelope with only installedNames falls back to it', () => {
        const scan = parseArchiveScan(JSON.stringify({ localOnly: false, archives: [], installedNames: { 'neo-pkg-foo-main': 'neo-pkg-foo' } }));

        expect(scan.installedDirs).toEqual({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo' } });
        // …and NO warning: the classification decides what to say about it.
        expect(scan.errors).toEqual([]);
    });

    test('installedDirs wins when both are present', () => {
        const scan = parseArchiveScan(
            JSON.stringify({
                localOnly: false,
                archives: [],
                installedNames: { 'neo-pkg-foo-main': 'stale-name' },
                installedDirs: { 'neo-pkg-foo-main': { name: 'neo-pkg-foo', git: false } },
            })
        );

        expect(scan.installedDirs).toEqual({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo', git: false } });
    });

    test('an envelope with neither is an empty map, never undefined', () => {
        expect(parseArchiveScan(JSON.stringify({ localOnly: false, archives: [] })).installedDirs).toEqual({});
    });

    test('the legacy bare array is silent too', () => {
        expect(parseArchiveScan(JSON.stringify([scanned('pkg-a')])).installedDirs).toEqual({});
    });

    test('archive errors are untouched by any of this', () => {
        const scan = parseArchiveScan(
            JSON.stringify({
                localOnly: false,
                archives: [{ archive: 'broken.zip', error: 'not a valid archive' }],
                installedDirs: { 'neo-pkg-foo-main': { name: 'neo-pkg-foo' } },
            })
        );

        expect(scan.errors.map((e) => e.archive)).toEqual(['broken.zip']);
    });
});

describe('getInstalledDirs — the cached side channel', () => {
    test('empty before any scan has run', () => {
        expect(getInstalledDirs()).toEqual({});
    });

    test('a completed scan publishes the map', async () => {
        mockRunScript.mockResolvedValue({
            ok: true,
            log: JSON.stringify({ localOnly: false, archives: [], installedDirs: { 'neo-pkg-foo-main': { name: 'neo-pkg-foo', git: false } } }),
        });

        await fetchLocalArchiveEntries();

        expect(getInstalledDirs()).toEqual({ 'neo-pkg-foo-main': { name: 'neo-pkg-foo', git: false } });
        // The directory is NOT reported as a problem any more — it is a card.
        expect(getLastArchiveScanErrors()).toEqual([]);
    });

    test('invalidating the cache forgets it — an un-run scan judges nobody', async () => {
        mockRunScript.mockResolvedValue({
            ok: true,
            log: JSON.stringify({ localOnly: false, archives: [], installedDirs: { 'neo-pkg-foo-main': { name: 'neo-pkg-foo' } } }),
        });
        await fetchLocalArchiveEntries();

        invalidateLocalArchiveCache();

        expect(getInstalledDirs()).toEqual({});
    });

    test('a failed scan answers an empty map', async () => {
        mockRunScript.mockResolvedValue({ ok: false, log: '', reason: 'script failed' });

        await fetchLocalArchiveEntries();

        expect(getInstalledDirs()).toEqual({});
    });
});

describe('parseArchiveScan — installedIcons', () => {
    test('the field survives the envelope', () => {
        const scan = parseArchiveScan(JSON.stringify({ localOnly: false, archives: [], installedIcons: { 'neo-pkg-dbus': 'icon.svg' } }));

        expect(scan.installedIcons).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
    });

    // AN OLDER SCRIPT BODY (a cached bundle, a hand-run scan) says nothing about
    // icons. That must read as UNKNOWN — `undefined` — because "no icons exist"
    // would blank the icon of every installed package on that server.
    test('an envelope without the field is undefined, NOT an empty map', () => {
        expect(parseArchiveScan(JSON.stringify({ localOnly: false, archives: [] })).installedIcons).toBeUndefined();
    });

    test('the legacy bare array is undefined too', () => {
        expect(parseArchiveScan(JSON.stringify([scanned('pkg-a')])).installedIcons).toBeUndefined();
    });

    test('an empty map is preserved as an empty map — the scan looked and found none', () => {
        expect(parseArchiveScan(JSON.stringify({ localOnly: false, archives: [], installedIcons: {} })).installedIcons).toEqual({});
    });

    test('non-object garbage reads as unknown rather than as "no icons"', () => {
        expect(parseArchiveScan(JSON.stringify({ archives: [], installedIcons: 'nope' })).installedIcons).toBeUndefined();
        expect(parseArchiveScan(JSON.stringify({ archives: [], installedIcons: null })).installedIcons).toBeUndefined();
    });

    test('individual non-string values are dropped, the usable pairs survive', () => {
        const scan = parseArchiveScan(JSON.stringify({ archives: [], installedIcons: { a: 'icon.svg', b: 7, c: '', d: null } }));

        expect(scan.installedIcons).toEqual({ a: 'icon.svg' });
    });
});

describe('getInstalledIcons — the cached side channel', () => {
    test('undefined before any scan has run', () => {
        expect(getInstalledIcons()).toBeUndefined();
    });

    test('a completed scan publishes the map', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: JSON.stringify({ localOnly: false, archives: [], installedIcons: { 'neo-pkg-dbus': 'icon.svg' } }) } as any);

        await fetchLocalArchiveEntries();

        expect(getInstalledIcons()).toEqual({ 'neo-pkg-dbus': 'icon.svg' });
    });

    test('invalidating the cache forgets it — an un-run scan must never claim knowledge', async () => {
        mockRunScript.mockResolvedValue({ ok: true, log: JSON.stringify({ localOnly: false, archives: [], installedIcons: { a: 'icon.svg' } }) } as any);
        await fetchLocalArchiveEntries();

        invalidateLocalArchiveCache();

        expect(getInstalledIcons()).toBeUndefined();
    });

    test('a failed scan answers undefined, so the icon chain keeps its fallback', async () => {
        mockRunScript.mockResolvedValue({ ok: false, reason: 'TQL unreachable' } as any);

        await fetchLocalArchiveEntries();

        expect(getInstalledIcons()).toBeUndefined();
    });
});

describe('parseArchiveScan — the envelope and the legacy array', () => {
    test('the envelope carries both the flag and the archives', () => {
        const scan = parseArchiveScan(JSON.stringify({ localOnly: true, archives: [scanned('pkg-a')] }));

        expect(scan.localOnly).toBe(true);
        expect(scan.archives.map((a) => a.name)).toEqual(['pkg-a']);
    });

    // BACKWARD COMPATIBILITY. SCAN_SCRIPT is a string in the bundle, so an older
    // cached build can hand this shape to today's parser. It must keep producing
    // cards, and must read as online rather than as "flag missing ⇒ who knows".
    test('a bare array (the original shape) still parses, as online', () => {
        const scan = parseArchiveScan(JSON.stringify([scanned('pkg-a'), { archive: 'x.zip', error: 'bad' }]));

        expect(scan.localOnly).toBe(false);
        expect(scan.archives.map((a) => a.name)).toEqual(['pkg-a']);
        expect(scan.errors).toEqual([{ archive: 'x.zip', error: 'bad' }]);
    });

    test('an envelope with no archives key is still read as policy, not as a bad record', () => {
        const scan = parseArchiveScan(JSON.stringify({ localOnly: true }));

        expect(scan.localOnly).toBe(true);
        expect(scan.archives).toEqual([]);
        expect(scan.errors).toEqual([]);
    });

    test('a non-true localOnly in the envelope is online', () => {
        expect(parseArchiveScan(JSON.stringify({ localOnly: 'true', archives: [] })).localOnly).toBe(false);
        expect(parseArchiveScan(JSON.stringify({ archives: [] })).localOnly).toBe(false);
    });

    test('the line-by-line fallback also recovers the flag', () => {
        const log = ['noise the runtime printed', JSON.stringify({ localOnly: true, archives: [scanned('pkg-a')] })].join('\n');

        const scan = parseArchiveScan(log);
        expect(scan.localOnly).toBe(true);
        expect(scan.archives.map((a) => a.name)).toEqual(['pkg-a']);
    });
});

describe('isLocalOnlyMode — the cached side channel', () => {
    test('false before any scan has run', () => {
        expect(isLocalOnlyMode()).toBe(false);
    });

    test('reflects the last completed scan', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')], true));

        await fetchLocalArchiveEntries();
        expect(isLocalOnlyMode()).toBe(true);
    });

    test('a legacy bare-array scan reads as online', async () => {
        mockRunScript.mockResolvedValue(scanLegacy([scanned('pkg-a')]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
        expect(isLocalOnlyMode()).toBe(false);
    });

    // FAILING CLOSED WOULD BE A BUG: a TQL hiccup must not masquerade as an
    // air-gap policy and hide the entire hub catalog.
    test('a failed scan is online, never local-only', async () => {
        mockRunScript.mockResolvedValue({ ok: false, log: '', reason: 'script failed' });

        await fetchLocalArchiveEntries();
        expect(isLocalOnlyMode()).toBe(false);
    });

    test('invalidating the cache resets it to online until the next scan lands', async () => {
        mockRunScript.mockResolvedValue(scanOk([], true));
        await fetchLocalArchiveEntries();
        expect(isLocalOnlyMode()).toBe(true);

        invalidateLocalArchiveCache();
        expect(isLocalOnlyMode()).toBe(false);

        await fetchLocalArchiveEntries();
        expect(isLocalOnlyMode()).toBe(true);
    });

    test('turning the policy off is picked up by the next refresh', async () => {
        mockRunScript.mockResolvedValue(scanOk([], true));
        await fetchLocalArchiveEntries();

        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')], false));
        await refreshLocalArchives();

        expect(isLocalOnlyMode()).toBe(false);
    });
});

describe('normalizeArchiveEntry — single-record validation (index.json is gone)', () => {
    test.each([
        ['no archive', { name: 'a', version: '1.0.0' }],
        ['no name', { archive: 'a.zip', version: '1.0.0' }],
        ['no version', { archive: 'a.zip', name: 'a' }],
        ['whitespace-only archive', { archive: '   ', name: 'a', version: '1.0.0' }],
        ['not an object', 'a.zip'],
        ['null', null],
    ])('%s → null', (_label, item) => {
        expect(normalizeArchiveEntry(item)).toBeNull();
    });

    test('a complete record survives with its metadata intact', () => {
        const entry = normalizeArchiveEntry(scanned('pkg-a'));
        expect(entry?.name).toBe('pkg-a');
        expect(entry?.archive).toBe('pkg-a.zip');
        expect(entry?.minServer).toBe('8.5.0');
        expect(entry?.description).toBe('pkg-a description');
    });

    test('a non-string description is normalized rather than passed to the search filter', () => {
        expect(normalizeArchiveEntry(scanned('pkg-a', { description: { oops: true } }))?.description).toBe('');
    });
});

describe('fetchLocalArchiveEntries — path traversal', () => {
    test.each([['../evil.zip'], ['/etc/x.zip'], ['a/b.zip'], ['..\\evil.zip'], ['%2e%2e%2fevil.zip']])('archive %p is discarded', async (archive) => {
        mockRunScript.mockResolvedValue(scanOk([scanned('evil', { archive }), scanned('safe', { archive: 'safe.zip' })]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries.map((e) => e.name)).toEqual(['safe']);
        expect(entries.some((e) => e.name === 'evil')).toBe(false);
    });

    test('a package name that escapes its directory is discarded too', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('../../etc', { archive: 'x.zip' })]));

        const entries = await fetchLocalArchiveEntries();
        expect(entries).toEqual([]);
    });
});

describe('buildLocalCatalog — pure fold, no transport', () => {
    test('turns a scan into cards without touching the network', () => {
        const entries = buildLocalCatalog({
            archives: [normalizeArchiveEntry(scanned('pkg-a'))!],
            errors: [],
            localOnly: false,
            installedDirs: {},
        });

        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
        expect(entries[0].versions).toEqual([{ version: '1.2.3', minServer: '8.5.0', source: 'local' }]);
        expect(mockRunScript).not.toHaveBeenCalled();
    });
});

// End to end for the ONE renamed field: package.json says `minServerVersion`,
// every consumer says `minServer`. If the rename is dropped anywhere between the
// scan script and the card, this passes silently as "no constraint" and an
// archive that cannot run on this server is offered for install.
describe('minServerVersion → minServer → computeEligibility', () => {
    const eligibilityOf = (pkgJson: Record<string, unknown>, serverVersion: string) => {
        const { scan } = runScanScript({ 'pkg.zip': { entries: [pkgJsonEntry('pkg-a-main/package.json', pkgJson)] } });
        const entries = buildLocalCatalog(scan);
        return computeEligibility(entries[0].versions ?? [], serverVersion);
    };

    test('a floor above the server marks the archived version ineligible', () => {
        const e = eligibilityOf({ name: 'pkg-a', version: '1.0.0', minServerVersion: '8.6.0' }, '8.5.10-snapshot');

        expect(e.rows[0]).toMatchObject({ version: '1.0.0', minServer: '8.6.0', eligible: false, state: 'ineligible', selectable: false });
        expect(e.defaultInstall).toBeUndefined();
    });

    test('a floor at or below the server keeps it installable', () => {
        const e = eligibilityOf({ name: 'pkg-a', version: '1.0.0', minServerVersion: '8.5.6' }, '8.5.10-snapshot');

        expect(e.rows[0]).toMatchObject({ minServer: '8.5.6', eligible: true, selectable: true });
        expect(e.defaultInstall).toBe('1.0.0');
    });

    test('no minServerVersion at all is "no constraint", never "blocked"', () => {
        const e = eligibilityOf({ name: 'pkg-a', version: '1.0.0' }, '8.5.10-snapshot');

        expect(e.rows[0]).toMatchObject({ minServer: '', eligible: true });
        expect(e.defaultInstall).toBe('1.0.0');
    });
});

// The regression this cache exists to prevent: `buildCatalog` runs on the App
// Store's 500ms search debounce, and every scan opens EVERY archive server-side
// (a real package zip is ~1.9 MB). Typing must not rescan; an explicit refresh
// must.
describe('fetchLocalArchiveEntries — scan cache', () => {
    test('repeated builds (i.e. a changing search term) reuse one scan', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        const first = await fetchLocalArchiveEntries();
        const second = await fetchLocalArchiveEntries();

        expect(mockRunScript).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
    });

    test('concurrent builds share a single round trip', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));

        await Promise.all([fetchLocalArchiveEntries(), fetchLocalArchiveEntries(), fetchLocalArchiveEntries()]);

        expect(mockRunScript).toHaveBeenCalledTimes(1);
    });

    test('invalidateLocalArchiveCache (Refresh / panel mount / after a command) forces a rescan', async () => {
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));
        await fetchLocalArchiveEntries();

        invalidateLocalArchiveCache();
        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a'), scanned('pkg-b')]));
        const entries = await fetchLocalArchiveEntries();

        expect(mockRunScript).toHaveBeenCalledTimes(2);
        expect(entries.map((e) => e.name).sort()).toEqual(['pkg-a', 'pkg-b']);
    });

    test('refreshLocalArchives rescans in one call — the external trigger for a newly registered zip', async () => {
        mockRunScript.mockResolvedValue(scanOk([]));
        await fetchLocalArchiveEntries();

        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));
        const entries = await refreshLocalArchives();

        expect(mockRunScript).toHaveBeenCalledTimes(2);
        expect(entries.map((e) => e.name)).toEqual(['pkg-a']);
    });

    test('a failed scan is not remembered forever: the next explicit refresh tries again', async () => {
        mockRunScript.mockResolvedValue({ ok: false, log: '', reason: 'script failed' });
        expect(await fetchLocalArchiveEntries()).toEqual([]);

        mockRunScript.mockResolvedValue(scanOk([scanned('pkg-a')]));
        expect((await refreshLocalArchives()).map((e) => e.name)).toEqual(['pkg-a']);
    });
});

describe('readLocalReadme', () => {
    test('reads /public/{name}/README.md as text', async () => {
        mockGetFileList.mockResolvedValue({ data: '# pkg-a\n\nhello' });

        await expect(readLocalReadme('pkg-a')).resolves.toBe('# pkg-a\n\nhello');
        expect(mockGetFileList).toHaveBeenCalledWith('', '/public/pkg-a/', 'README.md');
    });

    test('a 404 envelope is a miss, not a README whose text happens to be json', async () => {
        // The axios response interceptor resolves non-401 errors with the error
        // response, so a missing file arrives as an object body — not a throw.
        mockGetFileList.mockResolvedValue({ data: { success: false, reason: 'not found' } });

        await expect(readLocalReadme('pkg-a')).resolves.toBeNull();
    });

    test.each([
        ['an empty file', ''],
        ['a whitespace-only file', '   \n  '],
        ['a null body', null],
    ])('%s → null so the remote README can still be tried', async (_label, data) => {
        mockGetFileList.mockResolvedValue({ data });
        await expect(readLocalReadme('pkg-a')).resolves.toBeNull();
    });

    test('a rejected request → null, never a throw', async () => {
        mockGetFileList.mockRejectedValue(new Error('Network Error'));
        await expect(readLocalReadme('pkg-a')).resolves.toBeNull();
    });

    test.each([['../secret'], ['a/b'], ['']])('an unsafe app name %p is rejected without touching the api', async (name) => {
        await expect(readLocalReadme(name)).resolves.toBeNull();
        expect(mockGetFileList).not.toHaveBeenCalled();
    });
});
