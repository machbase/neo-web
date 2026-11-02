import request from '@/api/core';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { saveBoardFile } from './boardFileSave';
import { applyFileSaveResult } from './boardSaveResult';
import { isBoardSaved } from './boardSaveStatus';
import { getFileIdentity, hasFileIdentity, forgetFileIdentities } from './fileIdentity';
import { resolveTrackedOverwrite } from './fileTargetInspection';
import {applyFileReadResult, invalidateFileSaveResult} from './boardSaveResult';
import {loadBoardFromFile} from '@/components/side/FileExplorer/loadBoardFromFile';

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
    expect(await resolveTrackedOverwrite('/', alias, ask)).toEqual({ status: 'confirmed' });
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
    await resolveTrackedOverwrite(`/${folder}/`, 'a.sql', async () => true);
    await resolveTrackedOverwrite(`/${alias}/`, 'a.sql', async () => true);
    expect(getFileIdentity(`/${folder}/a.sql`) === getFileIdentity(`/${alias}/a.sql`)).toBe(sameFile);
    forgetFileIdentities(`/${alias}/`);
    expect(hasFileIdentity(`/${folder}/a.sql`)).toBe(!sameFile);
    expect(hasFileIdentity(`/${alias}/a.sql`)).toBe(false);
});

it('clears observed Unicode aliases after a mutation using either spelling', async () => {
    const name = '가.sql', alias = name.normalize('NFD');
    jest.mocked(request).mockImplementation(async (config: any) => decodeURIComponent(config.url) === '/api/files/'
        ? { success: true, data: { isDir: true, children: [{ name }] } } as any : 'OLD' as any);
    expect(await resolveTrackedOverwrite('/', alias, async () => true)).toEqual({ status: 'confirmed' });
    expect(hasFileIdentity('/' + alias)).toBe(true);
    expect(hasFileIdentity('/' + name)).toBe(true);
    forgetFileIdentities('/' + alias);
    expect(hasFileIdentity('/' + alias)).toBe(false);
    expect(hasFileIdentity('/' + name)).toBe(false);
});

// Native spelling behavior remains in E2E. The owner's lifetime and terminal
// write-result cross-product exercises the existing queue and save callbacks here.
describe('delayed Unicode save matrix moved from E2E', () => {
    let serial = 0;
    const spellings = [['가.sql', '가.sql'.normalize('NFD')], ['café.SQL', 'café.SQL'.normalize('NFD')],
        ['σ.sql', 'ς.sql'], ['ß.sql', 'SS.sql'], ['ſ.sql', 's.sql']];
    for (const [sourceName, peerName] of spellings) for (const sameFile of [false, true]) {
        for (const closeOwner of [false, true]) for (const rejectedAfterWrite of [false, true]) for (const stage of ['before-write', 'after-write']) {
            it(`${sourceName}: same=${sameFile}, close=${closeOwner}, rejected=${rejectedAfterWrite}, ${stage}`, async () => {
                const prefix = `matrix-${++serial}-`, name = prefix + sourceName, peer = prefix + peerName;
                const sourcePath = '/' + name, peerPath = '/' + peer;
                const canonical = (path: string) => sameFile && path === peerPath ? sourcePath : path;
                const disk = new Map([[sourcePath, 'OLD'], ...sameFile ? [] : [[peerPath, 'PEER_OLD']] as [string, string][]]);
                const peerOld = sameFile ? 'OLD' : 'PEER_OLD';
                let boards: any[] = [
                    {id: 'owner', type: 'sql', path: '/', name, code: 'FIRST', savedCode: 'OLD'},
                    {id: 'peer', type: 'sql', path: '/', name: peer, code: peerOld, savedCode: peerOld},
                    {id: 'draft', type: 'sql', path: '', name: 'SQL', code: 'KEEP_DRAFT', savedCode: ''},
                ];
                let release!: () => void, entered!: () => void, first = true, rejectPeer = true;
                const gate = new Promise<void>(resolve => {release = resolve;}), started = new Promise<void>(resolve => {entered = resolve;});
                const posts: string[] = [];
                jest.mocked(request).mockImplementation(async (config: any) => {
                    const path = decodeURIComponent(config.url.replace('/api/files', ''));
                    if (config.method === 'GET' && path === '/') return {success: true, data: {isDir: true, children: [...disk.keys()].map(path => ({name: path.slice(1)}))}} as any;
                    if (config.method === 'GET') return (disk.get(canonical(path)) ?? {status: 404, headers: {}, data: {reason: 'missing'}}) as any;
                    posts.push(path);
                    if (first) {
                        first = false;
                        if (stage === 'after-write') disk.set(canonical(path), config.data);
                        entered(); await gate;
                        if (stage === 'before-write') disk.set(canonical(path), config.data);
                        return (rejectedAfterWrite ? {status: 500, headers: {}, data: {success: false, reason: 'terminal rejection after write'}} : {success: true}) as any;
                    }
                    if (rejectPeer) return {status: 500, headers: {}, data: {success: false, reason: 'peer rejected'}} as any;
                    disk.set(canonical(path), config.data); return {success: true} as any;
                });
                const save = (board: any) => saveBoardFile({board, getSaveBoards: () => boards,
                    onSuccess: submitted => {boards = applyFileSaveResult(boards, board, 'sql', submitted);},
                    onRead: loaded => {boards = applyFileReadResult(boards, loaded);},
                    onUncertain: (target = board) => {boards = invalidateFileSaveResult(boards, target);},
                });
                const saving = save(boards[0]); await started;
                if (closeOwner) boards = boards.filter(board => board.id !== 'owner');
                const followup = save(boards.find(board => board.id === 'peer'));
                release();
                expect(await saving).toBe(!rejectedAfterWrite);
                expect(await followup).toBe(false);
                const current = boards.find(board => board.id === 'peer');
                expect(current.code).toBe(peerOld);
                expect(isBoardSaved(current)).toBe(!sameFile);
                expect(disk.get(sourcePath)).toBe('FIRST');
                expect(disk.get(canonical(peerPath))).toBe(sameFile ? 'FIRST' : 'PEER_OLD');
                expect(boards.find(board => board.id === 'draft')).toMatchObject({path: '', code: 'KEEP_DRAFT', savedCode: ''});
                expect(boards.some(board => board.id === 'owner')).toBe(!closeOwner);
                const reopened = await loadBoardFromFile({path: '/', name}, 'reopened');
                expect(reopened.board).toMatchObject({code: 'FIRST', savedCode: 'FIRST'});
                rejectPeer = false; current.code = 'NEXT';
                expect(await save(current)).toBe(true);
                expect(isBoardSaved(boards.find(board => board.id === 'peer'))).toBe(true);
                expect(disk.get(sourcePath)).toBe(sameFile ? 'NEXT' : 'FIRST');
                expect(disk.get(canonical(peerPath))).toBe('NEXT');
                expect(posts).toEqual([sourcePath, peerPath, peerPath]);
            });
        }
    }
});
