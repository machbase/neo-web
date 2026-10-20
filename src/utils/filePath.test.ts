import { buildFilesUrl, encodeFilePath } from './filePath';

describe('buildFilesUrl', () => {
    it('appends the query unencoded', () => {
        expect(buildFilesUrl('/a#b', '?filter=*.sql')).toBe('/api/files/a%23b?filter=*.sql');
        expect(buildFilesUrl('/d/x', '?recursive=true')).toBe('/api/files/d/x?recursive=true');
    });
    it('no query → nothing appended', () => {
        expect(buildFilesUrl('/d/x.sql')).toBe('/api/files/d/x.sql');
        expect(buildFilesUrl('/d/x.sql', '')).toBe('/api/files/d/x.sql');
    });
    it('keeps the trailing slash (folder-creation POST is detected by it)', () => {
        expect(buildFilesUrl('d/new#1/')).toBe('/api/files/d/new%231/');
        expect(buildFilesUrl('/')).toBe('/api/files/');
    });
    it('normalizes backslashes to "/" like the old api.ts normalizePath', () => {
        expect(buildFilesUrl('\\a\\b\\x.sql')).toBe('/api/files/a/b/x.sql');
        expect(buildFilesUrl('/a\\\\b/')).toBe('/api/files/a/b/');
    });
    it('a "?" inside the path is part of the name, not a query', () => {
        expect(buildFilesUrl('/d/k?.sql')).toBe('/api/files/d/k%3F.sql');
    });
});

describe('encodeFilePath', () => {
    it('encodes each segment and keeps the slashes', () => {
        expect(encodeFilePath('/test(1/a b#%.sql')).toBe('/test(1/a%20b%23%25.sql');
    });
    it('guarantees a leading slash', () => {
        expect(encodeFilePath('a/b/x.sql')).toBe('/a/b/x.sql');
    });
    it('keeps the trailing slash of a directory', () => {
        expect(encodeFilePath('/dir/')).toBe('/dir/');
    });
    it('collapses repeated slashes', () => {
        expect(encodeFilePath('//a')).toBe('/a');
        expect(encodeFilePath('/a//b/')).toBe('/a/b/');
    });
    it('root stays root', () => {
        expect(encodeFilePath('/')).toBe('/');
        expect(encodeFilePath('')).toBe('/');
    });
    it('root boundary: a top-level directory keeps exactly one leading and one trailing slash', () => {
        expect(encodeFilePath('/public/')).toBe('/public/');
        expect(encodeFilePath('public/')).toBe('/public/');
        expect(encodeFilePath('/public')).toBe('/public');
    });
    it('encodes ? so it cannot start a query', () => {
        expect(encodeFilePath('/a?b')).toBe('/a%3Fb');
    });
    it('encodes korean', () => {
        expect(encodeFilePath('/한글/')).toBe('/' + encodeURIComponent('한글') + '/');
    });
});
