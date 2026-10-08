import { FileType, RASTER_IMAGE_EXTENSIONS, SERVER_FILE_EXTENSIONS, isTypingName, isTypingPath, nameFromUrl, validateName, validatePath } from './fileName';

const ok = (v: { ok: boolean }) => v.ok;

describe('validateName — file', () => {
    it.each(['A.SQL', 'a.Sql', 'x(1).sql', 'a b.taz', '한글.dsh', 'v1.2.wrk', 'a-b_c.tql'])('accepts %j without caller-side lower-casing', (aName) => {
        expect(ok(validateName(aName, { kind: 'file' }))).toBe(true);
    });
    it.each(['', '   ', ' .sql', '\u3000.sql', '.hidden', '.sql', 'a#b.sql', 'a+b.sql', 'a\n.sql', 'a\r.sql', 'a\u2028.sql', 'a.exe', 'noext'])('rejects %j', (aName) => {
        expect(ok(validateName(aName, { kind: 'file' }))).toBe(false);
    });
    // r18: whitespace is `\s` minus line terminators — tab, NBSP and U+3000 (IME full-width space) stay allowed
    it.each(['a\tb.sql', 'a\u00a0b.sql', 'a\u3000b.sql'])('accepts whitespace %j', (aName) => {
        expect(ok(validateName(aName, { kind: 'file' }))).toBe(true);
    });
    it('compares the requested type case-insensitively', () => {
        expect(ok(validateName('x.SQL', { kind: 'file', type: 'sql' }))).toBe(true);
        expect(ok(validateName('x.sql', { kind: 'file', type: 'SQL' }))).toBe(true);
        expect(ok(validateName('x.tql', { kind: 'file', type: 'sql' }))).toBe(false);
    });
    it('returns a reason on failure', () => {
        const sVerdict = validateName('a+b.sql', { kind: 'file' });
        expect(sVerdict.ok).toBe(false);
        expect(sVerdict.ok === false && sVerdict.reason).toMatch(/not allowed/);
    });
});

describe('validateName — folder', () => {
    it.each(['a b', '한글', 'x(1)', 'v1.2', 'report.csv', 'a\tb', 'a\u00a0b', '한\u3000글'])('accepts %j', (aName) => {
        expect(ok(validateName(aName, { kind: 'folder' }))).toBe(true);
    });
    it.each(['', '   ', '\u3000', 'a\nb', 'a\r\nb', 'a\u2029b', '.hidden', 'a#b', 'a+b', 'a/b'])('rejects %j', (aName) => {
        expect(ok(validateName(aName, { kind: 'folder' }))).toBe(false);
    });
});

describe('validatePath', () => {
    it('skips empty segments (leading/trailing slash)', () => {
        expect(ok(validatePath('/a/b/', { kind: 'folder' }))).toBe(true);
        expect(ok(validatePath('/a b/X.SQL', { kind: 'file' }))).toBe(true);
        expect(ok(validatePath('/v1.2/x.sql', { kind: 'file' }))).toBe(true);
    });
    it.each(['/.hidden/x.sql', '/a#b.c/x.sql', '/a*b.c/x.sql', '/../x.sql', '/a/../x.sql', '/a//x.sql', '/', ''])('rejects %j', (aPath) => {
        expect(ok(validatePath(aPath, { kind: 'file' }))).toBe(false);
    });
    it('applies kind only to the last segment', () => {
        expect(ok(validatePath('/a.b/x', { kind: 'folder' }))).toBe(true);
        expect(ok(validatePath('/a/x', { kind: 'file' }))).toBe(false);
    });
});

describe('isTypingName / isTypingPath', () => {
    it('allows intermediate states', () => {
        expect(isTypingName('')).toBe(true);
        expect(isTypingName('a ')).toBe(true);
        expect(isTypingName('a\t')).toBe(true);
        expect(isTypingName('a\u3000')).toBe(true);
        expect(isTypingPath('')).toBe(true);
        expect(isTypingPath('/')).toBe(true);
        expect(isTypingPath('/a/')).toBe(true);
    });
    it('rejects what can never become valid', () => {
        expect(isTypingName('.x')).toBe(false);
        expect(isTypingName('a\nb')).toBe(false);
        expect(isTypingName('a\rb')).toBe(false);
        expect(isTypingName('a\u2028b')).toBe(false);
        expect(isTypingPath('a/b')).toBe(false);
        expect(isTypingPath('/a//b')).toBe(false);
        expect(isTypingPath('/../x')).toBe(false);
        expect(isTypingPath('/a#b/')).toBe(false);
    });
});

describe('nameFromUrl', () => {
    it('decodes the last segment once', () => {
        expect(nameFromUrl('https://h/My%20Data.csv', { kind: 'file' })).toEqual({ ok: true, name: 'My Data.csv' });
        expect(nameFromUrl('https://h/x/my%20repo.git', { kind: 'repo' })).toEqual({ ok: true, name: 'my repo' });
    });
    it('keeps the raw segment when it is not valid percent-encoding (then rejects it)', () => {
        expect(nameFromUrl('https://h/a%E0.csv', { kind: 'file' }).ok).toBe(false);
    });
    it('rejects names that decode to "/", "#" or "?"', () => {
        expect(nameFromUrl('https://h/a%2Fb.csv', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://h/x/re%23po.git', { kind: 'repo' }).ok).toBe(false);
        expect(nameFromUrl('https://h/x/re%3Fpo.git', { kind: 'repo' }).ok).toBe(false);
    });
    it('never takes query or fragment into the name', () => {
        expect(nameFromUrl('https://h/d/data.csv?x=1#y', { kind: 'file' })).toEqual({ ok: true, name: 'data.csv' });
        expect(nameFromUrl('https://h/x/repo#frag', { kind: 'repo' })).toEqual({ ok: true, name: 'repo' });
        expect(nameFromUrl('https://h/x/repo.git?f=a', { kind: 'repo' })).toEqual({ ok: true, name: 'repo' });
    });
    it('handles scp-style SSH and ssh:// addresses', () => {
        expect(nameFromUrl('git@github.com:org/repo.git', { kind: 'repo' })).toEqual({ ok: true, name: 'repo' });
        expect(nameFromUrl('git@h:repo.git', { kind: 'repo' })).toEqual({ ok: true, name: 'repo' });
        expect(nameFromUrl('ssh://git@h/x/r.git', { kind: 'repo' })).toEqual({ ok: true, name: 'r' });
    });
    it('rejects an empty name (trailing slash only / host only)', () => {
        expect(nameFromUrl('https://h', { kind: 'repo' }).ok).toBe(false);
        expect(nameFromUrl('https://h/', { kind: 'file' }).ok).toBe(false);
    });
    it('file kind: case-insensitive extension, keeps the name case, rejects unsupported/charset', () => {
        expect(nameFromUrl('https://h/DATA.CSV', { kind: 'file' })).toEqual({ ok: true, name: 'DATA.CSV' });
        expect(nameFromUrl('https://h/data+1.csv', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://h/x.exe', { kind: 'file' }).ok).toBe(false);
    });
    it('repo kind: dot-leading repositories are rejected', () => {
        expect(nameFromUrl('https://github.com/org/.github', { kind: 'repo' }).ok).toBe(false);
    });
    // r17: the name rule runs INSIDE nameFromUrl, for both kinds
    it('r17 plan cases: empty / .github / a%2Fb.csv → ok:false, test(1).csv → ok', () => {
        expect(nameFromUrl('https://h/x/repo/', { kind: 'repo' }).ok).toBe(true); // trailing '/' trimmed → 'repo'
        expect(nameFromUrl('', { kind: 'repo' }).ok).toBe(false);
        expect(nameFromUrl('', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://h', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://github.com/org/.github', { kind: 'repo' }).ok).toBe(false);
        expect(nameFromUrl('https://h/.github', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://h/a%2Fb.csv', { kind: 'file' }).ok).toBe(false);
        expect(nameFromUrl('https://h/test(1).csv', { kind: 'file' })).toEqual({ ok: true, name: 'test(1).csv' });
        expect(nameFromUrl('https://h/x/my%20repo.git', { kind: 'repo' })).toEqual({ ok: true, name: 'my repo' });
    });
    it('file kind with SERVER_FILE_EXTENSIONS: server-file extensions ok (case-insensitive), the rest rejected', () => {
        for (const sName of ['x.py', 'x.sh', 'x.ipynb', 'x.htm', 'x.mjs', 'img.PNG', 'a.JPEG', 'DATA.CSV', 'i.svg', 'f.ico', 'r.markdown', 'a.apng', 'x.AVIF', 'scan.tiff']) {
            expect(nameFromUrl(`https://h/${sName}`, { kind: 'file', extensions: SERVER_FILE_EXTENSIONS })).toEqual({ ok: true, name: sName });
        }
        for (const sName of ['x.pdf', 'x.yaml', 'x.zip', 'x.ts', 'x.env', 'x.tif', 'x.jsonl', '.env.csv']) {
            expect(nameFromUrl(`https://h/${sName}`, { kind: 'file', extensions: SERVER_FILE_EXTENSIONS }).ok).toBe(false);
        }
        // without the list the editor FileType applies (New file / Save As)
        expect(nameFromUrl('https://h/x.py', { kind: 'file' }).ok).toBe(false);
    });
});

describe('SERVER_FILE_EXTENSIONS / validateName extensions option', () => {
    it('is the measured list of 29, lower-case', () => {
        expect([...SERVER_FILE_EXTENSIONS]).toEqual([
            'sql', 'tql', 'taz', 'wrk', 'dsh', 'json', 'csv', 'md', 'markdown', 'txt', 'html', 'htm', 'css', 'js', 'mjs',
            'png', 'apng', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'bmp', 'ico', 'tiff', 'sh', 'py', 'ipynb',
        ]);
    });
    it('RASTER_IMAGE_EXTENSIONS are the binary server-file extensions (svg is text)', () => {
        expect(RASTER_IMAGE_EXTENSIONS.every((aT) => SERVER_FILE_EXTENSIONS.includes(aT))).toBe(true);
        expect(RASTER_IMAGE_EXTENSIONS).not.toContain('svg');
        expect([...RASTER_IMAGE_EXTENSIONS].sort()).toEqual(['apng', 'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'tiff', 'webp']);
    });
    it('includes every FileType (download never loses an editor type)', () => {
        expect(FileType.every((aT) => SERVER_FILE_EXTENSIONS.includes(aT))).toBe(true);
    });
    it('New file / Save As keep FileType: x.py rejected without the list', () => {
        expect(validateName('x.py', { kind: 'file' }).ok).toBe(false);
        expect(validateName('x.py', { kind: 'file', extensions: SERVER_FILE_EXTENSIONS }).ok).toBe(true);
    });
});

// Moved from FileExtansion.test.ts (r20): the thin FileExtansion wrappers had no production importer left and were
// removed; the same cases now call the one name rule directly.
const FileNameValidator = (aTxt: string) => validateName(aTxt, { kind: 'folder' }).ok;
const FileNameAndExtensionValidator = (aTxt: string) => validateName(aTxt, { kind: 'file' }).ok;
const isAllowedFileNameInput = isTypingName;
const PathRootValidator = isTypingPath;

describe('validateName folder — former FileNameValidator (final)', () => {
    it.each(['', '   ', '\u3000', 'a\nb', 'a\rb', 'a\u2028b', '.hidden', 'a*b', 'a/b'])('rejects %j', (aName) => {
        expect(FileNameValidator(aName)).toBe(false);
    });
    // r18: whitespace other than line terminators stays allowed (both old validators accepted `\s`)
    it.each(['a b', '한글', 'x(1)', 'v1.2', 'a-b_c', 'report.csv', 'a\tb', 'a\u00a0b', 'a\u3000b'])('accepts %j', (aName) => {
        expect(FileNameValidator(aName)).toBe(true);
    });
    it('is stateless across repeated calls (no g flag)', () => {
        expect(FileNameValidator('abc')).toBe(true);
        expect(FileNameValidator('abc')).toBe(true);
    });
});

describe('isTypingName — former isAllowedFileNameInput (while typing)', () => {
    it('allows the empty intermediate state', () => {
        expect(isAllowedFileNameInput('')).toBe(true);
    });
    it('allows a trailing space while typing', () => {
        expect(isAllowedFileNameInput('a ')).toBe(true);
    });
    it('rejects line terminators, keeps tab / NBSP / U+3000', () => {
        expect(isAllowedFileNameInput('a\nb')).toBe(false);
        expect(isAllowedFileNameInput('a\rb')).toBe(false);
        expect(isAllowedFileNameInput('a\u2029b')).toBe(false);
        expect(isAllowedFileNameInput('a\tb')).toBe(true);
        expect(isAllowedFileNameInput('a\u00a0b')).toBe(true);
        expect(isAllowedFileNameInput('a\u3000b')).toBe(true);
    });
    it('rejects a leading dot', () => {
        expect(isAllowedFileNameInput('.x')).toBe(false);
    });
});

describe('isTypingPath — former PathRootValidator', () => {
    it.each(['/a*b.c/x.sql', '/a#b.c/x.sql', '/a?b.c/x.sql', '/a%b.c/x.sql', '/a//b', '/../x', '/a\n.b/x.sql', '/.hidden/x.sql', '/.hidden', '/a/.x/b.sql'])('rejects %j', (aPath) => {
        expect(PathRootValidator(aPath)).toBe(false);
    });
    it.each(['/v1.2/x.sql', '/test(1/a.sql', '/', '/a/', '/a b/한글.sql', '/x(1).sql'])('accepts %j (typing "/" stays possible)', (aPath) => {
        expect(PathRootValidator(aPath)).toBe(true);
    });
});

describe('validateName file — former FileNameAndExtensionValidator', () => {
    it.each(['a(1).sql', 'a b.taz', 'x(1).taz', '한글.dsh', 'a-b_c.tql', 'v1.2.wrk', 'a\tb.sql', 'a\u00a0b.sql', 'a\u3000b.sql'])('accepts %j', (aName) => {
        expect(FileNameAndExtensionValidator(aName)).toBe(true);
    });
    it.each(['a.exe', 'a\n.sql', 'a\r.sql', ' .sql', '   .taz', '\u3000.sql', '.sql', 'a*.sql'])('rejects %j', (aName) => {
        expect(FileNameAndExtensionValidator(aName)).toBe(false);
    });
    it("keeps '-' a literal character (not a range from '_' to whitespace)", () => {
        expect(FileNameAndExtensionValidator('a-b.sql')).toBe(true);
        expect(FileNameAndExtensionValidator('a`b.sql')).toBe(false);
        expect(FileNameAndExtensionValidator('a^b.sql')).toBe(false);
    });
    it('is stateless across repeated calls (no g flag)', () => {
        expect(FileNameAndExtensionValidator('a.sql')).toBe(true);
        expect(FileNameAndExtensionValidator('a.sql')).toBe(true);
    });
});

// Consumers outside the file explorer share these validators. Pin their representative inputs so
// the charset unification only brings the intended change (parentheses allowed everywhere).
describe('representative inputs of out-of-plan consumers', () => {
    it('SavedToLocal (FileNameValidator)', () => {
        expect(FileNameValidator('report.csv')).toBe(true);
        expect(FileNameValidator('a b.taz')).toBe(true);
        expect(FileNameValidator('x(1).taz')).toBe(true);
        expect(FileNameValidator('')).toBe(false);
    });
    it('tagAnalyzer SaveAsModal / SaveDashboardModal (FileNameAndExtensionValidator)', () => {
        expect(FileNameAndExtensionValidator('a b.taz')).toBe(true);
        expect(FileNameAndExtensionValidator('report.csv')).toBe(true);
        // intended change: parentheses used to be rejected here
        expect(FileNameAndExtensionValidator('x(1).taz')).toBe(true);
        expect(FileNameAndExtensionValidator('x(1).dsh')).toBe(true);
    });
});
