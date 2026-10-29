import request from '@/api/core';
import { cancelAllPendingFileWrites, UncertainFileWriteError, queueFileWrite } from '@/api/repository/fileWriteQueue';
import { hasPendingBoardSave, saveBoardFile } from './boardFileSave';
import { applyFileSaveResult, applySaveAsResult, invalidateFileSaveResult, applyFileReadResult } from './boardSaveResult';
import { isBoardSaved } from './boardSaveStatus';
import { forgetFileIdentities, rememberFileIdentity, hasFileIdentity } from './fileIdentity';

jest.mock('@/api/core', () => ({__esModule: true, default: jest.fn()}));
const http = jest.mocked(request);
const board = (id: string, name: string, code: string) => ({id, name, path: '/', type: 'sql', code, savedCode: 'OLD'});
const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => {resolve = r;});
    return {promise, resolve};
};
beforeEach(() => {
    cancelAllPendingFileWrites(); forgetFileIdentities(); http.mockReset().mockResolvedValue({success:true});
    for (const name of ['new.sql','copy.sql','other.sql','a.sql','a.wrk','a.taz']) rememberFileIdentity('/'+name,'/'+name);
});

test('checks a queued target after the preceding write and acknowledges before starting the next write', async () => {
    const first = deferred<any>(), order: string[] = [];
    http.mockImplementationOnce(() => {order.push('write FIRST');return first.promise;})
        .mockImplementationOnce(async () => {order.push('write SECOND');return {success:true};});
    const save = (id: string) => saveBoardFile({board:board(id,'new.sql',id),
        beforeWrite: async () => {order.push('check '+id);return true;},
        onSuccess: () => {order.push('ack '+id);}, onUncertain: jest.fn()});
    const a = save('FIRST'), b = save('SECOND');
    expect(hasPendingBoardSave('FIRST')).toBe(true);expect(hasPendingBoardSave('SECOND')).toBe(true);
    await Promise.resolve();first.resolve({success:true});await a;await b;
    expect(order).toEqual(['check FIRST','write FIRST','ack FIRST','check SECOND','write SECOND','ack SECOND']);
    expect(hasPendingBoardSave('FIRST')).toBe(false);expect(hasPendingBoardSave('SECOND')).toBe(false);
});

test('tracks every request of an owner, including an older request after a newer one fails', async () => {
    const old = deferred<any>();http.mockImplementationOnce(() => old.promise).mockResolvedValueOnce({success:false});
    const a = saveBoardFile({board:board('owner','copy.sql','OLD REQUEST'),onSuccess:jest.fn(),onUncertain:jest.fn()});
    await saveBoardFile({board:board('owner','other.sql','NEW REQUEST'),onSuccess:jest.fn(),onUncertain:jest.fn()});
    expect(hasPendingBoardSave('owner')).toBe(true);old.resolve({success:false});await a;expect(hasPendingBoardSave('owner')).toBe(false);
});

test('preserves a destination tab that is saving to another file even when that save later fails', async () => {
    const first = deferred<any>();http.mockImplementationOnce(() => first.promise);
    let boards = [board('a','a.sql','DRAFT A'),board('b','b.sql','DRAFT B')];
    const a = saveBoardFile({board:boards[0],target:{path:'/',name:'copy.sql'},onSuccess:jest.fn(),onUncertain:jest.fn()});
    await saveBoardFile({board:boards[1],target:{path:'/',name:'a.sql'},onUncertain:jest.fn(),onSuccess:(submitted,context) => {
        boards = applySaveAsResult(boards,{owner:boards[1],target:{path:'/',name:'a.sql'},fileType:'sql',submitted,
            sourceIsCurrent:true,confirmed:true,previousBoards:new Map(boards.map(b=>[b.id,b])),isSaving:context.isSaving});
    }});
    first.resolve({success:false});await a;
    expect(boards).toEqual([board('a','a.sql','DRAFT A'),board('b','b.sql','DRAFT B')].map(b=>b.id==='a'?{...b,savedCode:'DRAFT B'}:b));
});

test('freezes an object payload before waiting in the queue', async () => {
    const first = deferred<any>();http.mockImplementationOnce(() => first.promise);
    const a = saveBoardFile({board:board('a','a.wrk',''),onSuccess:jest.fn(),onUncertain:jest.fn()});
    const sheet = [{id:'cell',contents:'SUBMITTED'}];
    const b = saveBoardFile({board:{...board('b','a.wrk',''),type:'wrk',sheet},onSuccess:jest.fn(),onUncertain:jest.fn()});
    sheet[0].contents='LATER DRAFT';first.resolve({success:true});await a;await b;
    expect((http.mock.calls[1][0] as any).data).toEqual({data:[{id:'cell',contents:'SUBMITTED'}]});
});

for (const uncertain of [false,true]) test(`a ${uncertain?'lost response':'known failure'} is applied before the next success`, async () => {
    let boards = [board('a','a.sql','FINAL')];
    if(uncertain)http.mockRejectedValueOnce(new Error('response lost'));else http.mockResolvedValueOnce({success:false});
    const first = saveBoardFile({board:board('a','a.sql','FIRST'),onSuccess:jest.fn(),onUncertain:()=>{boards=invalidateFileSaveResult(boards,boards[0]);}});
    const failure = uncertain ? expect(first).rejects.toBeInstanceOf(UncertainFileWriteError) : expect(first).resolves.toBe(false);
    const next = saveBoardFile({board:board('a','a.sql','FINAL'),onUncertain:jest.fn(),onSuccess:submitted=>{boards=applyFileSaveResult(boards,boards[0],'sql',submitted);}});
    await failure;await next;expect(boards[0]).toMatchObject({code:'FINAL',savedCode:uncertain?false:'FINAL'});
    if(uncertain)expect(http).toHaveBeenCalledTimes(1);
});

test('cancellation while the final lookup waits sends no write and applies no result', async () => {
    const lookup = deferred<boolean>(), success=jest.fn(), unknown=jest.fn();
    const pending = saveBoardFile({board:board('a','a.sql','DRAFT'),beforeWrite:()=>lookup.promise,onSuccess:success,onUncertain:unknown});
    cancelAllPendingFileWrites();lookup.resolve(true);expect(await pending).toBe(false);
    expect(http).not.toHaveBeenCalled();expect(success).not.toHaveBeenCalled();expect(unknown).not.toHaveBeenCalled();
});

test('TAZ uses its existing serializer and acknowledges the serialized snapshot inside the queue', async () => {
    const onSuccess=jest.fn();
    await saveBoardFile({board:{...board('a','a.taz',''),type:'taz',version:'2.1.0',panels:[],boardTimeRange:{start:'now-2h',end:'now'},boardNumericRange:{start:'',end:''}},onSuccess,onUncertain:jest.fn()});
    expect((http.mock.calls[0][0] as any).data).toMatchObject({type:'taz',boardTimeRange:{start:'now-2h',end:'now'}});
    expect(onSuccess.mock.calls[0][0].savedCode).toContain('now-2h');expect(hasPendingBoardSave('a')).toBe(false);
});

test('ordinary Save learns an unknown case alias before acknowledging a failed revert from another tab', async () => {
    forgetFileIdentities();
    let disk = 'OLD';
    let boards = [board('upper','A.sql','FIRST'),board('lower','a.sql','OLD')];
    http.mockImplementation(async (config: any) => {
        if (config.method === 'GET') return config.url.endsWith('/')
            ? {data:{isDir:true,children:[{name:'a.sql',type:'.sql'}]}} : disk;
        if (config.url.endsWith('/a.sql')) return {success:false};
        disk = config.data;
        return {success:true};
    });
    const save = (source: typeof boards[number]) => saveBoardFile({board:source,
        onSuccess: submitted => {boards=applyFileSaveResult(boards,source,'sql',submitted);},
        onRead:loaded=>{boards=applyFileReadResult(boards,loaded)},onUncertain: () => {boards=invalidateFileSaveResult(boards,source);}});
    await save(boards[0]);await save(boards[1]);
    expect(disk).toBe('FIRST');
    expect(boards.map(b=>[b.id,b.code,b.savedCode])).toEqual([['upper','FIRST','FIRST'],['lower','OLD','FIRST']]);
});

for(const uncertain of [false,true]) test(`a later action through another entry point supersedes Save As metadata even after its ${uncertain?'uncertain':'definite'} failure`,async()=>{
    const first=deferred<any>();
    http.mockImplementationOnce(()=>first.promise);
    if(uncertain)http.mockRejectedValueOnce(new Error('later response lost'));else http.mockResolvedValueOnce({success:false});
    let boards=[board('a','a.sql','FIRST'),board('b','b.sql','FIRST')];
    const before=new Map([[boards[0].id,boards[0]],[boards[1].id,{...boards[1],code:'OLD'}]]);
    const pending=saveBoardFile({board:boards[0],target:{path:'/',name:'b.sql'},saveAs:true,onUncertain:jest.fn(),
        onSuccess:(submitted,context)=>{boards=applySaveAsResult(boards,{owner:boards[0],target:{path:'/',name:'b.sql'},fileType:'sql',submitted,
            sourceIsCurrent:(context as {isLatestAction?:boolean}).isLatestAction??true,confirmed:true,previousBoards:before,isSaving:context.isSaving});}});
    await Promise.resolve();await Promise.resolve();
    const later=saveBoardFile({board:boards[0],onSuccess:jest.fn(),onUncertain:()=>{boards=invalidateFileSaveResult(boards,boards[0]);}});
    if(uncertain)await expect(later).rejects.toBeInstanceOf(UncertainFileWriteError);else await later;
    first.resolve({success:true});await pending;
    expect(boards.map(b=>[b.id,b.name,b.path,b.code])).toEqual([['a','a.sql','/','FIRST'],['b','b.sql','/','FIRST']]);
    expect(boards[1].savedCode).toBe('FIRST');
});

for (const outcome of ['success','failure','lost-after-write']) test(`identifies open folder aliases before the first write and follow-up ${outcome}`,async()=>{
    let disk = 'OLD';
    let boards = [{...board('upper','a.sql','FIRST'),path:'/Reports/'}, {...board('lower','a.sql','OLD'),path:'/reports/'}];
    const held=deferred<any>();let entered!:()=>void;const sent=new Promise<void>(resolve=>{entered=resolve;});
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET')return !config.url.endsWith('/')?disk:{success:true,data:{isDir:true,children:config.url==='/api/files/'
            ?[{name:'Reports',isDir:true}]:[{name:'a.sql',type:'.sql'}]}};
        if(config.url.includes('/reports/')){
            if(outcome==='failure')return {success:false};
            disk=config.data;if(outcome==='lost-after-write')throw new Error('response lost');return {success:true};
        }
        disk=config.data;entered();return held.promise;
    });
    const save=(owner:typeof boards[number])=>saveBoardFile({board:owner,getSaveBoards:()=>boards,
        onSuccess:submitted=>{boards=applyFileSaveResult(boards,owner,'sql',submitted);},
        onRead:loaded=>{boards=applyFileReadResult(boards,loaded)},onUncertain:()=>{boards=invalidateFileSaveResult(boards,owner);}});
    const first=save(boards[0]);await sent;const later=save(boards[1]);const completed=later.catch(()=>false);
    held.resolve({success:true});await first;await completed;
    expect(boards.map(b=>b.code)).toEqual(['FIRST','OLD']);
    expect(boards.map(b=>b.savedCode)).toEqual(outcome==='lost-after-write'?[false,false]:outcome==='success'?['OLD','OLD']:['FIRST','FIRST']);
    expect(disk).toBe(outcome==='failure'?'FIRST':'OLD');
});

test.each([false,true])('late-opened parent-folder alias receives previous ACK; ownerClose=%s',async(closeOwner)=>{
 let disk='OLD';
 const first=deferred<any>();let entered!:()=>void;const sent=new Promise<void>(r=>entered=r);
 const owner={id:'a',name:'a.sql',path:'/Reports/',type:'sql',code:'FIRST',savedCode:'OLD'};
 let boards=[owner];
 http.mockImplementation(async(config:any)=>{
  if(config.method==='GET')return !config.url.endsWith('/')?disk:{success:true,data:{isDir:true,children:config.url==='/api/files/'?[{name:'Reports',isDir:true}]:[{name:'a.sql',type:'.sql'}]}} as any;
  if(config.url.includes('/reports/'))return {success:false} as any;
  entered();await first.promise;disk=config.data;return {success:true} as any;
 });
 const save=(source:typeof owner)=>saveBoardFile({board:source,getSaveBoards:()=>boards,canApply:()=>boards.some(b=>b.id===source.id),onSuccess:submitted=>{boards=applyFileSaveResult(boards,source,'sql',submitted)},onUncertain:()=>{boards=invalidateFileSaveResult(boards,source)}});
 const pending=save(owner);await sent;
 const alias={...owner,id:'b',path:'/reports/',code:disk,savedCode:disk};boards=[...boards,alias];
 const later=save(alias);
 if(closeOwner)boards=boards.filter(b=>b.id!=='a');
 first.resolve(undefined);await pending;await later;
 expect(disk).toBe('FIRST');
 const b=boards.find(b=>b.id==='b')!;expect(b.code).toBe('OLD');expect(isBoardSaved(b)).toBe(false);
});

for (const aliasLookupFails of [false,true]) test(`late distinct folder keeps its baseline unless identity is unknown: ${aliasLookupFails}`, async () => {
    const first=deferred<any>();let sent=false, disk='OLD';
    const owner={...board('a','a.sql','FIRST'),path:'/Reports/'};
    let boards=[owner];
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET') {
            if(config.url==='/api/files/reports/' && aliasLookupFails) return {success:false,reason:'folder lookup failed'};
            return {success:true,data:{isDir:true,children:config.url==='/api/files/'
                ?[{name:'Reports',isDir:true},{name:'reports',isDir:true}]:[{name:'a.sql',type:'.sql'}]}};
        }
        sent=true;await first.promise;disk=config.data;return {success:true};
    });
    const saved=saveBoardFile({board:owner,getSaveBoards:()=>boards,
        onSuccess:submitted=>{boards=applyFileSaveResult(boards,owner,'sql',submitted)},
        onUncertain:(target=owner)=>{boards=invalidateFileSaveResult(boards,target)}});
    for(let turn=0;turn<80 && (!sent);turn++)await Promise.resolve();expect(!sent).toBe(false);
    const peer={...owner,id:'b',path:'/reports/',code:'OLD',savedCode:'OLD'};boards.push(peer);
    first.resolve(undefined);await saved;
    expect(disk).toBe('FIRST');expect(boards[0]).toMatchObject({code:'FIRST',savedCode:'FIRST'});
    expect(boards[1]).toMatchObject({code:'OLD',savedCode:aliasLookupFails?false:'OLD'});
});

test('acknowledgement discovers a third alias opened during its second alias lookup', async () => {
    const first=deferred<any>(),lookup=deferred<any>();let sent=false,looking=false;
    const owner={...board('a','a.sql','FIRST'),path:'/Reports/'};let boards=[owner];
    const listing={success:true,data:{isDir:true,children:[{name:'a.sql',type:'.sql'}]}};
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET') {
            if(config.url==='/api/files/reports/'){looking=true;return lookup.promise;}
            return config.url==='/api/files/'?{success:true,data:{isDir:true,children:[{name:'Reports',isDir:true}]}}:listing;
        }
        sent=true;await first.promise;return {success:true};
    });
    const saved=saveBoardFile({board:owner,getSaveBoards:()=>boards,
        onSuccess:submitted=>{boards=applyFileSaveResult(boards,owner,'sql',submitted)},onRead:loaded=>{boards=applyFileReadResult(boards,loaded)},onUncertain:jest.fn()});
    for(let turn=0;turn<80 && (!sent);turn++)await Promise.resolve();expect(!sent).toBe(false);boards.push({...owner,id:'b',path:'/reports/',code:'OLD',savedCode:'OLD'});first.resolve(undefined);
    for(let turn=0;turn<80 && (!looking);turn++)await Promise.resolve();expect(!looking).toBe(false);boards.push({...owner,id:'c',path:'/REPORTS/',code:'OLD',savedCode:'OLD'});lookup.resolve(listing);
    await saved;expect(boards.map(b=>b.savedCode)).toEqual(['FIRST','FIRST','FIRST']);expect(boards.map(b=>b.code)).toEqual(['FIRST','OLD','OLD']);
});

test('logout while the acknowledgement identifies a late alias applies no result or stale identity', async () => {
    const first=deferred<any>(),lookup=deferred<any>();let sent=false,looking=false;
    const owner={...board('a','a.sql','FIRST'),path:'/Reports/'};const boards=[owner],success=jest.fn(),unknown=jest.fn();
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET') {
            if(config.url==='/api/files/reports/'){looking=true;return lookup.promise;}
            return {success:true,data:{isDir:true,children:config.url==='/api/files/'?[{name:'Reports',isDir:true}]:[{name:'a.sql',type:'.sql'}]}};
        }
        sent=true;await first.promise;return {success:true};
    });
    const saved=saveBoardFile({board:owner,getSaveBoards:()=>boards,onSuccess:success,onUncertain:unknown});
    for(let turn=0;turn<80 && (!sent);turn++)await Promise.resolve();expect(!sent).toBe(false);boards.push({...owner,id:'b',path:'/reports/'});first.resolve(undefined);
    for(let turn=0;turn<80 && (!looking);turn++)await Promise.resolve();expect(!looking).toBe(false);cancelAllPendingFileWrites();lookup.resolve({success:true,data:{isDir:true,children:[{name:'a.sql',type:'.sql'}]}});
    expect(await saved).toBe(false);expect(success).toHaveBeenCalledTimes(1);expect(unknown).not.toHaveBeenCalled();expect(hasFileIdentity('/reports/a.sql')).toBe(false);
});

test('Save As binding must not depend on pending writes to a separate cased file',async()=>{
 cancelAllPendingFileWrites();http.mockReset();for(const name of ['a.sql','B.sql','b.sql'])rememberFileIdentity('/'+name,'/'+name);
 let boards=[{id:'source',name:'a.sql',path:'/',type:'sql',code:'FIRST',savedCode:'OLD'},
 {id:'dest',name:'B.sql',path:'/',type:'sql',code:'OLD',savedCode:'OLD'},
 {id:'lower',name:'b.sql',path:'/',type:'sql',code:'LOWERDRAFT',savedCode:'LOWEROLD'}];
 const previous=new Map(boards.map(b=>[b.id,b])); const gate=deferred<void>();let sent=0;
 http.mockImplementation(async(c:any)=>{sent++;if(c.url==='/api/files/B.sql'){await gate.promise;return {success:true}};return {success:false}});
 const owner=boards[0];const a=saveBoardFile({board:owner,target:{path:'/',name:'B.sql'},saveAs:true,getSaveBoards:()=>boards,
 onSuccess:(submitted,context)=>{boards=applySaveAsResult(boards,{owner,target:{path:'/',name:'B.sql'},fileType:'sql',submitted,sourceIsCurrent:context.isLatestAction,confirmed:true,previousBoards:previous,isSaving:context.isSaving})},onUncertain:jest.fn()});
 for(let turn=0;turn<80 && (sent===0);turn++)await Promise.resolve();expect(sent===0).toBe(false);expect(sent).toBe(1);
 const lower=boards[2];const b=saveBoardFile({board:lower,getSaveBoards:()=>boards,onSuccess:submitted=>{boards=applyFileSaveResult(boards,lower,'sql',submitted)},onUncertain:()=>{boards=invalidateFileSaveResult(boards,lower)}});
 gate.resolve();await a;await b;
 expect(boards.find(b=>b.id==='source')).toMatchObject({name:'B.sql',path:'/',code:'FIRST',savedCode:'FIRST'});
 expect(boards.map(b=>b.id)).toEqual(['source','lower']);
});

for(const includeUpper of [false,true])test(`pending-file comparison traverses the whole queue; same-file request=${includeUpper}`,async()=>{
    for(const name of ['B.sql','b.sql'])rememberFileIdentity('/'+name,'/'+name);
    const gate=deferred<any>();http.mockReturnValue(gate.promise as any);let saving: boolean|undefined;
    const first=saveBoardFile({board:board('owner','a.sql','FIRST'),target:{path:'/',name:'B.sql'},saveAs:true,
        onSuccess:(_submitted,context)=>{saving=context.isSaving({id:'upper-tab',path:'/',name:'B.sql'})},onUncertain:jest.fn()});
    await Promise.resolve();
    const targets=includeUpper?['B.sql','b.sql']:['b.sql'];
    const later=targets.map(name=>queueFileWrite('/'+name,async()=>({success:false})));
    gate.resolve({success:true});await first;await Promise.all(later);expect(saving).toBe(includeUpper);
});

test('TAZ reports the common protection reason when an earlier request is unknown',async()=>{
    const {postFileList}=await import('@/api/repository/api');
    http.mockResolvedValueOnce({isAxiosError:true,message:'response lost'});
    await postFileList('HELD','/','protected.taz');
    const onFailure=jest.fn();
    expect(await saveBoardFile({board:{...board('protected','protected.taz',''),type:'taz',version:'2.1.0',panels:[],boardTimeRange:{start:'now-2h',end:'now'},boardNumericRange:{start:'',end:''}},onSuccess:jest.fn(),onUncertain:jest.fn(),onFailure})).toBe(false);
    expect(onFailure).toHaveBeenCalledWith(expect.stringContaining('earlier file request is not confirmed'));
    expect(http.mock.calls.filter(([c])=>(c as any).method==='POST')).toHaveLength(1);
});

test.each(['wrk','dsh','taz'])('%s terminal readback uses the filename even when the target has a tab UUID',async type=>{
    const name='a.'+type;
    const values=type==='wrk'?{sheet:[{id:'cell',type:'mrk',contents:'CURRENT'}]}:type==='dsh'?{dashboard:{title:'CURRENT',panels:[],variables:[],distanceRange:{start:'',end:''},timeRange:{start:'now-1h',end:'now',refresh:'Off'}}}:{version:'2.1.0',panels:[],boardTimeRange:{start:'now-2h',end:'now'},boardNumericRange:{start:'',end:''}};
    let boards:any[]=[{...board('tab-uuid-without-extension',name,''),type,...values}],disk='';
    const loadedTypes:string[]=[];
    http.mockImplementation(async(config:any)=>{
        if(config.method==='GET')return config.url==='/api/files/'?{success:true,data:{isDir:true,children:[{name}]}}:disk as any;
        disk=typeof config.data==='string'?config.data:JSON.stringify(config.data);
        return {status:500,headers:{},data:{success:false,reason:'write ended after committing bytes'}} as any;
    });
    expect(await saveBoardFile({board:boards[0],getSaveBoards:()=>boards,onSuccess:jest.fn(),onUncertain:target=>{boards=invalidateFileSaveResult(boards,target??boards[0]);},onRead:loaded=>{loadedTypes.push(loaded.type);boards=applyFileReadResult(boards,loaded);}})).toBe(false);
    expect(loadedTypes).toEqual([type]);expect(isBoardSaved(boards[0])).toBe(true);expect(boards[0].id).toBe('tab-uuid-without-extension');
});
