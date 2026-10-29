import request from '@/api/core';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { saveBoardFile } from './boardFileSave';
import { applyFileSaveResult } from './boardSaveResult';
import { isBoardSaved } from './boardSaveStatus';
import { getFileIdentity, hasFileIdentity, forgetFileIdentities } from './fileIdentity';
import { resolveOverwrite } from './fileExistence';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));

beforeEach(() => { cancelAllPendingFileWrites(); jest.mocked(request).mockReset(); });
afterEach(() => cancelAllPendingFileWrites());

for (const name of ['가.sql', 'café.SQL']) {
    it.each([true, false])(`${name}: native same-file=%s acknowledges only the actual stored file`, async sameFile => {
        const alias = name.normalize('NFD');
        const files = new Map([['/' + name, 'OLD'], ...sameFile ? [] : [['/' + alias, 'OTHER_OLD']] as [string, string][]]);
        const boards = [
            { id: 'owner', path: '/', name, type: 'sql', code: 'FIRST', savedCode: 'OLD' },
            { id: 'peer', path: '/', name: alias, type: 'sql', code: sameFile ? 'OLD' : 'OTHER_OLD', savedCode: sameFile ? 'OLD' : 'OTHER_OLD' },
        ];
        let current = boards;
        jest.mocked(request).mockImplementation(async (config: any) => {
            const path = decodeURIComponent(config.url.replace('/api/files', ''));
            if (config.method === 'GET' && path === '/') return { success: true, data: { isDir: true, children: [...files.keys()].map(path => ({ name: path.slice(1) })) } } as any;
            const storedPath = sameFile ? path.normalize('NFC') : path;
            if (config.method === 'GET') return (files.get(storedPath) ?? { status: 404, headers: {}, data: { reason: 'missing' } }) as any;
            files.set(storedPath, config.data);
            return { success: true } as any;
        });
        expect(await saveBoardFile({ board: boards[0], getSaveBoards: () => current,
            onSuccess: submitted => { current = applyFileSaveResult(current, boards[0], 'sql', submitted); }, onUncertain: jest.fn(),
        })).toBe(true);
        expect(current[1].code).toBe(sameFile ? 'OLD' : 'OTHER_OLD');
        expect(current[1].savedCode).toBe(sameFile ? 'FIRST' : 'OTHER_OLD');
        expect(isBoardSaved(current[1])).toBe(!sameFile);
        expect(files.get('/' + name)).toBe('FIRST');
        if (!sameFile) expect(files.get('/' + alias)).toBe('OTHER_OLD');
        expect(getFileIdentity('/' + alias) === getFileIdentity('/' + name)).toBe(sameFile);
    });
}

it('a missing decomposed path remains a separate future file after probing the composed candidate', async () => {
    jest.mocked(request).mockImplementation(async (config: any) => decodeURIComponent(config.url) === '/api/files/'
        ? { success: true, data: { isDir: true, children: [{ name: '가.sql' }] } } as any
        : { status: 404, headers: {}, data: { reason: 'missing' } } as any);
    const alias = '가.sql'.normalize('NFD'), ask = jest.fn(async () => true);
    expect(await resolveOverwrite('/', alias, ask)).toEqual({ status: 'confirmed' });
    expect(ask).toHaveBeenCalledWith('가.sql');
    expect(getFileIdentity('/' + alias)).not.toBe(getFileIdentity('/가.sql'));
});

it.each([true, false])('resolves Unicode parent directories without merging native separate folders: same-file=%s', async sameFile => {
    const folder = '가', alias = folder.normalize('NFD');
    jest.mocked(request).mockImplementation(async (config: any) => {
        const path = decodeURIComponent(config.url.replace('/api/files', ''));
        return { success: true, data: { isDir: true, children: path === '/'
            ? [{ name: folder, isDir: true }, ...sameFile ? [] : [{ name: alias, isDir: true }]]
            : [{ name: 'a.sql' }] } } as any;
    });
    await resolveOverwrite(`/${folder}/`, 'a.sql', async () => true);
    await resolveOverwrite(`/${alias}/`, 'a.sql', async () => true);
    expect(getFileIdentity(`/${folder}/a.sql`) === getFileIdentity(`/${alias}/a.sql`)).toBe(sameFile);
    forgetFileIdentities(`/${alias}/`);
    expect(hasFileIdentity(`/${folder}/a.sql`)).toBe(!sameFile);
    expect(hasFileIdentity(`/${alias}/a.sql`)).toBe(false);
});

it('clears observed Unicode aliases after a mutation using either spelling', async () => {
    const name = '가.sql', alias = name.normalize('NFD');
    jest.mocked(request).mockImplementation(async (config: any) => decodeURIComponent(config.url) === '/api/files/'
        ? { success: true, data: { isDir: true, children: [{ name }] } } as any : 'OLD' as any);
    expect(await resolveOverwrite('/', alias, async () => true)).toEqual({ status: 'confirmed' });
    expect(hasFileIdentity('/' + alias)).toBe(true);
    expect(hasFileIdentity('/' + name)).toBe(true);
    forgetFileIdentities('/' + alias);
    expect(hasFileIdentity('/' + alias)).toBe(false);
    expect(hasFileIdentity('/' + name)).toBe(false);
});
