import {act, renderHook, waitFor, cleanup} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import {gFileTree} from '@/recoil/fileTree';
import {useFileTreeRefresh} from '@/hooks/useFileTreeRefresh';
import request from '@/api/core';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
const dir=(name:string)=>({name,isDir:true,type:'dir',lastModifiedUnixMillis:1,gitClone:false,virtual:false});
const folder=(name:string,children:any[])=>({success:true,data:{name,isDir:true,gitClone:false,children}});
const node=(name:string,path:string,depth:number)=>({name,path,depth,id:name,parentId:'/',type:1,dirs:[],files:[],isOpen:false});
const initial={name:'/',path:'/',depth:0,id:'/',type:1,dirs:[node('a','/',1)],files:[],isOpen:true};
const wrapper=({children}:any)=><RecoilRoot initializeState={({set})=>set(gFileTree,initial as any)}>{children}</RecoilRoot>;
const original=request.defaults.adapter;
afterEach(()=>{cleanup();request.defaults.adapter=original;cancelAllPendingFileWrites();localStorage.clear();});

it('does not replay a post-save listing after cancellation during authentication refresh',async()=>{
 localStorage.setItem('accessToken','OLD');localStorage.setItem('refreshToken','REFRESH');
 let gets=0,release!:()=>void,active=true;const calls:any[]=[];
 request.defaults.adapter=async config=>{
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});calls.push({url:config.url,session:(config as any).loginSession,guard:!!config.canRetryFileRequest});
  if(config.url==='/api/relogin')return new Promise(resolve=>release=()=>resolve(ok({success:true,accessToken:'NEW',refreshToken:'RNEW'})));
  if(config.url==='/api/files/'){
   if(++gets===1)throw {isAxiosError:true,config,response:{status:401,headers:{},config,data:{success:false,reason:'expired'}}};
   return ok(folder('/',[]));
  }
  throw new Error('unexpected '+config.url);
 };
 const {result}=renderHook(()=>({refresh:useFileTreeRefresh(),tree:useRecoilState(gFileTree)}),{wrapper});
 let pending!:Promise<void>;act(()=>{pending=result.current.refresh('/copy.sql',()=>active);});await waitFor(()=>expect(release).toBeDefined());
 active=false;await act(async()=>{release();await pending;});
 expect(gets).toBe(1);expect(result.current.tree[0]).toEqual(initial);
});

it('does not start the next post-save directory lookup in a new login',async()=>{
 localStorage.setItem('accessToken','ACCOUNT_A');let release!:()=>void;const calls:any[]=[];
 request.defaults.adapter=async config=>{
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});calls.push({url:config.url,session:(config as any).loginSession,authorization:config.headers.Authorization,guard:!!config.canRetryFileRequest});
  if(config.url==='/api/files/a/')return new Promise(resolve=>release=()=>resolve(ok(folder('a',[dir('b')]))));
  if(config.url==='/api/files/a/b/')return ok(folder('b',[]));
  throw new Error('unexpected '+config.url);
 };
 const {result}=renderHook(()=>({refresh:useFileTreeRefresh(),tree:useRecoilState(gFileTree)}),{wrapper});
 let pending!:Promise<void>;act(()=>{pending=result.current.refresh('/a/b/copy.sql');});await waitFor(()=>expect(release).toBeDefined());
 cancelAllPendingFileWrites();localStorage.setItem('accessToken','ACCOUNT_B');await act(async()=>{release();await pending;});
 expect(calls).toHaveLength(1);expect(result.current.tree[0]).toEqual(initial);
});
