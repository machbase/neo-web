import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { FileCopy } from './UpdateTree';

jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));

const target = (name = 'sample.sql') => ({ name, id: name, path: '/copies/', depth: 1, parentId: 'copies', type: 0 });

describe('FileCopy preserves existing files when choosing a copy name', () => {
    beforeEach(() => jest.resetAllMocks());

    const storage = (entries: Record<string, string>, directories: string[] = [], caseInsensitive = false) => {
        const files = new Map(Object.entries(entries));
        const storedName = (name: string) => caseInsensitive
            ? Array.from(files.keys()).find((existing) => existing.toLowerCase() === name.toLowerCase()) ?? name
            : name;
        (getFiles as jest.Mock).mockImplementation(async (path: string) => files.get(storedName(path.slice('/copies/'.length))));
        (getFileList as jest.Mock).mockImplementation(async () => {
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
            files.set(storedName(name), contents);
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

    it.each([false, true])('preserves a case-variant copy with case-insensitive storage=%s', async (caseInsensitive) => {
        const files = storage({ 'sample.sql': 'original', 'Sample (1).sql': 'must survive' }, [], caseInsensitive);

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (2).sql' });
        expect(files.get('Sample (1).sql')).toBe('must survive');
        expect(files.get('sample (2).sql')).toBe('original');
        expect(files.get('sample.sql')).toBe('original');
        expect(files.has('sample (1).sql')).toBe(false);
        expect(postFileList).toHaveBeenCalledWith('original', '/copies/', 'sample (2).sql');
    });

    it('skips case-variant extensions and directories while filling the first free number', async () => {
        const files = storage({ 'sample.sql': 'original', 'sample (1).SQL': 'keep uppercase extension', 'SAMPLE (3).Sql': 'keep third' }, ['Sample (2).sql'], true);

        expect(await FileCopy(target())).toMatchObject({ name: 'sample (4).sql' });
        expect(files.get('sample (1).SQL')).toBe('keep uppercase extension');
        expect(files.get('SAMPLE (3).Sql')).toBe('keep third');
        expect(files.get('sample (4).sql')).toBe('original');
        expect(files.has('sample (2).sql')).toBe(false);
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

    // F-154: the copy is the stored bytes, whatever they hold — not re-parsed and re-serialized.
    it.each([
        ['bad.json', '{\n  "a": 1,\n}\n'],
        ['lines.json', '{"a": 1}\n{"a": 2}\n'],
        ['spaced.json', ' {\n    "a": 1\n}\n\n'],
        ['board.dsh', '{\n    "dashboard": {}\n}\n'],
    ])('copies %s byte for byte', async (name, text) => {
        const files = storage({ [name]: text });

        const copied = await FileCopy(target(name));

        expect(getFiles).toHaveBeenCalledWith(`/copies/${name}`, { rawText: true });
        expect(files.get(copied!.name)).toBe(text);
    });
});
