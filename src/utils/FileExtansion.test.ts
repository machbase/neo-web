import { FileNameAndExtensionValidator, FileNameValidator, PathRootValidator, isAllowedFileNameInput } from './FileExtansion';

describe('FileNameValidator (final)', () => {
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

describe('isAllowedFileNameInput (while typing)', () => {
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

describe('PathRootValidator', () => {
    it.each(['/a*b.c/x.sql', '/a#b.c/x.sql', '/a?b.c/x.sql', '/a%b.c/x.sql', '/a//b', '/../x', '/a\n.b/x.sql', '/.hidden/x.sql', '/.hidden', '/a/.x/b.sql'])('rejects %j', (aPath) => {
        expect(PathRootValidator(aPath)).toBe(false);
    });
    it.each(['/v1.2/x.sql', '/test(1/a.sql', '/', '/a/', '/a b/한글.sql', '/x(1).sql'])('accepts %j (typing "/" stays possible)', (aPath) => {
        expect(PathRootValidator(aPath)).toBe(true);
    });
});

describe('FileNameAndExtensionValidator', () => {
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
