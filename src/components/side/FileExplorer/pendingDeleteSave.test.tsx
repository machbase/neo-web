import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import {FileExplorer} from '@/components/side/FileExplorer';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import request from '@/api/core';
import {saveBoardFile} from '@/utils/boardFileSave';
import {applyFileSaveResult,applyFileReadResult,invalidateFileSaveResult} from '@/utils/boardSaveResult';
import {loadBoardFromFile} from '@/components/side/FileExplorer/loadBoardFromFile';
import {isBoardSaved} from '@/utils/boardSaveStatus';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
jest.mock('@/design-system/components/Toast',()=>({Toast:{success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()},success:jest.fn(),error:jest.fn(),info:jest.fn(),warning:jest.fn()}));
let latest:any[],setBoards:any;
function App(){const [boards,set]=useRecoilState(gBoardList);latest=boards;setBoards=set;return <FileExplorer pGetInfo={jest.fn()} pDisplay/>;}
const body=(format:string,text:string)=>format==='wrk'?{data:[{id:'cell',type:'mrk',contents:text,height:200}]}:{dashboard:{title:text,panels:[],variables:[],timeRange:{start:'now-1h',end:'now'}}};
for(const format of ['wrk','dsh'])for(const saveDuringWait of [false,true])test(format+' later edit survives an old delete batch; save during wait='+saveDuringWait,async()=>{
 const names=['first.txt','second.'+format],original=body(format,'OLD'),edited=body(format,'NEWER SAVE');
 const board:any={id:'second',name:names[1],type:format,path:'/',code:'',panels:[],range_bgn:'',range_end:'',...(format==='wrk'?{sheet:(original as any).data}:original),savedCode:JSON.stringify(format==='wrk'?(original as any).data:original.dashboard)};
 const draft:any={id:'draft',type:'sql',name:'SQL',path:'',code:'KEEP',savedCode:'',panels:[],range_bgn:'',range_end:''};
 const disk=new Map<string,string>([[names[0],'FIRST'],[names[1],JSON.stringify(original)]]);const calls:string[]=[];let held=false,release!:()=>void;const gate=new Promise<void>(r=>release=r);
 jest.mocked(request).mockReset().mockImplementation(async(c:any)=>{
  const name=decodeURIComponent(c.url.replace('/api/files/',''));
  if(c.method==='GET')return (name?disk.get(name)??{status:404,headers:{},data:{success:false,reason:'missing'}}:{success:true,data:{name:'/',isDir:true,children:[...disk.keys()].map(name=>({name,isDir:false,type:'.'+name.split('.').at(-1),lastModifiedUnixMillis:1,gitClone:false,virtual:false}))}}) as any;
  if(c.method==='DELETE'){calls.push('DELETE '+name);disk.delete(name);if(name===names[0]){held=true;await gate;}return {success:true} as any;}
  if(c.method==='POST'){calls.push('POST '+name);disk.set(name,JSON.stringify(c.data));return {success:true} as any;}
  return {success:true} as any;
 });
 render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[board,draft]);set(gSelectedTab,board.id);}}><App/></RecoilRoot>);
 await screen.findByTestId('file-tree-item-%2Ffirst.txt');for(const name of names)fireEvent.click(screen.getByTestId('file-tree-item-'+encodeURIComponent('/'+name)),{metaKey:true});
 fireEvent.contextMenu(screen.getByTestId('file-tree-item-%2Ffirst.txt'));fireEvent.click(await screen.findByTestId('delete'));fireEvent.click(await screen.findByTestId('file-delete-confirm'));await waitFor(()=>expect(held).toBe(true));
 await act(async()=>{setBoards((boards:any[])=>boards.map(b=>b.id===board.id?{...b,...(format==='wrk'?{sheet:(edited as any).data}:edited)}:b));});
 const savingBoard=latest.find(b=>b.id===board.id);
 let saved:any=false;
 if(saveDuringWait)await act(async()=>{saved=await saveBoardFile({board:savingBoard,getSaveBoards:()=>latest,onSuccess:submitted=>setBoards((boards:any)=>applyFileSaveResult(boards,board,format,submitted)),onRead:loaded=>setBoards((boards:any)=>applyFileReadResult(boards,loaded)),onUncertain:(target=board)=>setBoards((boards:any)=>invalidateFileSaveResult(boards,target))});});
 const afterSave=latest.map(b=>({id:b.id,path:b.path,savedCode:b.savedCode}));const storedAfterSave=disk.get(names[1]);
 expect(afterSave.some(b=>b.id===board.id)).toBe(true);
 if(saved)expect(storedAfterSave).toContain('NEWER SAVE');else expect(storedAfterSave).toBe(JSON.stringify(original));
 const savedMarkerAfterSave=isBoardSaved(latest.find(b=>b.id===board.id));const openedAfterSave=await loadBoardFromFile({path:'/',name:names[1]},'before-delete-reopen');
 expect(savedMarkerAfterSave).toBe(!!saved);
 if(saved)expect(format==='wrk'?openedAfterSave.board.sheet[0].contents:openedAfterSave.board.dashboard.title).toBe('NEWER SAVE');
 await act(async()=>{release();for(let i=0;i<100;i++)await Promise.resolve();});
 const reopened=await loadBoardFromFile({path:'/',name:names[1]},'reopen');expect(reopened.board).toBeUndefined();
 const kept=latest.find(b=>b.id===board.id);
 const currentText=kept?(format==='wrk'?kept.sheet[0].contents:kept.dashboard.title):undefined;
 if(disk.get(names[1])===undefined&&currentText!=='NEWER SAVE')throw new Error('Newer content is absent from both disk and editor; saved='+saved+'; tabs='+latest.map(b=>b.id));
 if(!saveDuringWait){expect(kept.path).toBe('');expect(currentText).toBe('NEWER SAVE');}
});
