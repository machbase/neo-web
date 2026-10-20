import { getFileList, postFileList } from '@/api/repository/api';
import { FileCopy } from './UpdateTree';

jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(), postFileList: jest.fn() }));

const target = (name = 'sample.sql') => ({ name, id: name, path: '/copies/', depth: 1, parentId: 'copies', type: 0 });

describe('FileCopy preserves existing files when choosing a copy name', () => {
    beforeEach(() => jest.resetAllMocks());

    const storage = (entries: Record<string, string>, directories: string[] = []) => {
        const files = new Map(Object.entries(entries));
        (getFileList as jest.Mock).mockImplementation(async (_filter: string, _path: string, name: string) => {
            if (name) return files.get(name);
            return {
                success: true,
                data: {
                    name: 'copies',
                    isDir: true,
                    children: [
                        ...Array.from(files.keys(), (fileName) => ({ name: fileName, isDir: false, lastModifiedUnixMillis: 0 })),
                        ...directories.map((dirName) => ({ name: dirName, isDir: true })),
                    ],
                },
            };
        });
        // The real save API can overwrite. Keep that behavior here so a name collision fails the assertions.
        (postFileList as jest.Mock).mockImplementation(async (contents: string, _path: string, name: string) => {
            files.set(name, contents);
            return { success: true };
        });
        return files;
    };

    it('reuses number 1 after it is deleted without overwriting number 2', async () => {
        const files = storage({ 'sample.sql': 'original', 'sample (1).sql': 'first copy', 'sample (2).sql': 'must survive' });
        files.delete('sample (1).sql');

        const copied = await FileCopy(target());

        expect(copied).toMatchObject({ name: 'sample (1).sql', id: 'sample (1).sql', path: '/copies/' });
        expect(files.get('sample (1).sql')).toBe('original');
        expect(files.get('sample (2).sql')).toBe('must survive');
        expect(files.get('sample.sql')).toBe('original');
        expect(postFileList).toHaveBeenCalledWith('original', '/copies/', 'sample (1).sql');
    });

    it('fills a gap in the middle and then skips all occupied numbers on the next copy', async () => {
        const files = storage({ 'sample.sql': 'original', 'sample (1).sql': 'keep first', 'sample (3).sql': 'keep third' });

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (2).sql' });
        expect(await FileCopy(target())).toMatchObject({ name: 'sample (4).sql' });

        expect(files.get('sample (1).sql')).toBe('keep first');
        expect(files.get('sample (2).sql')).toBe('original');
        expect(files.get('sample (3).sql')).toBe('keep third');
        expect(files.get('sample (4).sql')).toBe('original');
    });

    it('starts at 1 when only the original exists', async () => {
        const files = storage({ 'sample.sql': 'original' });

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (1).sql' });
        expect(files.get('sample (1).sql')).toBe('original');
    });

    it('does not count unrelated names or other extensions as occupied copy names', async () => {
        const files = storage({ 'sample.sql': 'original', 'sample-other.sql': 'keep other', 'sample (1).tql': 'keep tql' });

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (1).sql' });
        expect(files.get('sample-other.sql')).toBe('keep other');
        expect(files.get('sample (1).tql')).toBe('keep tql');
    });

    it('skips a name already used by a directory', async () => {
        const files = storage({ 'sample.sql': 'original' }, ['sample (1).sql']);

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (2).sql' });
        expect(files.has('sample (1).sql')).toBe(false);
    });

    it.each([
        ['my.config.sql', 'my.config (1).sql', 'my.config (2).sql'],
        ['README', 'README (1)', 'README (2)'],
    ])('preserves the filename format for %s', async (original, first, second) => {
        const files = storage({ [original]: 'original', [second]: 'must survive' });

        expect(await FileCopy(target(original))).toMatchObject({ name: first });
        expect(files.get(first)).toBe('original');
        expect(files.get(second)).toBe('must survive');
    });

    it('does not save when the directory listing could not be loaded', async () => {
        (getFileList as jest.Mock).mockResolvedValue({ success: false, reason: 'listing failed' });

        expect(await FileCopy(target())).toBeUndefined();
        expect(postFileList).not.toHaveBeenCalled();
    });
});
