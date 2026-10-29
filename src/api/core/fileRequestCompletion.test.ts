jest.mock('@/design-system/components', () => ({ Toast: { error: jest.fn(), success: jest.fn() } }));
import request from '@/api/core';
import {postFileList} from '@/api/repository/api';
import {moveFile} from '@/api/repository/fileTree';
import {cancelAllPendingFileWrites,hasPendingFileWrite,isFileStateUnconfirmed} from '@/api/repository/fileWriteQueue';
const defer=()=>{let resolve!:()=>void;return {promise:new Promise<void>(r=>resolve=r),resolve:()=>resolve()};};
const original=request.defaults.adapter;
afterEach(()=>{request.defaults.adapter=original;});
for(const kind of ['write','move'])for(const refreshStarted of [false,true])test(`${kind} terminal 401 then logout, refresh started=${refreshStarted}`,async()=>{
 const entered=defer(),gate=defer(),calls:string[]=[];
 request.defaults.adapter=async config=>{
  calls.push(config.method+' '+config.url);
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
  if(config.url==='/api/relogin'){entered.resolve();await gate.promise;return ok({success:true,accessToken:'oldnew',refreshToken:'oldnew'});}
  if(calls.filter(x=>x.includes('/api/files/')).length===1){
   if(!refreshStarted){entered.resolve();await gate.promise;}
   throw {isAxiosError:true,config,response:{status:401,config,headers:{},data:{success:false,reason:'expired'}}};
  }
  return ok({success:true});
 };
 localStorage.setItem('refreshToken','old');
 const pending=kind==='write'?postFileList('OLD','/','terminal-401.sql'):moveFile('/terminal-401.sql','/moved-401.sql');
 await entered.promise;cancelAllPendingFileWrites();
 gate.resolve();await pending;
 const state={pending:hasPendingFileWrite('/terminal-401.sql'),unknown:isFileStateUnconfirmed('/terminal-401.sql')};
 const next=await postFileList('NEW','/','terminal-401.sql');
 expect(state).toEqual({pending:false,unknown:false});
 expect(next).toMatchObject({success:true});
 expect(calls.filter(call=>/^(post|put) \/api\/files/.test(call))).toHaveLength(2);
});
for(const status of [200,500])test(`late ${status} terminal response after logout releases path control`,async()=>{
 const entered=defer(),gate=defer();let files=0;
 request.defaults.adapter=async config=>{
  files++;if(files===1){entered.resolve();await gate.promise;}
  const result={data:files===1&&status===500?{success:false,reason:'terminal'}:{success:true},status:files===1?status:200,statusText:'OK',headers:{},config};
  if(result.status===500)throw {isAxiosError:true,config,response:result};return result;
 };
 const old=postFileList('OLD','/','terminal-control.sql');await entered.promise;cancelAllPendingFileWrites();gate.resolve();await old;
 expect(isFileStateUnconfirmed('/terminal-control.sql')).toBe(false);
 expect(await postFileList('NEW','/','terminal-control.sql')).toMatchObject({success:true});expect(files).toBe(2);
});

import {stampFileSnapshot} from '@/api/repository/fileWriteQueue';
import {isBoardSaved} from '@/utils/boardSaveStatus';
for (const kind of ['write', 'delete']) test(`${kind} terminal 401 cannot dirty a new-login read snapshot`, async () => {
    const entered = defer(), gate = defer();
    request.defaults.adapter = async config => {
        entered.resolve(); await gate.promise;
        throw {isAxiosError: true, config, response: {status: 401, config, headers: {}, data: {success: false, reason: 'expired'}}};
    };
    const pending = kind === 'write' ? postFileList('OLD', '/', 'read-401.sql') : deleteFile('/', 'read-401.sql');
    await entered.promise; cancelAllPendingFileWrites();
    const board = stampFileSnapshot({id: 'new-reader', type: 'sql', name: 'read-401.sql', path: '/', code: 'STORED', savedCode: 'STORED'}, '/read-401.sql');
    gate.resolve(); await pending;
    expect(isBoardSaved(board)).toBe(true);
    expect(isFileStateUnconfirmed('/read-401.sql')).toBe(false);
});
import {deleteFile} from '@/api/repository/fileTree';
