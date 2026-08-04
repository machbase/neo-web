// issue #1452 — TEST SUPPORT ONLY. The faked server-side archive runtime that
// `SCAN_SCRIPT` and `EXTRACT_SCRIPT` are executed against.
//
// WHY IT IS SHARED. Both scripts include the same prelude, and the whole point of
// supporting `.tar.gz` was that everything after "get me the entries" stays one
// code path. If the scan suite and the extract suite each grew their own fake,
// they would drift and the shared-path claim would stop being tested. One kit,
// one four-format matrix, both suites.
//
// WHY IT IS PICKY. The fake does not just hand back entries — it insists the
// script drive the modules the way the real runtime does:
//
//   .zip           new zip.Zip(path).getEntries()
//   .tar           tar.untarSync(fs.readFileSync(path, "buffer"))
//   .tar.gz/.tgz   tar.untarSync(zlib.gunzipSync(fs.readFileSync(path, "buffer")))
//
// Reading a `.tar.gz` without gunzipping first throws here ("still gzipped"),
// opening a tar with `zip.Zip` throws, and gunzipping a plain tar throws. So a
// green test means the pipeline is actually right, not merely that some entries
// came back.
//
// MEASURED ON machbase-neo v8.5.10-snapshot (do not "simplify" these):
//   - entry `data` is an **ArrayBuffer** for zip AND tar alike — `String(data)`
//     yields "[object ArrayBuffer]", which is the bug that once rejected 100% of
//     real archives while string-fed unit tests stayed green.
//   - `tar.untarSync` entries were observed carrying `name` and `data` and
//     NOTHING confirmed beyond that: an `isDir` flag may or may not be there.
//     That is why `tarEntries()` below emits directory members with a trailing
//     slash and NO `isDir` — the fallback has to carry them.

/** The four extensions that must behave identically from `readArchiveEntries` on. */
export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz' | 'tgz';

/** An entry as `getEntries()` / `untarSync()` yields it (lower-case keys). */
export interface FakeEntry {
    name: string;
    data?: unknown;
    /** zip sets it; tar may not — hence the trailing-slash fallback under test. */
    isDir?: boolean;
}

export interface FakeArchive {
    /** Defaults to the format implied by the file name the archive is keyed under. */
    format?: ArchiveFormat;
    entries?: FakeEntry[];
    /** The container itself cannot be opened (corrupt file). */
    throws?: string;
    /**
     * Entries answered from the SECOND read on.
     *
     * The lookup reads every archive to find the root package.json and the
     * extraction reads the chosen one again, so a file replaced in between really
     * can advertise one thing and unpack another. That race is the only way to
     * reach the structural gate now that both halves parse the same manifest —
     * and it is exactly what the gate is for.
     */
    entriesOnReread?: FakeEntry[];
}

/** `package.json` bytes exactly as the server hands them over. */
export const asArrayBuffer = (text: string): ArrayBuffer => {
    const bytes = Buffer.from(text, 'utf8');
    const ab = new ArrayBuffer(bytes.length);
    new Uint8Array(ab).set(bytes);
    return ab;
};

/** Read an entry payload back as text, whatever shape it was stored in. */
export const entryText = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString('utf8');
    if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength).toString('utf8');
    if (Array.isArray(data)) return Buffer.from(data as number[]).toString('utf8');
    return String(data ?? '');
};

/**
 * Read an entry payload back as RAW BYTES, whatever shape it was stored in.
 *
 * The byte-level twin of `entryText`, and the reason it exists: a package member
 * is not text. `entryText` on `[0x89, 0x50, …]` answers U+FFFD + "P", which is
 * exactly the corruption the runtime's own copyFileSync inflicts — a fake that
 * only ever spoke text could not tell a correct writer from a broken one.
 */
export const entryBytes = (data: unknown): Uint8Array => {
    if (typeof data === 'string') return new Uint8Array(Buffer.from(data, 'utf8'));
    if (data instanceof ArrayBuffer) return new Uint8Array(data.slice(0));
    if (ArrayBuffer.isView(data)) return new Uint8Array(Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength));
    if (Array.isArray(data)) return new Uint8Array(data as number[]);
    return new Uint8Array(Buffer.from(String(data ?? ''), 'utf8'));
};

/** A file member, ArrayBuffer-encoded like the real thing. */
export const fileEntry = (name: string, body: string): FakeEntry => ({ name, data: asArrayBuffer(body) });

/**
 * A BINARY file member — an icon, a font, a shared object.
 *
 * Fixtures used to be ASCII-only, and that is precisely why the corruption
 * shipped: without a byte above 0x7F nothing distinguishes a byte-exact copy
 * from a UTF-8 round trip. Pass bytes that are NOT valid UTF-8.
 */
export const binaryEntry = (name: string, bytes: number[]): FakeEntry => {
    const ab = new ArrayBuffer(bytes.length);
    new Uint8Array(ab).set(bytes);
    return { name, data: ab };
};

/** A `package.json` member. */
export const pkgJsonEntry = (path: string, body: Record<string, unknown>): FakeEntry => fileEntry(path, JSON.stringify(body));

/** A relative tree — the same fixture shape for every format. */
export interface FakeTree {
    dirs?: string[];
    files?: Record<string, string>;
}

/** Zip-flavoured members: directories carry BOTH the trailing slash and `isDir`. */
export const zipEntries = (tree: FakeTree): FakeEntry[] => [
    ...(tree.dirs ?? []).map((d) => ({ name: `${d}/`, isDir: true })),
    ...Object.entries(tree.files ?? {}).map(([name, body]) => fileEntry(name, body)),
];

/** Tar-flavoured members: trailing slash only, NO `isDir` — the unconfirmed field. */
export const tarEntries = (tree: FakeTree): FakeEntry[] => [
    ...(tree.dirs ?? []).map((d) => ({ name: `${d}/` })),
    ...Object.entries(tree.files ?? {}).map(([name, body]) => fileEntry(name, body)),
];

/** Members in the flavour of `format` — how one fixture serves all four suites. */
export const entriesFor = (format: ArchiveFormat, tree: FakeTree): FakeEntry[] => (format === 'zip' ? zipEntries(tree) : tarEntries(tree));

/**
 * The format a file name implies, longest suffix first.
 *
 * Stated INDEPENDENTLY of the script's own table on purpose: it is the test's
 * claim about what `x.tar.gz` means, not a copy of the implementation's.
 */
export const formatOf = (fileName: string): ArchiveFormat | null => {
    const n = fileName.toLowerCase();
    if (n.length > 7 && n.endsWith('.tar.gz')) return 'tar.gz';
    if (n.length > 4 && n.endsWith('.tgz')) return 'tgz';
    if (n.length > 4 && n.endsWith('.zip')) return 'zip';
    if (n.length > 4 && n.endsWith('.tar')) return 'tar';
    return null;
};

/** File name for `stem` in `format`, e.g. ('pkg', 'tar.gz') → 'pkg.tar.gz'. */
export const archiveFileName = (stem: string, format: ArchiveFormat): string => `${stem}.${format}`;

/** Opaque stand-in for the bytes `fs.readFileSync(path, 'buffer')` returns. */
interface ArchiveBytes {
    __archive: string;
    gzipped: boolean;
}

export interface ArchiveRuntimeFake {
    /** `require('archive/zip')` */
    zipModule: { Zip: new (path: string) => { getEntries: () => FakeEntry[] } };
    /** `require('archive/tar')` */
    tarModule: { untarSync: (bytes: unknown) => FakeEntry[] };
    /** `require('zlib')` */
    zlibModule: { gunzipSync: (bytes: unknown) => ArchiveBytes };
    /** What a faked `fs.readFileSync(path, 'buffer')` must answer for an archive. */
    readBytes: (path: string) => ArchiveBytes;
    /** True when the name is one of the archives this fake holds. */
    has: (fileName: string) => boolean;
    /** How many times each archive's entries were handed out (per file name). */
    readCounts: Map<string, number>;
}

const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);

/**
 * Build the three modules (and the byte reader) for a directory of archives.
 *
 * `archives` is keyed by FILE NAME; the format comes from the key unless the
 * fixture overrides it, so renaming `pkg.zip` → `pkg.tar.gz` is all it takes to
 * re-run a scenario in another format.
 */
export const createArchiveRuntimeFake = (archives: Record<string, FakeArchive>): ArchiveRuntimeFake => {
    const readCounts = new Map<string, number>();

    const formatOfArchive = (fileName: string): ArchiveFormat | null => archives[fileName]?.format ?? formatOf(fileName);

    /** Entries for this read; `entriesOnReread` takes over from the second one. */
    const takeEntries = (fileName: string): FakeEntry[] => {
        const archive = archives[fileName];
        if (!archive) throw new Error(`no such archive: ${fileName}`);
        if (archive.throws) throw new Error(archive.throws);

        const seen = (readCounts.get(fileName) ?? 0) + 1;
        readCounts.set(fileName, seen);
        if (seen > 1 && archive.entriesOnReread) return archive.entriesOnReread;
        return archive.entries ?? [];
    };

    class Zip {
        private fileName: string;
        constructor(path: string) {
            this.fileName = baseName(path);
        }
        getEntries() {
            if (formatOfArchive(this.fileName) !== 'zip') throw new Error(`zip: ${this.fileName} is not a zip file`);
            return takeEntries(this.fileName);
        }
    }

    const asBytes = (value: unknown): ArchiveBytes => {
        const bytes = value as ArchiveBytes;
        if (!bytes || typeof bytes.__archive !== 'string') throw new Error('not archive bytes');
        return bytes;
    };

    return {
        zipModule: { Zip },
        tarModule: {
            untarSync: (value: unknown) => {
                const bytes = asBytes(value);
                // The whole reason gunzip must come first: a gzip stream is not a tar.
                if (bytes.gzipped) throw new Error(`tar: ${bytes.__archive} is still gzipped`);
                const format = formatOfArchive(bytes.__archive);
                if (format === 'zip') throw new Error(`tar: ${bytes.__archive} is not a tar file`);
                return takeEntries(bytes.__archive);
            },
        },
        zlibModule: {
            gunzipSync: (value: unknown) => {
                const bytes = asBytes(value);
                if (!bytes.gzipped) throw new Error(`zlib: ${bytes.__archive} is not gzip data`);
                return { ...bytes, gzipped: false };
            },
        },
        readBytes: (path: string) => {
            const fileName = baseName(path);
            const format = formatOfArchive(fileName);
            if (!archives[fileName]) throw new Error(`ENOENT: ${path}`);
            return { __archive: fileName, gzipped: format === 'tar.gz' || format === 'tgz' };
        },
        has: (fileName: string) => !!archives[fileName],
        readCounts,
    };
};
