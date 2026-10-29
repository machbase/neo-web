jest.mock('@/design-system/components',()=>({Toast:{error:jest.fn(),success:jest.fn()}}));
import {act,renderHook} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import request from '@/api/core';
import {moveFile} from '@/api/repository/fileTree';
import {postFileList} from '@/api/repository/api';
import {useFileMoveTabs} from '@/hooks/useFileMoveTabs';
import {gBoardList} from '@/recoil/recoil';
import {cancelAllPendingFileWrites,isFileStateUnconfirmed} from '@/api/repository/fileWriteQueue';
const turns=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const originalAdapter=request.defaults.adapter;
afterEach(()=>{request.defaults.adapter=originalAdapter;});
for(const type of ['wrk','dsh'])for(const old401 of [false,true])for(const releaseBeforeWrite of [false,true])test(type+' actual Axios core: successful PUT plus logout readback '+(old401?'401':'200')+', release before new write='+releaseBeforeWrite,async()=>{
 const name='a.'+type;
 const doc=type==='wrk'?{data:[{id:'cell',type:'mrk',contents:'STORED',height:200}]}:{dashboard:{title:'STORED',panels:[],variables:[],timeRange:{start:'now-1h',end:'now'}}};
 const board={id:'owner',name,path:'/src/',type,code:'',savedCode:false,...(type==='wrk'?{sheet:(doc as any).data}:doc)};
 const disk=new Map<string,any>([['/src/'+name,doc]]);let readStarted=false,putConfirmed=false,releaseRead!:()=>void;const readGate=new Promise<void>(resolve=>releaseRead=resolve);const sent:string[]=[];
 request.defaults.adapter=async(config:any)=>{
  const path=decodeURIComponent(config.url.replace('/api/files','')),method=config.method.toUpperCase();sent.push(method+' '+path);
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
  if(method==='PUT'){disk.set(JSON.parse(config.data).destination,disk.get(path));disk.delete(path);putConfirmed=true;return ok({success:true});}
  if(method==='POST'){disk.set(path,config.data);return ok({success:true});}
  if(path==='/')return ok({data:{isDir:true,children:[{name:'src',isDir:true},{name:'dest',isDir:true}]}});
  if(path==='/src/'||path==='/dest/')return ok({data:{isDir:true,children:[...disk.keys()].filter(k=>k.startsWith(path)).map(k=>({name:k.slice(path.length)}))}});
  if(path==='/dest/'+name&&putConfirmed){readStarted=true;await readGate;if(old401)throw {isAxiosError:true,config,response:{status:401,headers:{},config,data:{success:false,reason:'token expired'}}};}
  return ok(JSON.stringify(disk.get(path)));
 };
 const view=renderHook(()=>({moves:useFileMoveTabs(),state:useRecoilState(gBoardList)}),{wrapper:({children})=><RecoilRoot initializeState={({set})=>set(gBoardList,[board] as any)}>{children}</RecoilRoot>});
 let result:any;
 await act(async()=>{
  const moving=moveFile('/src/'+name,'/dest/'+name,view.result.current.moves('/src/'+name));await turns();if(!readStarted||!putConfirmed)throw new Error('readback not reached');
  cancelAllPendingFileWrites();
  if(releaseBeforeWrite){releaseRead();await moving;result=await postFileList('NEW','/dest/',name);}
  else{result=await postFileList('NEW','/dest/',name);releaseRead();await moving;}
 });
 view.unmount();if(isFileStateUnconfirmed('/dest/'+name))throw new Error('Confirmed PUT200 becomes permanently unknown only because the old readback returns 401 after logout');
 if(result?.success!==true)throw new Error('New-login save unexpectedly blocked');
});

import {deleteFile} from '@/api/repository/fileTree';
import {isBoardSaved} from '@/utils/boardSaveStatus';
import {stampFileSnapshot} from '@/api/repository/fileWriteQueue';

for (const type of ['wrk', 'dsh']) for (const partial of [false, true]) test(`${type} rejected deletion reads surviving files, partial=${partial}`, async () => {
    const name = 'a.' + type;
    const document = (title: string) => type === 'wrk'
        ? {data: [{id: 'cell', type: 'mrk', contents: title, height: 200}]}
        : {dashboard: {title, panels: [], variables: [], timeRange: {start: 'now-1h', end: 'now'}}};
    const original = document('ORIGINAL'), edited = partial ? document('KEEP UNSAVED EDIT') : original;
    const baseline = JSON.stringify(type === 'wrk' ? original.data : original.dashboard);
    const board: any = {id: 'owner', name, path: '/data/', type, code: '', savedCode: baseline,
        ...(type === 'wrk' ? {sheet: (edited as any).data} : edited)};
    const removable: any = {id: 'removable', type: 'txt', name: 'deleted.txt', path: '/data/', code: 'REMOVE', savedCode: 'REMOVE'};
    stampFileSnapshot(board, board.path + name); stampFileSnapshot(removable, '/data/deleted.txt');
    const draft: any = {id: 'draft', name: 'SQL', type: 'sql', path: '', code: 'KEEP DRAFT', savedCode: ''};
    const disk = new Map<string, string>([[name, JSON.stringify(original)], ['deleted.txt', 'REMOVE']]);
    request.defaults.adapter = async (config: any) => {
        const path = decodeURIComponent(config.url.replace('/api/files', ''));
        const response = (data: any, status = 200) => ({data, status, statusText: String(status), headers: {}, config});
        if (config.method === 'delete') {
            // Neo partial recursive deletion removes entries; it does not rewrite survivors.
            if (partial) disk.delete('deleted.txt');
            throw {isAxiosError: true, config, response: response({success: false, reason: 'directory not empty'}, partial ? 500 : 422)};
        }
        if (path === '/') return response({data: {isDir: true, children: [{name: 'data', isDir: true}]}});
        if (path === '/data/') return response({data: {isDir: true, children: [...disk.keys()].map(name => ({name}))}});
        const stored = disk.get(path.slice('/data/'.length));
        if (stored === undefined) throw {isAxiosError: true, config, response: response({success: false, reason: 'not found'}, 404)};
        return response(stored);
    };
    const view = renderHook(() => ({moves: useFileMoveTabs(), state: useRecoilState(gBoardList)}), {
        wrapper: ({children}) => <RecoilRoot initializeState={({set}) => set(gBoardList, [board, removable, draft])}>{children}</RecoilRoot>,
    });
    await act(async () => {await deleteFile('/', 'data', {recursive: partial, handlers: view.result.current.moves('/data')});});
    const current = view.result.current.state[0];
    expect(current[0]).toEqual(board); expect(current[1]).toEqual(removable); expect(current[2]).toEqual(draft);
    expect(disk.get(name)).toBe(JSON.stringify(original));
    expect(isBoardSaved(current[0])).toBe(!partial);
    // Undoing the surviving editor to the actual bytes is saved again. A missing
    // sibling must remain unsaved, so blanket 'unchanged on failure' is unsafe.
    const reverted = {...current[0], ...(type === 'wrk' ? {sheet: original.data} : original)};
    expect(isBoardSaved(reverted)).toBe(true);
    expect(isBoardSaved(current[1])).toBe(!partial);
    view.unmount();
});
