// api.ts builds /api/files URLs for open/save/delete across the app. Unencoded, a server file named
// `b.sql#x.sql` saved back went to `b.sql` (and `c.sql?v.sql` to `c.sql`) — issue-1544 r5.
import { deleteFileList, getFileList, postFileList } from './api';
import request from '@/api/core';
import { hasPendingFileWrite, UncertainFileWriteError } from './fileWriteQueue';

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
        expect(lastCall()).toEqual({ method: 'POST', url: '/api/files/d/k%3F.sql', data: 'x', canRetryFileRequest: expect.any(Function) });
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

    it('continues after a terminal rejection and releases the queue for the next save', async () => {
        (request as unknown as jest.Mock).mockResolvedValueOnce({success:false,reason:'terminal rejection'});
        const first = postFileList('FIRST', '/', 'a.sql');
        const second = postFileList('LATEST', '/', 'a.sql');
        await expect(first).resolves.toMatchObject({success:false}); await expect(second).resolves.toEqual({ success: true });
        await postFileList('NEXT', '/', 'a.sql');
        expect(request).toHaveBeenCalledTimes(3);
        expect(lastCall().data).toBe('NEXT');
    });
});

describe('pending writes across file and login changes', () => {
    const { deleteFile, moveFile } = require('./fileTree');
    const { logOut, postLogin } = require('./login');
    const { cancelAllPendingFileWrites } = require('./fileWriteQueue');
    beforeEach(() => {
        cancelAllPendingFileWrites();
        (request as unknown as jest.Mock).mockReset().mockResolvedValue({ success: true });
    });
    const hold = () => {
        let finish!: (value: unknown) => void;
        (request as unknown as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        return () => finish({ success: true });
    };

    it.each(['repository', 'explorer'])('cancels every queued write when %s deletes the file, and allows a new file at that path', async repository => {
        const finish = hold();
        const first = postFileList('FIRST', '/d/', 'a.sql');
        const second = postFileList('STALE_2', '/D/', 'A.SQL');
        const third = postFileList('STALE_3', '/d/', 'a.sql');
        const deleting=repository === 'repository'?deleteFileList('/d/', 'a.sql'):deleteFile('/d/', 'a.sql');
        expect((request as unknown as jest.Mock).mock.calls.map(([c])=>c.method)).toEqual(['POST']);
        finish();expect(await first).toMatchObject({success:true});await deleting;
        await postFileList('NEW_FILE', '/d/', 'a.sql');
        expect(await second).toMatchObject({ success: false });
        expect(await third).toMatchObject({ success: false });
        expect((request as unknown as jest.Mock).mock.calls.filter(([config]) => config.method === 'POST').map(([config]) => config.data)).toEqual(['FIRST', 'NEW_FILE']);
    });

    it('cancels folder descendants but keeps a similarly named neighbouring folder', async () => {
        const finish = hold();
        const first = postFileList('FIRST', '/d/nested/', 'a.sql');
        const pending = postFileList('STALE', '/d/nested/', 'a.sql');
        const deleting=deleteFile('/', 'D', { recursive: true });
        await postFileList('NEIGHBOUR', '/d2/', 'a.sql');
        finish();await first;await deleting;
        expect(await pending).toMatchObject({ success: false });
        expect((request as unknown as jest.Mock).mock.calls.some(([config]) => config.data === 'STALE')).toBe(false);
        expect((request as unknown as jest.Mock).mock.calls.some(([c])=>c.data==='NEIGHBOUR')).toBe(true);
    });

    it('invalidates the source and destination when a file moves, then accepts saves at its new path', async () => {
        const finishSource = hold();
        const source = postFileList('SOURCE', '/d/', 'a.sql');
        const pendingSource = postFileList('STALE_SOURCE', '/d/', 'a.sql');
        const finishDestination = hold();
        const destination = postFileList('DESTINATION', '/d/', 'b.sql');
        const pendingDestination = postFileList('STALE_DESTINATION', '/d/', 'b.sql');
        const moving=moveFile('/d/a.sql', '/d/b.sql');
        finishSource();finishDestination();await Promise.all([source,destination]);await moving;
        await postFileList('AFTER_MOVE', '/d/', 'b.sql');
        expect(await pendingSource).toMatchObject({ success: false });
        expect(await pendingDestination).toMatchObject({ success: false });
        expect((request as unknown as jest.Mock).mock.calls.some(([config]) => String(config.data).startsWith('STALE'))).toBe(false);
    });

    it('a logout and another login cancel all older chains without blocking the next account', async () => {
        const finish = hold();
        const first = postFileList('ACCOUNT_A_FIRST', '/', 'a.sql');
        const pending = postFileList('ACCOUNT_A_PENDING', '/', 'a.sql');
        await logOut(); await postLogin({ loginName: 'USER_B', password: 'test-password' });
        expect(await postFileList('ACCOUNT_B_BLOCKED','/','a.sql')).toMatchObject({fileMutationBlocked:true});
        await postFileList('ACCOUNT_B_OTHER','/','other.sql');
        finish();await first;await postFileList('ACCOUNT_B','/','a.sql');
        expect(await pending).toMatchObject({ success: false });
        expect((request as unknown as jest.Mock).mock.calls.filter(([config]) => config.url === '/api/files/a.sql').map(([config]) => config.data)).toEqual(['ACCOUNT_A_FIRST', 'ACCOUNT_B']);
    });

    it('changing refresh/access tokens within the same login does not discard a pending save', async () => {
        const finish = hold();
        const first = postFileList('FIRST', '/', 'a.sql');
        const pending = postFileList('LATEST', '/', 'a.sql');
        localStorage.setItem('accessToken', 'refreshed-access-token');
        localStorage.setItem('refreshToken', 'rotated-refresh-token');
        finish(); await first;
        expect(await pending).toEqual({ success: true });
        localStorage.clear();
    });

    it('reports all same-file queued writes until completion, independent of a latest tab request', async () => {
        const finishFirst = hold();
        const first = postFileList('FIRST', '/d/', 'a.sql');
        const finishSecond = hold();
        const second = postFileList('SECOND', '/d/', 'a.sql');
        expect(hasPendingFileWrite('/D/A.SQL')).toBe(true);
        expect(hasPendingFileWrite('/other/a.sql')).toBe(false);
        finishFirst(); await first;
        await Promise.resolve();
        expect(hasPendingFileWrite('/d/a.sql')).toBe(true);
        finishSecond(); await second;
        expect(hasPendingFileWrite('/d/a.sql')).toBe(false);
    });
});


it.each([false, true])('preserves the resolved-error contract or opts into editor uncertainty: %s', async editor => {
    const error = { isAxiosError: true, message: 'Network Error' };
    (request as unknown as jest.Mock).mockReset().mockResolvedValueOnce(error);
    if (editor) await expect(postFileList('FIRST', '/', 'lost.sql', {onUncertain: jest.fn()})).rejects.toBeInstanceOf(UncertainFileWriteError);
    else await expect(postFileList('FIRST', '/', 'lost.sql')).resolves.toBe(error);
    expect(hasPendingFileWrite('/lost.sql')).toBe(true);
});

it('preserves a definite rejected response and suppresses uncertainty after file invalidation', async () => {
    const rejection = { status: 403, data: {success: false} };
    (request as unknown as jest.Mock).mockReset().mockResolvedValueOnce(rejection);
    expect(await postFileList('FIRST', '/', 'rejected.sql')).toBe(rejection);
    let finish!: (value: any) => void;
    (request as unknown as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = postFileList('FIRST', '/', 'lost.sql');
    (request as unknown as jest.Mock).mockResolvedValueOnce({success: true});
    const deleting=deleteFileList('/', 'lost.sql');finish({isAxiosError:true});
    expect(await pending).toMatchObject({isAxiosError:true});expect(await deleting).toMatchObject({fileMutationBlocked:true});
});
