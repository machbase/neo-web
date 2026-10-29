import request from '@/api/core';
import {postFileList} from './api';
import {deleteFile, moveFile} from './fileTree';
import {cancelAllPendingFileWrites, readFileConsistently} from './fileWriteQueue';

jest.mock('@/api/core', () => ({__esModule: true, default: jest.fn()}));
const http = jest.mocked(request);
const deferred = <T,>() => {let resolve!: (v: T) => void; const promise = new Promise<T>(r => {resolve = r;}); return {promise, resolve};};
const turns = async () => {for (let i = 0; i < 40; i++) await Promise.resolve();};
let serial = 0;
const path = () => `/contract-${++serial}/a.sql`;
beforeEach(() => {cancelAllPendingFileWrites(); http.mockReset();});
afterEach(() => cancelAllPendingFileWrites());

test('a dispatched successful Save is acknowledged before a failed move', async () => {
 const source = path(), gate = deferred<any>(), acknowledgements: string[] = [];
 http.mockImplementation(async (c: any) => c.method === 'POST' ? gate.promise : {status: 500, data: {success: false, reason: 'target exists'}, headers: {}} as any);
 const saving = postFileList('STORED', source.slice(0, source.lastIndexOf('/')), 'a.sql', {onResult: r => {if (r.success) acknowledgements.push('STORED');}});
 await turns(); const moving = moveFile(source, source + '.copy');
 gate.resolve({success: true}); await Promise.all([saving, moving]);
 expect(acknowledgements).toEqual(['STORED']);
});

test('delete waits for a dispatched Save and cancels only the unsent later Save', async () => {
 const source = path(), gate = deferred<any>(), methods: string[] = [];
 http.mockImplementation(async (c: any) => {methods.push(c.method); return (c.method === 'POST' ? gate.promise : {success: true}) as any;});
 const a = postFileList('FIRST', source.slice(0, source.lastIndexOf('/')), 'a.sql');
 const b = postFileList('CANCELLED', source.slice(0, source.lastIndexOf('/')), 'a.sql');
 const deleting = deleteFile(source.slice(0, source.lastIndexOf('/')), 'a.sql');
 await turns(); expect(methods).toEqual(['POST']);
 gate.resolve({success: true}); await Promise.all([a,b,deleting]); expect(methods).toEqual(['POST','DELETE']);
});

test('a lost Save blocks a later write even when GET shows the requested bytes', async () => {
 const source = path(); const calls: string[] = [];
 http.mockImplementation(async (c: any) => {calls.push(c.method); return (c.method === 'POST' ? {isAxiosError: true, message: 'lost'} : 'SAME') as any;});
 await postFileList('SAME', source.slice(0, source.lastIndexOf('/')), 'a.sql');
 const next = await postFileList('LATER', source.slice(0, source.lastIndexOf('/')), 'a.sql');
 expect(next).toMatchObject({success: false}); expect(calls.filter(x => x === 'POST')).toHaveLength(1);
});

test('GET cannot release a move whose acknowledgement was lost', async () => {
 const source = path(), target = source + '.copy'; const calls: string[] = [];
 http.mockImplementation(async (c: any) => {calls.push(c.method); return (c.method === 'PUT' ? {isAxiosError: true} : c.method === 'GET' ? c.url.endsWith('.copy') ? 'BODY' : {status:404,headers:{},data:{reason:'missing'}} : {success:true}) as any;});
 await moveFile(source,target);
 expect(await postFileList('MUST NOT SEND',target.slice(0,target.lastIndexOf('/')),'a.sql.copy')).toMatchObject({success:false});
 expect(calls.filter(x=>x==='POST')).toEqual([]);
});

test('logout preserves an old dispatched path reservation but leaves another path usable', async () => {
 const source = path(), gate = deferred<any>(), sent: string[] = [];
 http.mockImplementation(async (c:any) => {sent.push(c.url); return (sent.length === 1 ? gate.promise : {success:true}) as any;});
 const old = postFileList('OLD',source.slice(0,source.lastIndexOf('/')),'a.sql');
 await turns(); cancelAllPendingFileWrites();
 const blocked = await postFileList('NEW',source.slice(0,source.lastIndexOf('/')),'a.sql');
 expect(blocked).toMatchObject({success:false});
 expect(await postFileList('OTHER','/','unrelated-contract.sql')).toMatchObject({success:true});
 gate.resolve({success:true}); await old;
 expect(await postFileList('NOW SAFE',source.slice(0,source.lastIndexOf('/')),'a.sql')).toMatchObject({success:true});
});

test('logout does not release the protection of a permanently lost request', async () => {
 const source = path(); http.mockResolvedValue({isAxiosError:true,message:'lost'} as any);
 await postFileList('OLD',source.slice(0,source.lastIndexOf('/')),'a.sql');cancelAllPendingFileWrites();
 expect(await postFileList('NEW',source.slice(0,source.lastIndexOf('/')),'a.sql')).toMatchObject({success:false});
 expect(http).toHaveBeenCalledTimes(1);
});

test('an old read after logout never reaches the new session', async () => {
 const gate=deferred<string>(); const reading=readFileConsistently(path(),()=>gate.promise);
 cancelAllPendingFileWrites();gate.resolve('OLD');expect(await reading).toMatchObject({success:false});
});

test('a fresh read stays saved when later parent identity proves an older write was separate',async()=>{
 const {rememberDirectoryIdentity}=await import('@/utils/fileIdentity');
 const {queueFileWrite,stampFileSnapshot}=await import('./fileWriteQueue');
 const {isBoardSaved}=await import('@/utils/boardSaveStatus');
 const lower='/history-contract/src/',upper='/history-contract/SRC/';
 rememberDirectoryIdentity(lower,lower);
 await queueFileWrite(lower+'a.sql',async()=>({success:true}));
 const board={id:'fresh-history-read',path:upper,name:'a.sql',type:'sql',code:'UPPER',savedCode:'UPPER'};
 stampFileSnapshot(board,upper+'a.sql');expect(isBoardSaved(board)).toBe(true);
 rememberDirectoryIdentity(upper,upper);
 expect(isBoardSaved(board)).toBe(true);
});

test('a real file change after a snapshot still invalidates that snapshot',async()=>{
 const {queueFileWrite,stampFileSnapshot}=await import('./fileWriteQueue');
 const {isBoardSaved}=await import('@/utils/boardSaveStatus');
 const board={id:'before-later-write',path:'/',name:'later-change.sql',type:'sql',code:'OLD',savedCode:'OLD'};
 stampFileSnapshot(board,'/later-change.sql');expect(isBoardSaved(board)).toBe(true);
 await queueFileWrite('/later-change.sql',async()=>({success:true}));
 expect(isBoardSaved(board)).toBe(false);
});
