import React from 'react';
import {render,renderHook,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import {FileExplorer} from '@/components/side/FileExplorer';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import request from '@/api/core';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
import {getRequestSession} from '@/api/core/requestSession';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
const files=['one.wrk','two.dsh','three.wrk'];
const oldBoard=(id:string,name:string)=>({id,name,path:'/',type:name.split('.').at(-1),code:'',savedCode:JSON.stringify(name.endsWith('.wrk')?[{contents:'UNSAVED '+id}]:{title:'UNSAVED '+id,panels:[]}),sheet:[{contents:'UNSAVED '+id}],dashboard:{title:'UNSAVED '+id,panels:[]},panels:[],range_bgn:'',range_end:''});
const listing=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:files.map(name=>({name,isDir:false,type:'.'+name.split('.').at(-1),lastModifiedUnixMillis:1,gitClone:false,virtual:false}))}});
let setBoards:any,setVisible:any,latest:any;
function App(){const [boards,update]=useRecoilState(gBoardList);latest=boards;setBoards=update;const [visible,change]=React.useState(true);setVisible=change;return <>{visible&&<FileExplorer pGetInfo={jest.fn()} pDisplay/>}</>}
it.each([2,3])('old batch of %s must stop after logout, even when its component unmounts',async(batchSize)=>{
 let release!:()=>void;const held=new Promise<void>(r=>release=r);const requests:any[]=[];let count=0; const disk = new Map(files.map(name=>[name,'OLD '+name]));jest.mocked(request).mockReset();
 jest.mocked(request).mockImplementation(async(c:any)=>{if(c.method==='GET')return listing() as any;if(c.method==='DELETE'){requests.push({url:c.url,session:getRequestSession()});const name=decodeURIComponent(c.url.split('/').at(-1));disk.delete(name);count++;if(count===2)await held;return {success:true} as any;}return {success:true} as any;});
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,files.map((name,i)=>oldBoard('old'+i,name)) as any);}}><App/></RecoilRoot>);
 await screen.findByTestId('file-tree-item-%2Fone.wrk');
 for(const name of files.slice(0,batchSize))fireEvent.click(screen.getByTestId('file-tree-item-'+encodeURIComponent('/'+name)),{metaKey:true});
 fireEvent.contextMenu(screen.getByTestId('file-tree-item-%2Fone.wrk'));
 fireEvent.click(await screen.findByTestId('delete'));
 fireEvent.click(await screen.findByTestId('file-delete-confirm'));
 await waitFor(()=>expect(requests.length).toBe(2));
 const oldSession=getRequestSession();
 await act(async()=>{cancelAllPendingFileWrites();setVisible(false);disk.set('one.wrk','NEW USER ONE');disk.set('three.wrk','NEW USER THREE');setBoards([oldBoard('new-one','one.wrk'),oldBoard('new-three','three.wrk'),{...oldBoard('new-draft','draft.wrk'),path:''}]);});
 expect(getRequestSession()).not.toBe(oldSession);
 const beforeIds=latest.map((b:any)=>b.id);
 await act(async()=>{release();await held;for(let i=0;i<60;i++)await Promise.resolve();});
 if(requests.length!==2)throw new Error('Old batch dispatched '+requests[2].url+' in NEW login session '+requests[2].session+'; remaining disk='+JSON.stringify([...disk])+'; tabs='+latest.map((b:any)=>b.id));
 if(JSON.stringify(latest.map((b:any)=>b.id))!==JSON.stringify(beforeIds))throw new Error('Old batch removed NEW login tabs: before='+beforeIds+' after='+latest.map((b:any)=>b.id));
});

import {saveBoardFile} from '@/utils/boardFileSave';
import {applyFileSaveResult,applyFileReadResult,invalidateFileSaveResult} from '@/utils/boardSaveResult';
import {loadBoardFromFile} from '@/components/side/FileExplorer/loadBoardFromFile';
it('first deleted worksheet must not be recreated by Save while the batch waits for its second delete',async()=>{
 let release!:()=>void;const held=new Promise<void>(r=>release=r);let count=0;const requests:any[]=[];
 const disk=new Map(files.map(name=>[name,JSON.stringify({data:[{contents:'OLD '+name}]})]));
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  const name=decodeURIComponent(c.url.split('/').at(-1));
  if(c.method==='GET')return (name ? disk.get(name) ?? {status:404,headers:{},data:{success:false,reason:'not found'}} : {...listing(),data:{...listing().data,children:listing().data.children.filter((f:any)=>disk.has(f.name))}}) as any;
  if(c.method==='DELETE'){requests.push(c.method+' '+name);disk.delete(name);if(++count===2)await held;return {success:true} as any;}
  if(c.method==='POST'){requests.push(c.method+' '+name);disk.set(name,JSON.stringify(c.data));return {success:true} as any;}
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[oldBoard('first','one.wrk'),oldBoard('second','two.dsh'),{...oldBoard('draft','draft.wrk'),path:''}] as any);}}><App/></RecoilRoot>);
 await screen.findByTestId('file-tree-item-%2Fone.wrk');for(const name of files.slice(0,2))fireEvent.click(screen.getByTestId('file-tree-item-'+encodeURIComponent('/'+name)),{metaKey:true});fireEvent.contextMenu(screen.getByTestId('file-tree-item-%2Fone.wrk'));fireEvent.click(await screen.findByTestId('delete'));fireEvent.click(await screen.findByTestId('file-delete-confirm'));
 await waitFor(()=>expect(count).toBe(2));expect(disk.has('one.wrk')).toBe(false);
 // A confirmed deletion must be published before the next DELETE completes.
 try {
  expect(latest.map((b:any)=>b.id)).toEqual(['second','draft']);
  expect(disk.has('one.wrk')).toBe(false);
 } finally {await act(async()=>{release();for(let i=0;i<60;i++)await Promise.resolve();});}
 expect(latest.map((b:any)=>b.id)).toEqual(['draft']);
 expect(disk.has('one.wrk')).toBe(false);
});

import {isSameFilePath} from '@/utils/fileIdentity';
import {observeFileIdentity} from '@/utils/fileExistence';
it.each([true,false])('single delete must apply file identity to an open case alias; samePhysical=%s',async(samePhysical)=>{
 let disk:string|undefined=JSON.stringify({data:[{contents:'OLD'}]});const upperDisk=JSON.stringify({data:[{contents:'DISTINCT UPPER'}]});const requests:any[]=[];
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  const name=decodeURIComponent(c.url.split('/').at(-1));
  if(c.method==='GET')return (name ? (!samePhysical && name==='A.wrk'?upperDisk:disk) ?? {status:404,headers:{},data:{success:false,reason:'not found'}} : {success:true,data:{name:'/',isDir:true,gitClone:false,children:[...(disk===undefined?[]:[{name:'a.wrk',isDir:false,type:'.wrk',lastModifiedUnixMillis:1,gitClone:false,virtual:false}]),...(samePhysical?[]:[{name:'A.wrk',isDir:false,type:'.wrk',lastModifiedUnixMillis:1,gitClone:false,virtual:false}])]}}) as any;
  if(c.method==='DELETE'){requests.push(c.method+' '+name);disk=undefined;return {success:true} as any;}
  if(c.method==='POST'){requests.push(c.method+' '+name);disk=JSON.stringify(c.data);return {success:true} as any;}
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[oldBoard('alias','A.wrk'),{...oldBoard('draft','draft.wrk'),path:''}] as any);}}><App/></RecoilRoot>);
 await screen.findByTestId('file-tree-item-%2Fa.wrk');
 await observeFileIdentity('/','A.wrk');expect(isSameFilePath('/A.wrk','/a.wrk',true)).toBe(samePhysical);
 fireEvent.contextMenu(screen.getByTestId('file-tree-item-%2Fa.wrk'));fireEvent.click(await screen.findByTestId('delete'));fireEvent.click(await screen.findByTestId('file-delete-confirm'));
 await waitFor(()=>expect(screen.queryByTestId('file-tree-item-%2Fa.wrk')).toBeNull());
 expect(disk).toBeUndefined();
 const alias=latest.find((b:any)=>b.id==='alias');
 if(!samePhysical){expect(alias.path).toBe('/');expect((await loadBoardFromFile({path:'/',name:'A.wrk'},'distinct-reopen')).board.sheet[0].contents).toBe('DISTINCT UPPER');return;}
 if(alias)await act(async()=>{await saveBoardFile({board:alias,getSaveBoards:()=>latest,onSuccess:submitted=>setBoards((boards:any)=>applyFileSaveResult(boards,alias,'wrk',submitted)),onRead:loaded=>setBoards((boards:any)=>applyFileReadResult(boards,loaded)),onUncertain:(target=alias)=>setBoards((boards:any)=>invalidateFileSaveResult(boards,target))});});
 if(alias?.path)throw new Error('Case alias is still bound after successful physical delete; following Save recreated='+disk+'; requests='+JSON.stringify(requests));
});

import {deleteFile} from '@/api/repository/fileTree';
import {useFileMutationTabs} from '@/hooks/useFileMoveTabs';
it.each(['wrk', 'dsh'])('keeps an unproven %s alias as a draft after confirmed deletion', async type => {
    const alias = {...oldBoard('alias', 'A.' + type), type}, draft = {...oldBoard('draft', 'draft.wrk'), path: ''};
    jest.mocked(request).mockReset().mockImplementation(async (config: any) => config.method === 'DELETE'
        ? {success: true} as any
        : {status: 500, headers: {}, data: {success: false, reason: 'identity listing unavailable'}} as any);
    const view = renderHook(() => ({handlers: useFileMutationTabs(), state: useRecoilState(gBoardList)}), {
        wrapper: ({children}) => <RecoilRoot initializeState={({set}) => {set(gBoardList, [alias, draft] as any); set(gSelectedTab, alias.id);}}>{children}</RecoilRoot>,
    });
    await act(async () => {await deleteFile('/', 'a.' + type, {handlers: view.result.current.handlers('/a.' + type)});});
    expect(view.result.current.state[0]).toEqual([{...alias, path: '', savedCode: false}, draft]);
    view.unmount();
});

it.each(['wrk', 'dsh'])('keeps edited same-file %s aliases without their deleted binding', async type => {
    const name = 'a.' + type, alias = {...oldBoard('alias', 'A.' + type), savedCode: JSON.stringify(type === 'wrk' ? [{contents: 'STORED'}] : {title: 'STORED', panels: []})};
    const draft = {...oldBoard('draft', 'draft.wrk'), path: ''};
    jest.mocked(request).mockReset().mockImplementation(async (config: any) => {
        if (config.method === 'DELETE') return {success: true} as any;
        if (config.url === '/api/files/') return {success: true, data: {isDir: true, children: [{name, isDir: false}]}} as any;
        return JSON.stringify(type === 'wrk' ? {data: [{contents: 'STORED'}]} : {dashboard: {title: 'STORED', panels: []}}) as any;
    });
    const view = renderHook(() => ({handlers: useFileMutationTabs(), state: useRecoilState(gBoardList)}), {
        wrapper: ({children}) => <RecoilRoot initializeState={({set}) => {set(gBoardList, [alias, draft] as any); set(gSelectedTab, alias.id);}}>{children}</RecoilRoot>,
    });
    await act(async () => {await deleteFile('/', name, {handlers: view.result.current.handlers('/' + name)});});
    expect(view.result.current.state[0]).toEqual([{...alias, path: '', savedCode: false}, draft]);
    view.unmount();
});
