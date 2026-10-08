import { computeMovedBoardPath, isInDropSection, isMultiSelectClick, isPathWithin } from './fileTreePath';

const dir = (path: string, name: string, extra: Record<string, any> = {}) => ({ type: 1, path, name, id: name, parentId: 'x', ...extra });
const file = (path: string, name: string, extra: Record<string, any> = {}) => ({ type: 0, path, name, id: name, parentId: 'x', ...extra });

describe('isPathWithin', () => {
    it.each(['/test(1/', '/a[b]/', '/x+y/', '/점.폴더/', '/$dollar/', '/한글 폴더/', '/a b/', '/(/', '/[/', '/*?/'])('does not throw for %s', (aPath) => {
        expect(() => isPathWithin(aPath + 'child/', aPath)).not.toThrow();
        expect(isPathWithin(aPath + 'child/', aPath)).toBe(true);
    });

    it('does not match a sibling that only shares a prefix', () => {
        expect(isPathWithin('/a/bc/x', '/a/b/')).toBe(false);
        expect(isPathWithin('/a/b/x', '/a/b/')).toBe(true);
        expect(isPathWithin('/a/b', '/a/b/')).toBe(true);
    });

    it('treats "." literally', () => {
        expect(isPathWithin('/v1x2/', '/v1.2/')).toBe(false);
    });
});

describe('isInDropSection', () => {
    it('returns false without an enter item', () => {
        expect(isInDropSection(null, file('/', 'a.sql'))).toBe(false);
    });

    it('a root file hover highlights everything', () => {
        const sEnter = file('/', 'root.sql', { parentId: '0' });
        expect(isInDropSection(sEnter, file('/deep/x/', 'y.sql'))).toBe(true);
        expect(isInDropSection(sEnter, dir('/', 'any'))).toBe(true);
    });

    it('a folder named test(1 highlights itself and its children only — no throw, no siblings', () => {
        const sEnter = dir('/', 'test(1');
        expect(() => isInDropSection(sEnter, file('/test(1/', 'a.sql'))).not.toThrow();
        expect(isInDropSection(sEnter, dir('/', 'test(1'))).toBe(true);
        expect(isInDropSection(sEnter, file('/test(1/', 'a.sql'))).toBe(true);
        expect(isInDropSection(sEnter, file('/test(1/sub/', 'b.sql'))).toBe(true);
        expect(isInDropSection(sEnter, dir('/', 'test(10'))).toBe(false);
        expect(isInDropSection(sEnter, file('/test(10/', 'c.sql'))).toBe(false);
    });

    it.each(['a[b]', 'x+y', '점.폴더', 'a b'])('handles special folder %s', (aName) => {
        const sEnter = dir('/p/', aName);
        expect(() => isInDropSection(sEnter, file(`/p/${aName}/`, 'k.sql'))).not.toThrow();
        expect(isInDropSection(sEnter, file(`/p/${aName}/`, 'k.sql'))).toBe(true);
        expect(isInDropSection(sEnter, file('/p/', 'sibling.sql'))).toBe(false);
    });

    it('a file hover highlights its parent folder row and its siblings', () => {
        const sEnter = file('/a/b/', 'f.sql', { parentId: 'b' });
        expect(isInDropSection(sEnter, dir('/a/', 'b'))).toBe(true);
        expect(isInDropSection(sEnter, file('/a/b/', 'g.sql'))).toBe(true);
        expect(isInDropSection(sEnter, dir('/a/b/', 'child'))).toBe(true);
        expect(isInDropSection(sEnter, dir('/a/', 'bc'))).toBe(false);
        expect(isInDropSection(sEnter, file('/a/', 'top.sql'))).toBe(false);
    });
});

describe('isMultiSelectClick', () => {
    it('is true for metaKey (macOS Cmd) and ctrlKey', () => {
        expect(isMultiSelectClick({ metaKey: true })).toBe(true);
        expect(isMultiSelectClick({ ctrlKey: true })).toBe(true);
    });
    it('is false without modifiers', () => {
        expect(isMultiSelectClick({})).toBe(false);
        expect(isMultiSelectClick({ metaKey: false, ctrlKey: false })).toBe(false);
        expect(isMultiSelectClick(undefined)).toBe(false);
    });
    it('the old lowercase "metakey" typo is not a modifier', () => {
        expect(isMultiSelectClick({ metakey: true } as any)).toBe(false);
    });
});

describe('computeMovedBoardPath', () => {
    const sFolderA = { type: 1, name: 'A', path: '/' };
    it('folder dropped on a file inside /B/ → /B/A/...', () => {
        expect(computeMovedBoardPath('/A/', sFolderA, '/B/')).toBe('/B/A/');
        expect(computeMovedBoardPath('/A/x/', sFolderA, '/B/')).toBe('/B/A/x/');
    });
    it('folder dropped on a folder /B/C/ → /B/C/A/', () => {
        expect(computeMovedBoardPath('/A/', sFolderA, '/B/C/')).toBe('/B/C/A/');
    });
    it('folder dropped on the root → /A/', () => {
        expect(computeMovedBoardPath('/A/', { type: 1, name: 'A', path: '/X/' }, '/')).toBe(null);
        expect(computeMovedBoardPath('/X/A/', { type: 1, name: 'A', path: '/X/' }, '/')).toBe('/A/');
        expect(computeMovedBoardPath('/X/A/k/', { type: 1, name: 'A', path: '/X/' }, '/')).toBe('/A/k/');
    });
    it('an unrelated /AA/ is not touched', () => {
        expect(computeMovedBoardPath('/AA/', sFolderA, '/B/')).toBe(null);
    });
    it('replaces the prefix once only', () => {
        expect(computeMovedBoardPath('/A/A/', sFolderA, '/B/')).toBe('/B/A/A/');
    });
    it('handles special characters', () => {
        expect(computeMovedBoardPath('/test(1/x/', { type: 1, name: 'test(1', path: '/' }, '/a[b]/')).toBe('/a[b]/test(1/x/');
    });
    it('a moved file never rewrites a directory path', () => {
        expect(computeMovedBoardPath('/A/', { type: 0, name: 'A', path: '/' }, '/B/')).toBe(null);
    });
});
