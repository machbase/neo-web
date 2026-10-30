import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import React from 'react';
import {RecoilRoot,useRecoilValue} from 'recoil';
import {FileExplorer} from '@/components/side/FileExplorer';
import {SaveModal} from '@/components/side/FileExplorer/SaveModal';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import {gFileTree} from '@/recoil/fileTree';
import {useAbortController} from '@/hooks/useAbortController';
import {isBoardSaved} from '@/utils/boardSaveStatus';
import request from '@/api/core';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
import {Toast} from '@/design-system/components';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
let tree:any,boards:any;
function App(){const [open,setOpen]=React.useState(false);const requests=useAbortController();tree=useRecoilValue(gFileTree);boards=useRecoilValue(gBoardList);return <><button onClick={()=>setOpen(true)}>Open Save As</button><FileExplorer pGetInfo={()=>{}} pSavedPath={undefined} pDisplay/>{open&&<SaveModal pIsSave setIsOpen={setOpen} saveRequests={requests}/>}</>;}
const owner:any={id:'owner',type:'sql',name:'a.sql',path:'/',code:'SELECT DRAFT;',savedCode:'SELECT ORIGINAL;',panels:[],sheet:[],range_bgn:'',range_end:''};
const draft:any={...owner,id:'draft',name:'new.sql',path:'',code:'SELECT KEEP_NEW_DRAFT;',savedCode:false};
test.each([false,true])('a slow explorer refresh must not erase the newer accepted Save As listing, late=%s',async late=>{
 const disk=new Map([['a.sql','SELECT ORIGINAL;']]);let roots=0,release!:()=>void;
 const root=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.sql',lastModifiedUnixMillis:1,gitClone:false,virtual:false}))}});
 jest.mocked(request).mockImplementation(async(config:any)=>{
  if(config.method==='POST'){disk.set('b.sql',config.data);return {success:true} as any;}
  if(config.method==='GET'&&config.url.split('?')[0]==='/api/files/'){roots++;const snapshot=root();if(roots===2)return new Promise(resolve=>{release=()=>resolve(snapshot);});return snapshot as any;}
  return disk.get(decodeURIComponent(config.url.split('/').at(-1))) as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner')}}><App/></RecoilRoot>);
 await screen.findByTestId('file-tree-item-%2Fa.sql');
 fireEvent.click(screen.getByTestId('file-explorer-refresh'));await waitFor(()=>expect(release).toBeDefined());
 if(!late)await act(async()=>release());
 fireEvent.click(screen.getByText('Open Save As'));await screen.findByDisplayValue('a.sql');fireEvent.change(screen.getByTestId('file-name-input'),{target:{value:'b.sql'}});fireEvent.click(screen.getByTestId('apply'));
 await waitFor(()=>expect(tree.files.map((f:any)=>f.name)).toContain('b.sql'));
 expect(boards[0].name).toBe('b.sql');expect(isBoardSaved(boards[0])).toBe(true);expect(disk.get('b.sql')).toBe('SELECT DRAFT;');
 if(late)await act(async()=>release());
 expect(disk.get('b.sql')).toBe('SELECT DRAFT;');expect(boards[0].name).toBe('b.sql');expect(boards[1]).toEqual(draft);
 expect(tree.files.map((f:any)=>f.name)).toContain('b.sql');
});

test.each(['before-save','save-success','save-failure','retry-failure','new-navigation','logout'] as const)(
 'folder opening preserves an unrelated root Save As and its intent: %s',async mode=>{
  jest.clearAllMocks();
  const original='SELECT ORIGINAL;',inside='{"data":[]}';
  const disk=new Map([['a.sql',original],['target/inside.wrk',inside]]);
  let release!:()=>void,folderReads=0;
  const entry=(name:string,isDir=false)=>({name,isDir,type:isDir?'dir':'.sql',lastModifiedUnixMillis:1,gitClone:false,virtual:false});
  const root=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[entry('target',true),...[...disk.keys()].filter(name=>!name.includes('/')).map(name=>entry(name))]}});
  const folder=()=>({success:true,data:{name:'target',isDir:true,gitClone:false,children:[entry('inside.wrk')]}});
  jest.mocked(request).mockImplementation(async(config:any)=>{
   const path=decodeURIComponent(config.url.split('?')[0]);
   if(config.method==='POST'){
    if(mode==='save-failure')return {status:500,headers:{},data:{success:false,reason:'write failed'}} as any;
    disk.set('b.sql',config.data);return {success:true} as any;
   }
   if(config.method==='GET'&&path==='/api/files/')return root() as any;
   if(config.method==='GET'&&path==='/api/files/target/'){
    folderReads++;
    if(folderReads===1){const response=folder();return new Promise(resolve=>{release=()=>resolve(response);});}
    return (mode==='retry-failure'?{status:500,headers:{},data:{success:false,reason:'folder lookup failed'}}:folder()) as any;
   }
   return disk.get(path.replace('/api/files/','')) as any;
  });
  render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner')}}><App/></RecoilRoot>);
  await screen.findByTestId('file-tree-item-%2Ftarget');
  fireEvent.click(screen.getByTestId('file-tree-item-%2Ftarget'));await waitFor(()=>expect(release).toBeDefined());
  if(mode==='before-save')await act(async()=>release());
  fireEvent.click(screen.getByText('Open Save As'));await screen.findByDisplayValue('a.sql');
  fireEvent.change(screen.getByTestId('file-name-input'),{target:{value:'b.sql'}});fireEvent.click(screen.getByTestId('apply'));
  if(mode==='save-failure')await waitFor(()=>expect(screen.getByTestId('save-modal-error')).toHaveTextContent('write failed'));
  else await waitFor(()=>expect(tree.files.map((file:any)=>file.name)).toContain('b.sql'));
  if(mode==='new-navigation'){
   fireEvent.click(screen.getByTestId('file-explorer-refresh'));
   await waitFor(()=>expect(screen.queryByText('...')).toBeNull());
  }
  if(mode==='logout')cancelAllPendingFileWrites();
  await act(async()=>release());
  const opens=mode==='before-save'||mode==='save-success'||mode==='save-failure';
  await waitFor(()=>expect(tree.dirs.find((dir:any)=>dir.name==='target').isOpen).toBe(opens));
  expect(screen.queryByTestId('file-tree-item-%2Ftarget%2Finside.wrk')!==null).toBe(opens);
  expect(folderReads).toBe(mode==='save-success'||mode==='retry-failure'?2:1);
  if(mode==='retry-failure')expect(Toast.error).toHaveBeenCalledWith('folder lookup failed',expect.anything());
  expect(disk.get('a.sql')).toBe(original);expect(disk.get('target/inside.wrk')).toBe(inside);
  expect(boards[0]).toMatchObject({id:'owner',path:'/',name:mode==='save-failure'?'a.sql':'b.sql',code:owner.code});
  expect(isBoardSaved(boards[0])).toBe(mode!=='save-failure');expect(boards[1]).toEqual(draft);
  expect(tree.files.map((file:any)=>file.name)).toEqual(mode==='save-failure'?['a.sql']:['a.sql','b.sql']);
  expect(disk.get('b.sql')).toBe(mode==='save-failure'?undefined:owner.code);
 });
