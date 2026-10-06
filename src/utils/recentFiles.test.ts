import { getRecentFiles, recordRecentFile, removeRecentFile } from './recentFiles';

// jest only lets a mock factory read variables whose name starts with `mock`.
let mockUser = 'sys';
jest.mock('@/utils', () => ({ getUserName: () => mockUser }));

describe('recentFiles', () => {
    beforeEach(() => {
        localStorage.clear();
        mockUser = 'sys';
    });

    it('puts the latest file first and does not repeat it', () => {
        recordRecentFile({ name: 'a.sql', path: '/' });
        recordRecentFile({ name: 'b.tql', path: '/dir/' });
        recordRecentFile({ name: 'a.sql', path: '/' });
        expect(getRecentFiles().map((aFile) => aFile.path + aFile.name)).toEqual(['/a.sql', '/dir/b.tql']);
    });

    it('treats the same name in another folder as another file', () => {
        recordRecentFile({ name: 'a.sql', path: '/one/' });
        recordRecentFile({ name: 'a.sql', path: '/two/' });
        expect(getRecentFiles()).toHaveLength(2);
    });

    it('keeps the eight most recent', () => {
        for (let i = 0; i < 10; i++) recordRecentFile({ name: `f${i}.sql`, path: '/' });
        const sList = getRecentFiles();
        expect(sList).toHaveLength(8);
        expect(sList[0].name).toBe('f9.sql');
        expect(sList.at(-1)?.name).toBe('f2.sql');
    });

    it('removes a file', () => {
        recordRecentFile({ name: 'a.sql', path: '/' });
        recordRecentFile({ name: 'b.sql', path: '/' });
        removeRecentFile({ name: 'a.sql', path: '/' });
        expect(getRecentFiles().map((aFile) => aFile.name)).toEqual(['b.sql']);
    });

    it('keeps each account to its own list', () => {
        recordRecentFile({ name: 'mine.sql', path: '/' });
        mockUser = 'other';
        expect(getRecentFiles()).toEqual([]);
        recordRecentFile({ name: 'theirs.sql', path: '/' });
        mockUser = 'SYS';
        expect(getRecentFiles().map((aFile) => aFile.name)).toEqual(['mine.sql']);
    });

    it('returns the same array until the list changes', () => {
        recordRecentFile({ name: 'a.sql', path: '/' });
        expect(getRecentFiles()).toBe(getRecentFiles());
    });

    it('ignores storage it cannot read', () => {
        localStorage.setItem('recentFiles:SYS', '{not json');
        expect(getRecentFiles()).toEqual([]);
        localStorage.setItem('recentFiles:SYS', JSON.stringify([{ name: 'ok.sql', path: '/', openedAt: 1 }, { name: 42 }, null]));
        expect(getRecentFiles().map((aFile) => aFile.name)).toEqual(['ok.sql']);
    });
});
