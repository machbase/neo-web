import React from 'react';
import {render,screen,fireEvent,waitFor,act,within} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import {SaveModal} from '@/components/side/FileExplorer/SaveModal';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import request from '@/api/core';
import {hasPendingBoardSave} from '@/api/repository/fileWriteQueue';
import {useAbortController} from '@/hooks/useAbortController';
import {isBoardSaved} from '@/utils/boardSaveStatus';
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
const original=request.defaults.adapter;
afterEach(()=>request.defaults.adapter=original);
let latest:any[]=[];
// MainContent owns this controller, so closing the dialog does not abort it.
function App(){const requests=useAbortController();const [open,setOpen]=React.useState(true);const [boards]=useRecoilState(gBoardList);latest=boards;return open?<SaveModal pIsSave setIsOpen={setOpen} saveRequests={requests}/>:<span>closed dialog</span>;}
test.each(['sql','wrk','dsh'].flatMap(type=>['401','200','401-open','200-own'].map(status=>[type,status])))('%s cancellation distinguishes terminal %s from already accepted work',async(type,status)=>{
 const target=(status==='200-own'?'a.':'b.')+type;
 const oldSheet=[{id:'cell',contents:'KEEP_EXISTING_TARGET',type:'mrk',height:200}],newSheet=[{id:'cell',contents:'NEW_CONTENT',type:'mrk',height:200}];
 const oldDashboard={title:'KEEP_EXISTING_TARGET',panels:[],variables:[],timeRange:{start:'now-1h',end:'now'}},newDashboard={...oldDashboard,title:'NEW_CONTENT'};
 const source={id:'source',name:'a.'+type,path:'/',type,code:'NEW_CONTENT',savedCode:type==='wrk'?JSON.stringify(oldSheet):type==='dsh'?JSON.stringify(oldDashboard):'OLD_SOURCE',panels:[],sheet:newSheet,dashboard:newDashboard,range_bgn:'',range_end:''};
 const originalDisk=type==='wrk'?JSON.stringify({data:oldSheet}):type==='dsh'?JSON.stringify({dashboard:oldDashboard}):'KEEP_EXISTING_TARGET';
 let release!:()=>void,refreshStarted=false;const gate=new Promise<void>(r=>release=r);let posts=0;let disk=originalDisk;const calls:any[]=[];
 localStorage.setItem('accessToken','OLD_ACCESS');localStorage.setItem('refreshToken','OLD_REFRESH');
 request.defaults.adapter=async (config:any)=>{
  calls.push({method:config.method,url:config.url,body:config.method==='post'?config.data:undefined});
  const ok=(data:any)=>({data,status:200,statusText:'OK',headers:{},config});
  if(config.url==='/api/relogin'){refreshStarted=true;await gate;return ok({success:true,accessToken:'NEW_ACCESS',refreshToken:'NEW_REFRESH'});}
  if(config.method==='post'&&config.url==='/api/files/'+target){
   if(++posts===1){if(status.startsWith('401'))throw {isAxiosError:true,config,response:{status:401,config,headers:{},data:{success:false,reason:'expired'}}};disk=config.data;refreshStarted=true;await gate;return ok({success:true});}
   disk=config.data;return ok({success:true});
  }
  if(config.url==='/api/files/')return ok({success:true,data:{isDir:true,children:[...new Set([source.name,target])].map(name=>({name,type:'.'+type,isDir:false}))}});
  return ok(config.url==='/api/files/'+target?disk:'OLD_SOURCE');
 };
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[source] as any);set(gSelectedTab,source.id);}}><App/></RecoilRoot>);
 const input=await screen.findByTestId('file-name-input');fireEvent.change(input,{target:{value:target}});fireEvent.click(screen.getByTestId('apply'));
 fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm'));
 await waitFor(()=>expect(refreshStarted).toBe(true));expect(posts).toBe(1);if(status.startsWith('401'))expect(disk).toBe(originalDisk);else expect(disk).toContain('NEW_CONTENT');const diskAtCancel=disk;
 if(status!=='401-open'){fireEvent.click(within(screen.getByTestId('file-save-dialog')).getByRole('button',{name:/^Cancel$/}));await screen.findByText('closed dialog');}
 await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});await waitFor(()=>expect(hasPendingBoardSave(source.id)).toBe(false));
 if(status==='401-open'){expect(posts).toBe(2);expect(disk).toContain('NEW_CONTENT');expect(latest[0].name).toBe(target);}else{
  expect({posts,disk}).toEqual({posts:1,disk:diskAtCancel});
  if(status==='200-own'){expect(latest[0]).toEqual(expect.objectContaining({id:source.id,name:source.name,path:source.path}));expect(isBoardSaved(latest[0])).toBe(true);}
  else expect(latest).toEqual([source]);
 }
});
