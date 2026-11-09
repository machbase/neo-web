// newTabStorage builds its own GET /api/files URL; it goes through the shared builder (issue-1544 r5).
import { NEW_TAB_DIR, readJsonFile, writeJsonFile } from './newTabStorage';
import request from '@/api/core';
import { postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/core', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve('{"v":1}')),
}));
jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));

describe('newTabStorage readJsonFile url', () => {
    beforeEach(() => (request as unknown as jest.Mock).mockClear());

    it('reads from the hidden new-tab folder', async () => {
        const sOut = await readJsonFile('layout.A.json');
        expect((request as unknown as jest.Mock).mock.calls[0][0]).toEqual({ method: 'GET', url: `/api/files${NEW_TAB_DIR}/layout.A.json` });
        expect(sOut).toEqual({ status: 'ok', data: { v: 1 } });
    });
    it('segment-encodes the file name', async () => {
        await readJsonFile('a b#?.json');
        expect((request as unknown as jest.Mock).mock.calls[0][0].url).toBe('/api/files/.neo-web/new-tab/a%20b%23%3F.json');
    });
});

describe('newTabStorage writeJsonFile (#1572)', () => {
    const FILE_POST = [expect.any(String), NEW_TAB_DIR, 'layout.A.json'];
    const fail = (aReason: string) => ({ status: 500, headers: {}, config: {}, data: { success: false, reason: aReason } });
    const mockPost = postFileList as unknown as jest.Mock;
    // A small server: `aFolders` exist, a file write needs NEW_TAB_DIR, and it fails with `aError` when that is missing.
    const serve = (aFolders: string[], aError: string, aMkdir?: () => unknown) => {
        (getFiles as jest.Mock).mockImplementation(async (aPath: string) =>
            aFolders.includes(aPath.replace(/\/$/, ''))
                ? { success: true, data: { isDir: true, children: [] } }
                : { status: 404, headers: {}, config: {}, data: { success: false, reason: 'not found' } });
        mockPost.mockImplementation(async (aData: unknown, aParent: string, aName: string) => {
            if (aData !== undefined) return aFolders.includes(aParent) ? { success: true } : fail(aError);
            if (aMkdir) return aMkdir();
            aFolders.push(aParent === '/' ? `/${aName}` : `${aParent}/${aName}`);
            return { success: true };
        });
    };
    beforeEach(() => jest.resetAllMocks());

    it.each([
        ['Windows', 'open C:\\x\\layout.A.json: The system cannot find the path specified.'],
        ['macOS/Linux', 'open /x/layout.A.json: no such file or directory'],
        ['an unknown wording', 'le dossier est introuvable'],
    ])('creates the missing folders and saves again on %s error text', async (_aName, aError) => {
        serve([], aError);
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: true });
        expect(mockPost.mock.calls).toEqual([FILE_POST, [undefined, '/', '.neo-web'], [undefined, '/.neo-web', 'new-tab'], FILE_POST]);
    });
    it('creates only new-tab when .neo-web is already there', async () => {
        serve(['/.neo-web'], 'The system cannot find the path specified.');
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: true });
        expect(mockPost.mock.calls).toEqual([FILE_POST, [undefined, '/.neo-web', 'new-tab'], FILE_POST]);
    });
    it('makes one POST and no lookup when the folder is there', async () => {
        serve(['/.neo-web', NEW_TAB_DIR], 'unused');
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: true });
        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(getFiles).not.toHaveBeenCalled();
    });
    it.each(['permission denied', 'open /x: no such file or directory'])('does not retry when the folder exists and the write fails with "%s"', async (aError) => {
        serve(['/.neo-web', NEW_TAB_DIR], 'unused');
        mockPost.mockResolvedValue(fail(aError));
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: false, reason: aError });
        expect(mockPost).toHaveBeenCalledTimes(1);
    });
    it('reports why the folder could not be created, without saving again', async () => {
        serve([], 'The system cannot find the path specified.', () => fail('Access is denied.'));
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: false, reason: 'Access is denied.' });
        expect(mockPost.mock.calls).toEqual([FILE_POST, [undefined, '/', '.neo-web']]);
    });
    it('keeps the save error when the folder lookup itself fails', async () => {
        (getFiles as jest.Mock).mockResolvedValue(fail('lookup failed'));
        mockPost.mockResolvedValue(fail('write failed'));
        expect(await writeJsonFile('layout.A.json', { v: 1 })).toEqual({ ok: false, reason: 'write failed' });
        expect(mockPost).toHaveBeenCalledTimes(1);
    });
});
