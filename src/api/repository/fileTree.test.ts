import { deleteFile, getFiles, moveFile } from './fileTree';
import request from '../core';

jest.mock('../core', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({ success: true })),
}));

const lastCall = () => (request as unknown as jest.Mock).mock.calls.at(-1)[0];

describe('fileTree repository URLs', () => {
    beforeEach(() => (request as unknown as jest.Mock).mockClear());

    it('getFiles encodes path segments', async () => {
        await getFiles('/test(1/a b#.sql');
        expect(lastCall()).toEqual({ method: 'GET', url: '/api/files/test(1/a%20b%23.sql' });
    });
    it('getFiles keeps a directory trailing slash', async () => {
        await getFiles('/dir/');
        expect(lastCall().url).toBe('/api/files/dir/');
        await getFiles('/');
        expect(lastCall().url).toBe('/api/files/');
    });
    it('moveFile encodes the url but not the destination body', async () => {
        await moveFile('/a#/x.sql', '/b#/x.sql');
        expect(lastCall()).toEqual({ method: 'PUT', url: '/api/files/a%23/x.sql', data: { destination: '/b#/x.sql' } });
    });
    it('deleteFile adds recursive as a real query, not an encoded %3F', async () => {
        await deleteFile('/d/', 'x', { recursive: true });
        expect(lastCall().url).toBe('/api/files/d/x?recursive=true');
        expect(lastCall().url).not.toContain('%3F');
    });
    it('deleteFile without options sends no query', async () => {
        await deleteFile('/d/', 'x');
        expect(lastCall()).toEqual({ method: 'DELETE', url: '/api/files/d/x' });
    });
    it('deleteFile accepts a dir without slashes (SaveModal joins segments)', async () => {
        await deleteFile('a/b', 'c d.sql');
        expect(lastCall().url).toBe('/api/files/a/b/c%20d.sql');
    });
});
