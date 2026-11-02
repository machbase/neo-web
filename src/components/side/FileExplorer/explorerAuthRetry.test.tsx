import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import React from 'react';
import {RecoilRoot,useRecoilState} from 'recoil';
import {FileExplorer} from './index';
import {gFileTree} from '@/recoil/fileTree';
import {invalidateRequestSession} from '@/api/core/requestSession';
import request from '@/api/core';
import {Toast} from '@/design-system/components';

jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));

let tree:any,setTree:any,setShow:any;
function Probe(){
 [tree,setTree]=useRecoilState(gFileTree);
 const [show,updateShow]=React.useState(true);setShow=updateShow;
 return show?<FileExplorer pGetInfo={()=>{}} pSavedPath={undefined} pDisplay/>:null;
}
const entry=(name:string,isDir=false)=>({name,isDir,type:isDir?'dir':'.sql',lastModifiedUnixMillis:1,gitClone:false,virtual:false});
const root=(latest=false)=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[entry('target',true),entry('other',true),entry('a.sql'),...(latest?[entry('b.sql')]:[])]}});
const folder=(name='target')=>({success:true,data:{name,isDir:true,gitClone:false,children:[entry('inside.sql')]}});
const originalAdapter=request.defaults.adapter;
afterEach(()=>{cleanup();request.defaults.adapter=originalAdapter;localStorage.clear();});

for(const stage of ['initial','retry'] as const)for(const action of ['active','root','folder','logout','unmount'] as const){
 test(`${stage} folder GET401: ${action} controls authentication replay`,async()=>{
  jest.clearAllMocks();localStorage.setItem('accessToken','old-access');localStorage.setItem('refreshToken','old-refresh');
  let releaseFirst!:()=>void,releaseRefresh!:()=>void,reads=0,refreshes=0,roots=0,latest=false;
  request.defaults.adapter=async config=>{
   const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
   if(config.url==='/api/relogin'){refreshes++;return new Promise(resolve=>{releaseRefresh=()=>resolve(ok({success:true,accessToken:'new-access',refreshToken:'new-refresh'}));});}
   if(config.url==='/api/files/'){roots++;return ok(root(latest));}
   if(config.url==='/api/files/other/')return ok(folder('other'));
   if(config.url==='/api/files/target/'){
    reads++;
    if(stage==='retry'&&reads===1)return new Promise(resolve=>{releaseFirst=()=>resolve(ok(folder()));});
    if(reads===(stage==='retry'?2:1))throw {isAxiosError:true,config,response:{status:401,headers:{},config,data:{success:false,reason:'expired'}}};
    return ok(folder());
   }
   throw new Error('Unexpected request '+config.url);
  };
  render(<RecoilRoot><Probe/></RecoilRoot>);
  await screen.findByTestId('file-tree-item-%2Ftarget');fireEvent.click(screen.getByTestId('file-tree-item-%2Ftarget'));
  if(stage==='retry'){
   await waitFor(()=>expect(releaseFirst).toBeDefined());latest=true;
   act(()=>setTree((previous:any)=>({...previous,files:[...previous.files,{...previous.files[0],name:'b.sql',id:'b.sql'}]})));
   await act(async()=>releaseFirst());
  }
  await waitFor(()=>expect(refreshes).toBe(1));const attempts=reads;
  if(action==='root'){fireEvent.click(screen.getByTestId('file-explorer-refresh'));await waitFor(()=>expect(roots).toBe(2));await waitFor(()=>expect(screen.queryByText('...')).toBeNull());}
  if(action==='folder'){fireEvent.click(screen.getByTestId('file-tree-item-%2Fother'));await screen.findByTestId('file-tree-item-%2Fother%2Finside.sql');}
  if(action==='logout')act(()=>invalidateRequestSession());
  if(action==='unmount')act(()=>setShow(false));
  const before=JSON.stringify(tree);
  await act(async()=>releaseRefresh());
  expect(reads).toBe(attempts+(action==='active'?1:0));
  if(action==='active')await screen.findByTestId('file-tree-item-%2Ftarget%2Finside.sql');
  else expect(JSON.stringify(tree)).toBe(before);
  if(stage==='retry')expect(tree.files.map((file:any)=>file.name)).toContain('b.sql');
  expect(Toast.error).not.toHaveBeenCalled();
  expect(localStorage.getItem('accessToken')).toBe(action==='logout'?'old-access':'new-access');
 });
}

test.each(['active','root','logout','unmount'] as const)('root Refresh GET401: %s controls authentication replay',async action=>{
 jest.clearAllMocks();localStorage.setItem('accessToken','old-access');localStorage.setItem('refreshToken','old-refresh');
 let roots=0,refreshes=0,releaseRefresh!:()=>void;
 request.defaults.adapter=async config=>{
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
  if(config.url==='/api/relogin'){refreshes++;return new Promise(resolve=>{releaseRefresh=()=>resolve(ok({success:true,accessToken:'new-access',refreshToken:'new-refresh'}));});}
  if(config.url==='/api/files/'){
   roots++;if(roots===2)throw {isAxiosError:true,config,response:{status:401,headers:{},config,data:{success:false,reason:'expired'}}};
   return ok(root(roots>2));
  }
  throw new Error('Unexpected request '+config.url);
 };
 render(<RecoilRoot><Probe/></RecoilRoot>);await screen.findByTestId('file-tree-item-%2Ftarget');
 fireEvent.click(screen.getByTestId('file-explorer-refresh'));await waitFor(()=>expect(refreshes).toBe(1));
 if(action==='root'){fireEvent.click(screen.getByTestId('file-explorer-refresh'));await screen.findByTestId('file-tree-item-%2Fb.sql');}
 if(action==='logout')act(()=>invalidateRequestSession());
 if(action==='unmount')act(()=>setShow(false));
 const before=JSON.stringify(tree),attempts=roots;
 await act(async()=>releaseRefresh());
 expect(roots).toBe(attempts+(action==='active'?1:0));
 if(action==='active')await screen.findByTestId('file-tree-item-%2Fb.sql');else expect(JSON.stringify(tree)).toBe(before);
 expect(Toast.error).not.toHaveBeenCalled();
});
