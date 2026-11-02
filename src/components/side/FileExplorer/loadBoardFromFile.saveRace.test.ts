import request from '@/api/core';
import { loadBoardFromFile } from './loadBoardFromFile';
import { saveBoardFile } from '@/utils/boardFileSave';
import { cancelAllPendingFileWrites, runFileMutation } from '@/api/repository/fileWriteQueue';
import { rememberFileIdentity } from '@/utils/fileIdentity';
import { isBoardSaved } from '@/utils/boardSaveStatus';

jest.mock('@/api/core', () => ({__esModule:true, default:jest.fn()}));
const http=jest.mocked(request);
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r});return {resolve,promise}};
beforeEach(()=>{cancelAllPendingFileWrites();http.mockReset();rememberFileIdentity('/case.sql','/case.sql')});

test('a late open response is re-read after a completed write and survives a rejected follow-up',async()=>{
    let disk='OLD',readStarted=false,writeStarted=false;
    const readGate=deferred<void>(),writeGate=deferred<void>();
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET'){
            const content=disk;
            if(!readStarted){readStarted=true;await readGate.promise;}
            return content;
        }
        if(writeStarted)return {success:false};
        writeStarted=true;await writeGate.promise;disk=config.data;return {success:true};
    });
    const owner={id:'closed-owner',path:'/',name:'case.sql',type:'sql',code:'FIRST',savedCode:'OLD'};
    const first=saveBoardFile({board:owner,onSuccess:jest.fn(),onUncertain:jest.fn()});
    for(let i=0;i<100&&!writeStarted;i++)await Promise.resolve();expect(writeStarted).toBe(true);
    const opened=loadBoardFromFile({path:'/',name:'case.sql'},'late-tab');
    for(let i=0;i<100&&!readStarted;i++)await Promise.resolve();expect(readStarted).toBe(true);
    writeGate.resolve();await first;readGate.resolve();
    const result=await opened;expect(result.error).toBeUndefined();
    expect(result.board).toMatchObject({id:'late-tab',code:'FIRST',savedCode:'FIRST'});
    const draft={...result.board,code:'SECOND'};
    expect(await saveBoardFile({board:draft,onSuccess:jest.fn(),onUncertain:jest.fn()})).toBe(false);
    expect(disk).toBe('FIRST');expect(draft.code).toBe('SECOND');expect(isBoardSaved(draft)).toBe(false);
});

for(const cancelled of ['logout','delete'] as const)test(`late open cannot publish a stale file across ${cancelled}`,async()=>{
    const gate=deferred<void>();let exists=true,reads=0;
    http.mockImplementation(async()=>{reads++;const result=exists?'OLD':{status:404,headers:{},data:{reason:'missing'}};if(reads===1)await gate.promise;return result as any;});
    const opened=loadBoardFromFile({path:'/',name:'case.sql'});
    for(let i=0;i<100&&!reads;i++)await Promise.resolve();expect(reads).toBe(1);
    if(cancelled==='logout')cancelAllPendingFileWrites();else await runFileMutation(['/case.sql'],async()=>{exists=false;return {success:true};});
    gate.resolve();const result=await opened;expect(result.board).toBeUndefined();expect(result.error).toEqual(expect.any(String));
});

test('a write beginning after the read also makes a late response re-read',async()=>{
    const gate=deferred<void>();let disk='OLD',reads=0;
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET'){const captured=disk;if(++reads===1)await gate.promise;return captured;}
        disk=config.data;return {success:true};
    });
    const opening=loadBoardFromFile({path:'/',name:'case.sql'},'late');
    await saveBoardFile({board:{id:'owner',path:'/',name:'case.sql',type:'sql',code:'FIRST'},onSuccess:jest.fn(),onUncertain:jest.fn()});
    gate.resolve();const result=await opening;
    expect(result.board).toMatchObject({code:'FIRST',savedCode:'FIRST'});expect(reads).toBe(2);
});

test('late read confirms real bytes after success, rejection and a lost write response',async()=>{
    const gate=deferred<void>();let disk='OLD',reads=0;
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET'){const captured=disk;if(++reads===1)await gate.promise;return captured;}
        if(config.data==='REJECTED')return {success:false};
        disk=config.data;if(config.data==='LAST')throw new Error('response lost');return {success:true};
    });
    const opening=loadBoardFromFile({path:'/',name:'case.sql'},'late');
    const save=(code:string)=>saveBoardFile({board:{id:'owner',path:'/',name:'case.sql',type:'sql',code},onSuccess:jest.fn(),onUncertain:jest.fn()});
    await save('FIRST');await save('REJECTED');await expect(save('LAST')).rejects.toThrow('response lost');gate.resolve();
    const result=await opening;expect(result.board).toMatchObject({code:'LAST',savedCode:'LAST'});expect(reads).toBe(3);expect(isBoardSaved(result.board)).toBe(false);
});

test('an old-session physical write completion rechecks bytes without applying an old UI result',async()=>{
    const oldGate=deferred<void>(),readGate=deferred<void>();let started=false,reads=0;
    http.mockImplementation(async(config:any)=>{
        if(config.method==='POST'){started=true;await oldGate.promise;return {success:true};}
        reads++;await readGate.promise;return 'NEW ACCOUNT';
    });
    const old=saveBoardFile({board:{id:'old',path:'/',name:'case.sql',type:'sql',code:'OLD'},onSuccess:jest.fn(),onUncertain:jest.fn()});
    for(let i=0;i<100&&!started;i++)await Promise.resolve();expect(started).toBe(true);cancelAllPendingFileWrites();const opening=loadBoardFromFile({path:'/',name:'case.sql'},'new');
    oldGate.resolve();expect(await old).toBe(false);readGate.resolve();const result=await opening;
    expect(result.board).toMatchObject({code:'NEW ACCOUNT',savedCode:'NEW ACCOUNT'});expect(reads).toBe(2);
});

test('folder mutation rechecks descendant reads while a neighbouring folder survives',async()=>{
    const gate=deferred<void>();let exists=true;
    http.mockImplementation(async(config:any)=>{const removed=config.url.includes('/d/nested/');const result=removed&&!exists?{status:404,headers:{},data:{reason:'missing'}}:'KEPT';await gate.promise;return result as any;});
    const descendant=loadBoardFromFile({path:'/d/nested/',name:'case.sql'}),neighbour=loadBoardFromFile({path:'/d2/',name:'case.sql'});
    await runFileMutation(['/D'],async()=>{exists=false;return {success:true};});gate.resolve();
    expect((await descendant).error).toEqual(expect.any(String));expect((await neighbour).board).toMatchObject({code:'KEPT',savedCode:'KEPT'});
});
