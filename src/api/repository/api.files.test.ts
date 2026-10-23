// api.ts builds /api/files URLs for open/save/delete across the app. Unencoded, a server file named
// `b.sql#x.sql` saved back went to `b.sql` (and `c.sql?v.sql` to `c.sql`) — issue-1544 r5.
import { deleteFileList, getFileList, postFileList } from './api';
import request from '@/api/core';

jest.mock('@/api/core', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({ success: true })),
}));

const lastCall = () => (request as unknown as jest.Mock).mock.calls.at(-1)[0];

describe('api.ts /api/files URLs', () => {
    beforeEach(() => (request as unknown as jest.Mock).mockClear());

    it('getFileList encodes the path and keeps ?filter= as a real query', async () => {
        await getFileList('?filter=*.sql', 'a#b', '');
        expect(lastCall()).toEqual({ method: 'GET', url: '/api/files/a%23b?filter=*.sql' });
    });
    it('getFileList joins dir and name', async () => {
        await getFileList('', '/public/my app/', 'package.json');
        expect(lastCall().url).toBe('/api/files/public/my%20app/package.json');
    });
    it('getFileList on root and on a dir with trailing slash', async () => {
        await getFileList('', '/', '');
        expect(lastCall().url).toBe('/api/files/');
        await getFileList('', '/d/', '');
        expect(lastCall().url).toBe('/api/files/d/');
    });
    it('postFileList encodes "?" in the file name (k?.sql must not become k + query)', async () => {
        await postFileList('x', 'd', 'k?.sql');
        expect(lastCall()).toEqual({ method: 'POST', url: '/api/files/d/k%3F.sql', data: 'x' });
    });
    it('postFileList keeps the trailing "/" of a folder creation', async () => {
        await postFileList(undefined, 'd/new#1/', '');
        expect(lastCall().url).toBe('/api/files/d/new%231/');
        await postFileList(undefined, '/', '.neo-web');
        expect(lastCall().url).toBe('/api/files/.neo-web');
    });
    it('deleteFileList encodes the path', async () => {
        await deleteFileList('/a b/', 'c#d.sql');
        expect(lastCall()).toEqual({ method: 'DELETE', url: '/api/files/a%20b/c%23d.sql' });
    });
    it('backslashes collapse to "/" as before', async () => {
        await postFileList('x', '\\a\\', 'b.sql');
        expect(lastCall().url).toBe('/api/files/a/b.sql');
    });
});


describe('file write ordering', () => {
    beforeEach(() => (request as unknown as jest.Mock).mockReset().mockResolvedValue({ success: true }));

    it('serializes canonical path and case aliases while keeping each submitted payload', async () => {
        let finish!: (value: unknown) => void;
        (request as unknown as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const first = postFileList({ data: ['FIRST'] }, 'd/', 'a.wrk');
        await Promise.resolve(); await Promise.resolve();
        const second = postFileList({ data: ['LATEST'] }, '/d//', 'A.WRK');
        await Promise.resolve(); await Promise.resolve();
        expect(request).toHaveBeenCalledTimes(1);
        finish({ success: true }); await first; await second;
        expect((request as unknown as jest.Mock).mock.calls.map(call => call[0].data)).toEqual([{ data: ['FIRST'] }, { data: ['LATEST'] }]);
        expect(lastCall().url).toBe('/api/files/d/A.WRK');
    });

    it('allows another file to save while one file waits', async () => {
        let finish!: (value: unknown) => void;
        (request as unknown as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        const first = postFileList('FIRST', '/', 'a.sql');
        await Promise.resolve(); await Promise.resolve();
        await postFileList('OTHER', '/', 'b.sql');
        expect(request).toHaveBeenCalledTimes(2);
        finish({ success: true }); await first;
    });

    it('continues after a failed write and releases the queue for the next save', async () => {
        (request as unknown as jest.Mock).mockRejectedValueOnce(new Error('write failed'));
        const first = postFileList('FIRST', '/', 'a.sql');
        const second = postFileList('LATEST', '/', 'a.sql');
        await expect(first).rejects.toThrow('write failed'); await expect(second).resolves.toEqual({ success: true });
        await postFileList('NEXT', '/', 'a.sql');
        expect(request).toHaveBeenCalledTimes(3);
        expect(lastCall().data).toBe('NEXT');
    });
});
