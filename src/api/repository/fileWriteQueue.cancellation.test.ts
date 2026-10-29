import request from '@/api/core';
import { cancelAllPendingFileWrites, cancelPendingFileWrites, hasPendingFileWrite, queueFileWrite, readFileConsistently, runFileMutation } from './fileWriteQueue';
import { forgetFileIdentities, getFileMutationRelation, hasFileIdentity, rememberDirectoryIdentity, rememberFileIdentity } from '@/utils/fileIdentity';
import { saveBoardFile } from '@/utils/boardFileSave';
import { applyFileSaveResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import { resolveOverwrite } from '@/utils/fileExistence';
import { deleteFile } from './fileTree';
import { postFileList } from './api';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const distinct = () => { for (const name of ['ß.wrk', 'SS.wrk']) rememberFileIdentity('/' + name, '/' + name); };
beforeEach(() => { cancelAllPendingFileWrites(); jest.mocked(request).mockReset(); });
afterEach(() => cancelAllPendingFileWrites());

it.each(['ß.wrk', 'SS.wrk'])('cancels only %s in an alternating queue, including older and newer requests', async deleted => {
    distinct(); const gate = deferred<any>(), written: string[] = [], acknowledged: string[] = [];
    const names = ['ß.wrk', 'SS.wrk', 'ß.wrk', 'SS.wrk'];
    const pending = names.map((name, index) => queueFileWrite('/' + name, async () => {
        written.push(String(index)); if (index === 0) await gate.promise; return { success: true };
    }, { onResult: () => { acknowledged.push(String(index)); } }));
    cancelPendingFileWrites('/' + deleted);
    const survivor = deleted === 'ß.wrk' ? 'SS.wrk' : 'ß.wrk';
    expect(hasFileIdentity('/' + survivor)).toBe(true);
    gate.resolve({ success: true }); const results = await Promise.all(pending);
    expect(results.map(result => result.success)).toEqual(names.map((name,index) => index < 2 || name !== deleted));
    expect(written).toEqual(names.flatMap((name, index) => index < 2 || name !== deleted ? [String(index)] : []));
    expect([...acknowledged].sort()).toEqual(names.flatMap((name, index) => index < 2 || name !== deleted ? [String(index)] : []));
});

it('cancels a middle request without cancelling the surviving head and tail', async () => {
    distinct(); const gate = deferred<void>(), written: string[] = [];
    const first = queueFileWrite('/ß.wrk', async () => { await gate.promise; written.push('first'); return { success: true }; });
    const middle = queueFileWrite('/SS.wrk', async () => { written.push('deleted'); return { success: true }; }, {beforeWrite:async()=>true});
    const last = queueFileWrite('/ß.wrk', async () => { written.push('last'); return { success: true }; });
    cancelPendingFileWrites('/SS.wrk');
    expect(hasPendingFileWrite('/ß.wrk')).toBe(true);
    gate.resolve();
    expect((await Promise.all([first, middle, last])).map(result => result.success)).toEqual([true, false, true]);
    expect(written).toEqual(['first', 'last']);
});

it('a deleted file is re-read without cancelling a verified separate read', async () => {
    distinct(); const gate=deferred<void>(); const disk=new Map([['/ß.wrk','KEPT'],['/SS.wrk','DELETED']]);
    const left=readFileConsistently('/ß.wrk',async()=>{const result=disk.get('/ß.wrk');await gate.promise;return result;});
    let reads=0;
    const right=readFileConsistently('/SS.wrk',async()=>{reads++;const result=disk.get('/SS.wrk');await gate.promise;return result;});
    await runFileMutation(['/SS.wrk'],async()=>{disk.delete('/SS.wrk');return {success:true};});gate.resolve();
    expect(await left).toBe('KEPT');expect(await right).toBeUndefined();expect(reads).toBe(2);
});

it('a folder deletion reuses parent identities and retains a separate folder read', async () => {
    rememberDirectoryIdentity('/SS/Nested/', '/ß/Nested/');
    rememberDirectoryIdentity('/ss/Nested/', '/ss/Nested/');
    rememberFileIdentity('/SS/Nested/a.wrk', '/ß/Nested/a.wrk');
    rememberFileIdentity('/ss/Nested/a.wrk', '/ss/Nested/a.wrk');
    const gate=deferred<void>();let exists=true,removedReads=0,keptReads=0;
    const removed=readFileConsistently('/SS/Nested/a.wrk',async()=>{removedReads++;const result=exists?'REMOVED':undefined;await gate.promise;return result;});
    const kept=readFileConsistently('/ss/Nested/a.wrk',async()=>{keptReads++;await gate.promise;return 'KEPT';});
    await runFileMutation(['/ß'],async()=>{exists=false;return {success:true};});gate.resolve();
    expect(await removed).toBeUndefined();expect(await kept).toBe('KEPT');expect(removedReads).toBe(2);expect(keptReads).toBe(1);
    expect(hasFileIdentity('/ss/Nested/a.wrk')).toBe(true);expect(hasFileIdentity('/SS/Nested/a.wrk')).toBe(false);
});

it('all observed aliases of the same file cancel together, and a new file need not wait for them', async () => {
    rememberFileIdentity('/SS.wrk', '/ß.wrk'); rememberFileIdentity('/ß.wrk', '/ß.wrk');
    const gate = deferred<void>(), stale = jest.fn(async () => ({ success: true }));
    const first = queueFileWrite('/SS.wrk', async () => { await gate.promise; return { success: true }; });
    const second = queueFileWrite('/ß.wrk', stale);
    cancelPendingFileWrites('/ß.wrk');
    const third=queueFileWrite('/ß.wrk',async()=>({success:true}));
    gate.resolve();expect((await Promise.all([first,second,third])).map(result=>result.success)).toEqual([true,false,true]);
    expect(stale).not.toHaveBeenCalled();
});

it('logout cancels unsent work but keeps a dispatched same-path reservation', async () => {
    distinct(); const gate = deferred<void>(), stale = jest.fn(async () => ({ success: true }));
    const first = queueFileWrite('/ß.wrk', async () => { await gate.promise; return { success: true }; });
    const second = queueFileWrite('/SS.wrk', stale,{beforeWrite:async()=>true}), third = queueFileWrite('/ß.wrk', stale);
    cancelPendingFileWrites('/SS.wrk'); cancelAllPendingFileWrites();
    expect(await queueFileWrite('/ß.wrk', async () => ({ success: true }))).toMatchObject({fileMutationBlocked:true});
    expect(await queueFileWrite('/independent.wrk',async()=>({success:true}))).toEqual({success:true});
    gate.resolve(); expect((await Promise.all([first, second, third])).map(result => result.success)).toEqual([false, false, false]);
    expect(stale).not.toHaveBeenCalled();
});

it.each(['wrk', 'dsh'])('%s keeps a reverted draft dirty after deleting a verified distinct file', async type => {
    const name = 'ß.' + type;
    rememberFileIdentity('/' + name, '/' + name); rememberFileIdentity('/SS.' + type, '/SS.' + type);
    const payload = (value: string) => type === 'wrk' ? { sheet: [{ id: 'cell', contents: value }] } : { dashboard: { title: value } };
    const previous = payload('OLD'), savedCode = JSON.stringify(type === 'wrk' ? previous.sheet : previous.dashboard);
    let boards: any[] = [{ id: 'owner', path: '/', name, type, code: '', savedCode, ...payload('FIRST') }];
    const gate = deferred<void>(); let entered = false, disk: any;
    jest.mocked(request).mockImplementation(async (config: any) => { entered = true; await gate.promise; disk = config.data; return { success: true } as any; });
    const saving = saveBoardFile({ board: boards[0], getSaveBoards: () => boards,
        onSuccess: submitted => { boards = applyFileSaveResult(boards, { path: '/', name }, type, submitted); },
        onUncertain: (target = { path: '/', name }) => { boards = invalidateFileSaveResult(boards, target); },
    });
    for (let i = 0; i < 100 && !entered; i++) await Promise.resolve(); expect(entered).toBe(true);
    boards = [{ ...boards[0], ...previous }]; cancelPendingFileWrites('/SS.' + type); gate.resolve();
    expect(await saving).toBe(true);
    expect(type === 'wrk' ? disk.data[0].contents : disk.dashboard.title).toBe('FIRST');
    expect(type === 'wrk' ? boards[0].sheet[0].contents : boards[0].dashboard.title).toBe('OLD');
    expect(boards[0].id).toBe('owner'); expect(isBoardSaved(boards[0])).toBe(false);
});

it('an unresolved cancellation cannot leave a surviving reverted draft marked saved', async () => {
    rememberFileIdentity('/ß.sql', '/ß.sql');
    const gate = deferred<void>(); let entered = false;
    let boards = [{ id: 'owner', name: 'ß.sql', path: '/', type: 'sql', code: 'FIRST', savedCode: 'OLD' }];
    jest.mocked(request).mockImplementation(async () => { entered = true; await gate.promise; return { success: true } as any; });
    const saving = saveBoardFile({ board: boards[0], getSaveBoards: () => boards,
        onSuccess: submitted => { boards = applyFileSaveResult(boards, { path: '/', name: 'ß.sql' }, 'sql', submitted); },
        onUncertain: (target = { path: '/', name: 'ß.sql' }) => { boards = invalidateFileSaveResult(boards, target); },
    });
    for (let i = 0; i < 100 && !entered; i++) await Promise.resolve(); expect(entered).toBe(true);
    forgetFileIdentities(); boards = [{ ...boards[0], code: 'OLD' }];
    cancelPendingFileWrites('/SS.sql'); gate.resolve(); await saving;
    expect(boards[0].code).toBe('OLD'); expect(isBoardSaved(boards[0])).toBe(false);
});

it.each(['wrk', 'dsh'])('keeps a verified separate %s tab clean when a pending target proves distinct after deletion', async type => {
  const payload = (value: string) => type === 'wrk' ? { data: [{ id: 'cell', contents: value }] } : { dashboard: { title: value } };
  const disk = new Map(['SS', 'ß'].map(stem => ['/' + stem + '.' + type, JSON.stringify(payload(stem))]));
  const removed = '/SS.' + type, unresolved = '/ss.' + type, kept = '/ß.' + type;
  // Linux: two different real entries; Save As will create a third file, ss.
  const peer = { id: 'kept-tab', path: '/', name: 'ß.' + type, type, code: '',
    ...(type === 'wrk' ? { sheet: payload('ß').data } : payload('ß')),
    savedCode: JSON.stringify(type === 'wrk' ? payload('ß').data : payload('ß').dashboard) };
  const owner = { ...peer, id: 'queued-owner', name: 'draft.' + type, path: '', savedCode: false };
  const target = { path: '/', name: 'ss.' + type };
  let boards: any[] = [owner, peer];
  const untouched = JSON.parse(JSON.stringify(peer));
  let release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  const posts: string[] = [];
  jest.mocked(request).mockImplementation(async (config: any) => {
    const path = decodeURIComponent(config.url.replace('/api/files', ''));
    if (config.method === 'GET') return path === '/'
      ? { success: true, data: { isDir: true, children: [...disk.keys()].map(path => ({ name: path.slice(1) })) } } as any
      : (disk.get(path) ?? { status: 404, headers: {}, data: { reason: 'missing' } }) as any;
    if (config.method === 'DELETE') { disk.delete(path); return { success: true } as any; }
    posts.push(path); disk.set(path, typeof config.data === 'string' ? config.data : JSON.stringify(config.data)); await gate;
    return { success: true } as any;
  });
  await resolveOverwrite('/', 'SS.' + type, async () => true);
  await resolveOverwrite('/', 'ß.' + type, async () => true);
  const blocker = postFileList('HELD', '/', 'SS.' + type);
  const queued = saveBoardFile({ board: owner, target, saveAs: true, getSaveBoards: () => boards,
    onSuccess: submitted => { boards = applyFileSaveResult(boards, target, type, submitted); },
    onUncertain: (uncertainTarget = target) => { boards = invalidateFileSaveResult(boards, uncertainTarget); },
  });
  expect(getFileMutationRelation(kept, removed)).toBe('different');
  expect(getFileMutationRelation(unresolved, removed)).toBe('unknown');
  // The reservation now covers the lookup too. Wait for the server proof
  // that ss is separate, rather than treating an unobserved alias as clean.
  for (let i = 0; i < 100 && !hasFileIdentity(unresolved); i++) await Promise.resolve();
  expect(hasFileIdentity(unresolved)).toBe(true);
  expect(isBoardSaved(peer)).toBe(true);
  const deleting=deleteFile('/', 'SS.' + type);
  release();await blocker;await deleting;
  expect(await queued).toBe(true);
  expect(posts).toEqual([removed,unresolved]); // The lookup proved the new target is a separate entry.
  expect(disk.has(removed)).toBe(false);expect(disk.has(unresolved)).toBe(true);
  expect(disk.get(kept)).toBe(JSON.stringify(payload('ß')));
  expect(boards[1]).toEqual(untouched);
  expect(isBoardSaved(boards[1])).toBe(true);
});
