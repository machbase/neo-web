import {act,renderHook} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import request from '@/api/core';
import {moveFile} from '@/api/repository/fileTree';
import {saveBoardFile} from '@/utils/boardFileSave';
import {applySaveAsResult,applyFileSaveResult,applyFileReadResult,invalidateFileSaveResult} from '@/utils/boardSaveResult';
import {resolveOverwrite} from '@/utils/fileExistence';
import {gBoardList} from '@/recoil/recoil';
import {useFileMoveTabs} from '@/hooks/useFileMoveTabs';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
const defer=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return{promise,resolve};};
const doc=(f:string,s:string)=>f==='wrk'?{data:[{id:'cell',contents:s,type:'mrk',height:200}]}:{dashboard:{title:s,panels:[],variables:[],timeRange:{start:'now-1h',end:'now'}}};
for(const format of ['wrk','dsh'])for(const replace of [false,true])test(`${format} close owner while auto-save identity preflight waits then move must not recreate/overwrite old file replace=${replace}`,async()=>{
 const name='a.'+format,alias='A.'+format,target='b.'+format;
 const disk=new Map<string,any>([['/'+name,doc(format,'ORIGINAL')]]);const gates=[defer(),defer()];let roots=0;const posts:string[]=[];const events:string[]=[];
 jest.mocked(request).mockImplementation(async(c:any)=>{
  const path=decodeURIComponent(c.url.replace('/api/files',''));events.push(c.method+' '+path);
  if(c.method==='PUT'){disk.set(c.data.destination.toLowerCase(),disk.get(path.toLowerCase()));disk.delete(path.toLowerCase());return {success:true} as any;}
  if(c.method==='POST'){posts.push(path);disk.set(path.toLowerCase(),c.data);return{success:true} as any;}
  if(path==='/'){const children=[...disk.keys()].map(p=>({name:p.slice(1)}));const index=roots++;if(index<2)await gates[index].promise;return{data:{isDir:true,children}} as any;}
  return disk.has(path.toLowerCase())?JSON.stringify(disk.get(path.toLowerCase())):{status:404,headers:{},data:{success:false,reason:'not found'}} as any;
 });
 const original=doc(format,'ORIGINAL'),late=doc(format,'LATE AUTO SAVE');
 const source:any={id:'owner',name:alias,path:'/',type:format,code:'',savedCode:JSON.stringify(format==='wrk'?original.data:original.dashboard),...(format==='wrk'?{sheet:late.data}:late)};
 const draft:any={id:'new-draft',name:'SQL',path:'',type:'sql',code:'KEEP NEW DRAFT',savedCode:''};
 const view=renderHook(()=>({state:useRecoilState(gBoardList),moves:useFileMoveTabs()}),{wrapper:({children})=><RecoilRoot initializeState={({set})=>set(gBoardList,[source,draft])}>{children}</RecoilRoot>});
 let moving!:Promise<any>,saving!:Promise<any>;
 await act(async()=>{moving=moveFile('/'+name,'/'+target,view.result.current.moves('/'+name));for(let i=0;i<30&&roots<1;i++)await Promise.resolve();expect(roots).toBe(1);});
 await act(async()=>{saving=saveBoardFile({board:source,getSaveBoards:()=>view.result.current.state[0],onSuccess:submitted=>view.result.current.state[1](bs=>applyFileSaveResult(bs,source,format,submitted)),onRead:loaded=>view.result.current.state[1](bs=>applyFileReadResult(bs,loaded)),onUncertain:(t=source)=>view.result.current.state[1](bs=>invalidateFileSaveResult(bs,t))});for(let i=0;i<30&&roots<2;i++)await Promise.resolve();expect(roots).toBe(2);view.result.current.state[1]([draft]);});
 await act(async()=>{gates[0].resolve();await moving;});
 expect(disk.has('/'+name)).toBe(false);expect(disk.get('/'+target)).toEqual(original);
 if(replace){
  const fresh=doc(format,'NEW FILE FROM LATER SAVE AS');const freshOwner:any={...source,id:'fresh-owner',name:'new.'+format,path:'',savedCode:false,...(format==='wrk'?{sheet:fresh.data}:fresh)};
  await act(async()=>{view.result.current.state[1]([draft,freshOwner]);});
  await act(async()=>{expect(await saveBoardFile({board:freshOwner,target:{path:'/',name},saveAs:true,getSaveBoards:()=>view.result.current.state[0],beforeWrite:async()=>{const d=await resolveOverwrite('/',name,async()=>true);return d.status==='none'||d.status==='confirmed';},onSuccess:(submitted,ctx)=>view.result.current.state[1](bs=>applySaveAsResult(bs,{owner:freshOwner,target:{path:'/',name},fileType:format,submitted,sourceIsCurrent:true,confirmed:false,isSaving:ctx.isSaving})),onUncertain:jest.fn()})).toBe(true);});
  expect(JSON.stringify(disk.get('/'+name))).toContain('NEW FILE FROM LATER SAVE AS');
 }
 await act(async()=>{gates[1].resolve();await saving;});
 expect(view.result.current.state[0][0]).toEqual(draft);expect(disk.get('/'+target)).toEqual(original);
 if(replace){if(!JSON.stringify(disk.get('/'+name)).includes('NEW FILE FROM LATER SAVE AS'))throw new Error('Earlier preflight save overwrote the later new Save As file');}else if(disk.has('/'+name))throw new Error('Earlier preflight save recreated old path after confirmed move');
});
