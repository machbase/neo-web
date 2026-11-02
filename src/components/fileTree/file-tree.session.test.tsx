import {act,fireEvent,render,waitFor} from '@testing-library/react';
import {RecoilRoot} from 'recoil';
import request from '@/api/core';
import {FileTree} from '@/components/fileTree/file-tree';
import {gBoardList} from '@/recoil/recoil';
import {gFileTree,gDeleteFileList} from '@/recoil/fileTree';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
import {getRequestSession} from '@/api/core/requestSession';
jest.mock('@/design-system/components',()=>({Toast:{error:jest.fn(),success:jest.fn()},Input:()=>null}));
const oldAdapter=request.defaults.adapter;
afterEach(()=>{request.defaults.adapter=oldAdapter;cancelAllPendingFileWrites();localStorage.clear();});
for(const [logout,unmount] of [[false,false],[true,false],[true,true]])test('old multi-drag must not dispatch remaining files with new login, unmount='+unmount+', logout='+logout,async()=>{
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);const calls:any[]=[];const treeUpdates:any[]=[];
 const files=['a.wrk','b.dsh'].map(name=>({id:name,name,path:'/src/',depth:2,type:0}));
 const src={id:'src',name:'src',path:'/',depth:1,type:1,parentId:'0',isOpen:true,files,dirs:[]};
 const dest={id:'dest',name:'dest',path:'/',depth:1,type:1,parentId:'0',isOpen:true,files:[],dirs:[]};
 const root={id:'0',name:'/',path:'/',depth:0,type:1,isOpen:true,dirs:[src,dest],files:[]};
 const disk=new Map<string,string>([['/src/a.wrk','A'],['/src/b.dsh','B']]);
 localStorage.setItem('accessToken','OLD_ACCOUNT');const oldSession=getRequestSession();
 request.defaults.adapter=async(config:any)=>{
  const path=decodeURIComponent(config.url.replace('/api/files',''));const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
  if(config.method==='put'){
   calls.push({method:'PUT',path,token:config.headers.Authorization,session:config.loginSession});
   if(path==='/src/a.wrk')await gate;
   const target=JSON.parse(config.data).destination;disk.set(target,disk.get(path)!);disk.delete(path);return ok({success:true});
  }
  if(path==='/')return ok({data:{isDir:true,children:[{name:'src',isDir:true},{name:'dest',isDir:true}]}});
  if(path==='/src/'||path==='/dest/')return ok({data:{isDir:true,children:[...disk.keys()].filter(k=>k.startsWith(path)).map(k=>({name:k.slice(path.length)}))}});
  return ok(disk.get(path));
 };
 const view=render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[]);set(gFileTree,root as any);set(gDeleteFileList,files as any);}}><FileTree rootDir={root as any} selectedFile={undefined} onSelect={()=>{}} onFetchDir={()=>{}} onContextMenu={()=>{}} onSetFileTree={v=>treeUpdates.push(v)} onRename={()=>{}}/></RecoilRoot>);
 const item=view.container.querySelector('[id="/src/a.wrk-2"]')!;const target=view.container.querySelector('[id="/dest-1"]')!;
 fireEvent.dragStart(item);fireEvent.dragEnter(target);fireEvent.dragEnd(item);
 await waitFor(()=>expect(calls).toHaveLength(1));
 if(logout)act(()=>{cancelAllPendingFileWrites();localStorage.setItem('accessToken','NEW_ACCOUNT');});
 if(unmount)view.unmount();
 await act(async()=>{release();await gate;for(let i=0;i<100;i++)await Promise.resolve();});
 if(logout)expect(getRequestSession()).not.toBe(oldSession);
 if(logout){expect(calls.filter(c=>c.token==='Bearer NEW_ACCOUNT')).toEqual([]);expect(disk.get('/src/b.dsh')).toBe('B');expect(treeUpdates).toHaveLength(0);}else{expect(calls).toHaveLength(2);expect([...disk.keys()].sort()).toEqual(['/dest/a.wrk','/dest/b.dsh']);}
});
