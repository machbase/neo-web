import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {RecoilRoot,useRecoilValue} from 'recoil';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import {useTagAnalyzerAppState} from '@/components/tagAnalyzer/application/useTagAnalyzerAppState';
import {useBoardSave} from '@/components/tagAnalyzer/board/useBoardSave';
import {SaveAsModal} from '@/components/tagAnalyzer/persistence/SaveAsModal';
import request from '@/api/core';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
jest.mock('@/components/tagAnalyzer/api/tableMetadataApi',()=>({tableMetadataApi:{fetchRollupMetadata:jest.fn().mockResolvedValue({})}}));
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
const owner:any={id:'owner',type:'taz',name:'a.taz',path:'/',code:'',panels:[],boardTimeRange:{start:'now-2h',end:'now'},boardNumericRange:{start:'',end:''},savedCode:false};
const draft:any={id:'draft',type:'sql',name:'draft.sql',path:'',code:'KEEP DRAFT',savedCode:false};
let state:any,live:any;
function App(){
 const boards=useRecoilValue(gBoardList);live=boards;const board:any=boards.find(b=>b.id==='owner');const app=useTagAnalyzerAppState(board);
 const hook=useBoardSave({board,isActive:true,applySaveResult:()=>{},onSavedBoard:app.updateSavedBoard,onFileSaved:app.handleFileSaved,getSaveBoards:app.getSaveBoards});state=hook;
 return <><button onClick={hook.openSaveAs}>Open Save As</button>{hook.isSaveAsOpen&&<SaveAsModal initialDirectoryPath={board.path} initialFileName={board.name} onClose={hook.closeSaveAs} onSaveAs={hook.saveAs} getSaveBoards={app.getSaveBoards}/>}</>;
}
test('old completed Save As cannot close a new dialog after Cancel during slow tree refresh',async()=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let held=false;const disk=new Map<string,any>();const writes:string[]=[];
 const root=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.taz',lastModifiedUnixMillis:1,size:1,gitClone:false,virtual:false}))}});
 jest.mocked(request).mockImplementation(async(c:any)=>{
  if(c.method==='POST'){const name=decodeURIComponent(c.url.split('/').at(-1));writes.push(name);disk.set(name,c.data);return {success:true} as any;}
  if(c.method==='GET'){
   const path=c.url.split('?')[0];if(path.endsWith('/')){const result=root();if(writes.length===1&&!held){held=true;await gate;}return result as any;}
   const name=decodeURIComponent(path.split('/').at(-1));return (disk.get(name)??{status:404,headers:{},data:{success:false,reason:'not found'}}) as any;
  }
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner')}}><App/></RecoilRoot>);
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');
 fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'b.taz'}});fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
 await waitFor(()=>expect(held).toBe(true));expect(writes).toEqual(['b.taz']);expect(live.find((b:any)=>b.id==='owner').name).toBe('b.taz');
 fireEvent.click(screen.getByTestId('tag-analyzer-save-as-cancel-button'));await waitFor(()=>expect(screen.queryByTestId('tag-analyzer-save-as-dialog')).toBeNull());
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'c.taz'}});
 expect(state.isSaveAsOpen).toBe(true);expect(screen.getByTestId('tag-analyzer-save-as-file-name-input')).toHaveValue('c.taz');
 await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});
 expect(state.isSaveAsOpen).toBe(true);expect(screen.getByTestId('tag-analyzer-save-as-file-name-input')).toHaveValue('c.taz');
});

import {useRecoilState} from 'recoil';
import {gFileTree} from '@/recoil/fileTree';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
let hideOld:any,setNewBoards:any,setNewTree:any,currentTree:any;
function SessionShell(){
 const [visible,setVisible]=React.useState(true);hideOld=()=>setVisible(false);
 const [,boardsSet]=useRecoilState(gBoardList);setNewBoards=boardsSet;
 const [tree,treeSet]=useRecoilState(gFileTree);setNewTree=treeSet;currentTree=tree;
 return visible?<App/>:null;
}
test('old TAZ Save As tree read cannot overwrite the new-login explorer after unmount',async()=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let held=false;const disk=new Map<string,any>();
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  if(c.method==='POST'){disk.set('old-b.taz',c.data);return {success:true} as any;}
  if(c.method==='GET'){
   const path=c.url.split('?')[0];if(path.endsWith('/')){
    const result={success:true,data:{name:'/',isDir:true,gitClone:false,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.taz',lastModifiedUnixMillis:1,size:1,gitClone:false,virtual:false}))}};
    if(disk.size&&!held){held=true;await gate;}return result as any;
   }
   return {status:404,headers:{},data:{success:false,reason:'not found'}} as any;
  }
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner')}}><SessionShell/></RecoilRoot>);
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');
 fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'old-b.taz'}});fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));await waitFor(()=>expect(held).toBe(true));
 const newTree:any={depth:0,dirs:[],files:[{id:'new-file.sql',name:'new-file.sql',path:'/',type:0}],id:'new-root',name:'NEW LOGIN ROOT',type:1,path:'/'};
 await act(async()=>{cancelAllPendingFileWrites();hideOld();setNewBoards([{...draft,id:'new-draft',code:'NEW LOGIN DRAFT'}]);setNewTree(newTree);});
 expect(currentTree).toEqual(newTree);
 await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});
 expect(currentTree).toEqual(newTree);
});

test.each(['created', 'deleted'])('cancelled TAZ post-save lookup preserves same-session %s file changes',async change=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let held=false;
 const disk=new Map<string,any>(change==='deleted'?[['peer.sql','SELECT KEEP']]:[]);
 const root=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.'+name.split('.').at(-1),lastModifiedUnixMillis:1,size:1,gitClone:false,virtual:false}))}});
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  if(c.method==='POST'){disk.set('b.taz',c.data);return {success:true} as any;}
  if(c.method==='GET'){
   const path=c.url.split('?')[0];if(path.endsWith('/')){
    const result=root();if(disk.has('b.taz')&&!held){held=true;await gate;}return result as any;
   }
   const name=decodeURIComponent(path.split('/').at(-1));return (disk.get(name)??{status:404,headers:{},data:{success:false,reason:'not found'}}) as any;
  }
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner')}}><SessionShell/></RecoilRoot>);
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');
 fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'b.taz'}});fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));await waitFor(()=>expect(held).toBe(true));
 expect(live.find((b:any)=>b.id==='owner').name).toBe('b.taz');
 fireEvent.click(screen.getByTestId('tag-analyzer-save-as-cancel-button'));await waitFor(()=>expect(screen.queryByTestId('tag-analyzer-save-as-dialog')).toBeNull());
 if(change==='created')disk.set('peer.sql','SELECT NEW');else disk.delete('peer.sql');
 const newTree:any={depth:0,dirs:[],files:[...disk.keys()].map(name=>({id:name,name,path:'/',type:0})),id:'/',name:'/',type:1,path:'/'};
 await act(async()=>{setNewTree(newTree);});
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'c.taz'}});
 await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});
 expect(currentTree).toEqual(newTree);expect(state.isSaveAsOpen).toBe(true);expect(screen.getByTestId('tag-analyzer-save-as-file-name-input')).toHaveValue('c.taz');
 expect(live.find((b:any)=>b.id==='draft').code).toBe('KEEP DRAFT');expect(disk.has('b.taz')).toBe(true);expect(disk.has('peer.sql')).toBe(change==='created');
});

import {useSetRecoilState} from 'recoil';
import {gDeleteFileTree} from '@/recoil/fileTree';
import {deleteFile as deletePhysicalFile} from '@/api/repository/fileTree';
import {getFileRequestFailure} from '@/utils/fileRequestResult';
let removeListedPeer:any;
function DeletePublisher(){removeListedPeer=useSetRecoilState(gDeleteFileTree);return null;}
test('live accepted TAZ tree refresh cannot restore a separately deleted file',async()=>{
 let releaseRead!:()=>void,releaseDelete!:()=>void;
 const readGate=new Promise<void>(r=>releaseRead=r),deleteGate=new Promise<void>(r=>releaseDelete=r);
 let held=false,deleteSent=false;const disk=new Map<string,any>([['peer.sql','SELECT KEEP']]);
 const root=()=>({success:true,data:{name:'/',isDir:true,gitClone:false,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.'+name.split('.').at(-1),lastModifiedUnixMillis:1,size:1,gitClone:false,virtual:false}))}});
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  if(c.method==='POST'){disk.set('b.taz',c.data);return {success:true} as any;}
  if(c.method==='DELETE'){deleteSent=true;await deleteGate;disk.delete('peer.sql');return {success:true} as any;}
  if(c.method==='GET'){
   const path=c.url.split('?')[0];if(path.endsWith('/')){
    const result=root();if(disk.has('b.taz')&&!held){held=true;await readGate;}return result as any;
   }
   const name=decodeURIComponent(path.split('/').at(-1));return disk.get(name)??{status:404,headers:{},data:{success:false,reason:'not found'}} as any;
  }
  return {success:true} as any;
 });
 const initialTree:any={depth:0,dirs:[],files:[{id:'peer.sql',name:'peer.sql',path:'/',depth:1,type:0,parentId:'0'}],id:'0',name:'0',type:1,path:'/'};
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[owner,draft]);set(gSelectedTab,'owner');set(gFileTree,initialTree)}}><SessionShell/><DeletePublisher/></RecoilRoot>);
 let deleting!:Promise<any>;
 act(()=>{deleting=deletePhysicalFile('/','peer.sql').then(result=>{if(!getFileRequestFailure(result))removeListedPeer({path:'/',name:'peer.sql',depth:1,type:0});});});
 await waitFor(()=>expect(deleteSent).toBe(true));
 fireEvent.click(screen.getByRole('button',{name:'Open Save As'}));await screen.findByTestId('tag-analyzer-save-as-file-name-input');
 fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'b.taz'}});fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));await waitFor(()=>expect(held).toBe(true));
 await act(async()=>{releaseDelete();await deleting;});
 expect(currentTree.files.map((f:any)=>f.name)).not.toContain('peer.sql');expect(disk.has('peer.sql')).toBe(false);
 await act(async()=>{releaseRead();for(let i=0;i<100;i++)await Promise.resolve();});
 expect(state.isSaveAsOpen).toBe(false);expect(live.find((b:any)=>b.id==='owner').name).toBe('b.taz');expect(disk.has('peer.sql')).toBe(false);
 expect(currentTree.files.map((f:any)=>f.name)).not.toContain('peer.sql');
});
