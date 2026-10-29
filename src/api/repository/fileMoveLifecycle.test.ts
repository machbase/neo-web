import request from '@/api/core';
import { postFileList } from './api';
import { getFiles, moveFile } from './fileTree';
import { cancelAllPendingFileWrites, readFileConsistently } from './fileWriteQueue';
import { rememberFileIdentity } from '@/utils/fileIdentity';
import { saveBoardFile } from '@/utils/boardFileSave';
import { applyFileSaveResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { isBoardSaved } from '@/utils/boardSaveStatus';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => { cancelAllPendingFileWrites(); jest.mocked(request).mockReset(); });
afterEach(() => cancelAllPendingFileWrites());

it.each(['wrk', 'dsh'])('blocks new %s reads and writes until the move is finished', async type => {
    const old = '/src/a.' + type, target = '/dest/a.' + type, gate = deferred();
    const disk = new Map([[old, 'OLD']]); const calls: string[] = [];
    jest.mocked(request).mockImplementation(async (config: any) => {
        const path = config.url.replace('/api/files', ''); calls.push(config.method + ' ' + path);
        if (config.method === 'PUT') { disk.set(target, disk.get(old)!); disk.delete(old); await gate.promise; return {success: true} as any; }
        if (config.method === 'POST') { disk.set(path, config.data); return {success: true} as any; }
        return disk.get(path) as any;
    });
    const moving = moveFile(old, target);
    try {
        for (let i = 0; i < 20 && disk.has(old); i++) await Promise.resolve();
        expect(disk.has(old)).toBe(false);
        expect(await postFileList('NEW', '/src/', 'a.' + type)).toMatchObject({success: false});
        expect(await readFileConsistently(old, () => getFiles(old))).toMatchObject({success: false});
        expect(calls).toEqual(['PUT ' + old]);
    } finally { gate.resolve(); await moving; }
    expect(disk.has(old)).toBe(false); expect(disk.get(target)).toBe('OLD');
});

it('waits for already dispatched writes before sending the move', async () => {
    const gate = deferred(), disk = new Map([['/src/a.wrk', 'OLD']]); let puts = 0;
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'POST') { await gate.promise; disk.set('/src/a.wrk', config.data); return {success: true} as any; }
        puts++; disk.set('/dest/a.wrk', disk.get('/src/a.wrk')!); disk.delete('/src/a.wrk'); return {success: true} as any;
    });
    const saving = postFileList('NEW', '/src/', 'a.wrk'), moving = moveFile('/src/a.wrk', '/dest/a.wrk');
    try { for (let i = 0; i < 20; i++) await Promise.resolve(); expect(puts).toBe(0); }
    finally { gate.resolve(); await Promise.all([saving, moving]); }
    expect(puts).toBe(1); expect(disk.has('/src/a.wrk')).toBe(false); expect(disk.get('/dest/a.wrk')).toBe('NEW');
});

it('retains the observed identity of a distinct Unicode peer during the move', async () => {
    for (const name of ['SS.wrk', 'ß.wrk']) rememberFileIdentity('/' + name, '/' + name);
    const gate = deferred(); const posts: string[] = [];
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'PUT') await gate.promise;
        else posts.push(config.url);
        return {success: true} as any;
    });
    const moving = moveFile('/SS.wrk', '/moved.wrk');
    try { expect(await postFileList('KEPT', '/', 'ß.wrk')).toMatchObject({success: true}); expect(posts).toHaveLength(1); }
    finally { gate.resolve(); await moving; }
});

it('blocks moved folder descendants but keeps sibling paths independent', async () => {
    const gate = deferred();
    jest.mocked(request).mockImplementation(async (config: any) => { if (config.method === 'PUT') await gate.promise; return {success: true} as any; });
    const moving = moveFile('/src/A', '/dest/A');
    try {
        expect(await postFileList('BLOCKED', '/src/A/', 'a.dsh')).toMatchObject({success: false});
        expect(await readFileConsistently('/dest/A/a.dsh', async () => 'BLOCKED')).toMatchObject({success: false});
        expect(await postFileList('KEPT', '/src/AB/', 'a.dsh')).toMatchObject({success: true});
    } finally { gate.resolve(); await moving; }
});

it('releases the gate after a failed move so the original file can be saved', async () => {
    const gate = deferred(); let posts = 0;
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'PUT') { await gate.promise; return {success: false, reason: 'refused'} as any; }
        posts++; return {success: true} as any;
    });
    const moving = moveFile('/a.wrk', '/dest/a.wrk');
    try { expect(await postFileList('WAIT', '/', 'a.wrk')).toMatchObject({success: false}); }
    finally { gate.resolve(); await moving; }
    expect(await postFileList('RETRY', '/', 'a.wrk')).toMatchObject({success: true}); expect(posts).toBe(1);
});

it('logout prevents a move waiting on an old write from being dispatched', async () => {
    const gate = deferred(); let puts = 0;
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'POST') await gate.promise; else puts++;
        return {success: true} as any;
    });
    const saving = postFileList('OLD ACCOUNT', '/', 'a.wrk'), moving = moveFile('/a.wrk', '/dest/a.wrk');
    cancelAllPendingFileWrites(); gate.resolve(); await Promise.all([saving, moving]); expect(puts).toBe(0);
});

it('holds the read/write gate until the moved tab paths have been published', async () => {
    const published = deferred(); let publishing = false;
    jest.mocked(request).mockResolvedValue({success: true} as any);
    const moving = moveFile('/a.wrk', '/dest/a.wrk', async () => { publishing = true; await published.promise; });
    try {
        for (let i = 0; i < 20 && !publishing; i++) await Promise.resolve();
        expect(publishing).toBe(true);
        expect(await postFileList('WAIT', '/', 'a.wrk')).toMatchObject({success: false});
        expect(await readFileConsistently('/dest/a.wrk', async () => 'WAIT')).toMatchObject({success: false});
    } finally { published.resolve(); await moving; }
    expect(await postFileList('RETRY', '/dest/', 'a.wrk')).toMatchObject({success: true});
});

it.each(['wrk', 'dsh'])('a blocked %s Save cannot dirty a verified distinct peer', async type => {
    const gate = deferred();
    const body = (value: string) => type === 'wrk' ? {sheet: [{id: 'cell', contents: value}]} : {dashboard: {title: value}};
    const original = body('ORIGINAL');
    const owner = {id: 'owner', name: 'SS.' + type, path: '/', type, code: '', ...original, savedCode: JSON.stringify(type === 'wrk' ? original.sheet : original.dashboard)};
    const peer = {...owner, id: 'peer', name: 'ß.' + type};
    let boards: any[] = [owner, peer];
    for (const name of [owner.name, peer.name]) rememberFileIdentity('/' + name, '/' + name);
    jest.mocked(request).mockImplementation(async (config: any) => { if (config.method === 'PUT') await gate.promise; return {success: true} as any; });
    const moving = moveFile('/' + owner.name, '/moved.' + type);
    try {
        const result = await saveBoardFile({board: {...owner, ...body('NEW')}, getSaveBoards: () => boards,
            onSuccess: submitted => { boards = applyFileSaveResult(boards, owner, type, submitted); },
            onUncertain: (target = owner) => { boards = invalidateFileSaveResult(boards, target); },
        });
        expect(result).toBe(false); expect(boards[1]).toBe(peer); expect(isBoardSaved(boards[1])).toBe(true);
    } finally { gate.resolve(); await moving; }
});

it('an old-session move rejection cannot affect the new session', async () => {
    const gate = deferred(); let sent = false;
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'PUT') { sent = true; await gate.promise; throw new Error('Old request cancelled'); }
        return {success: true} as any;
    });
    const moving = moveFile('/a.wrk', '/dest/a.wrk');
    for (let i = 0; i < 20 && !sent; i++) await Promise.resolve(); expect(sent).toBe(true);
    cancelAllPendingFileWrites();
    expect(await postFileList('NEW ACCOUNT', '/', 'a.wrk')).toMatchObject({success: false});
    expect(await postFileList('OTHER FILE', '/', 'other.wrk')).toMatchObject({success: true});
    gate.resolve(); expect(await moving).toMatchObject({success: false});
});
