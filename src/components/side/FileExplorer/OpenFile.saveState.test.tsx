import {act,render,waitFor} from '@testing-library/react';
import {RecoilRoot,useRecoilState} from 'recoil';
import OpenFile from '@/components/side/FileExplorer/OpenFile';
import Tab from '@/design-system/components/Tabs/Tab';
import {gBoardList,gSelectedTab} from '@/recoil/recoil';
import {queueFileWrite} from '@/api/repository/fileWriteQueue';
import {isBoardSaved} from '@/utils/boardSaveStatus';
import {applyFileSaveResult} from '@/utils/boardSaveResult';
import {rememberFileIdentity} from '@/utils/fileIdentity';
jest.mock('@/design-system/components',()=>({Button:()=> <button data-testid="sidebar-unsaved"/>,Side:{Item:({children}:any)=><div>{children}</div>,ItemContent:({children}:any)=><div>{children}</div>,ItemIcon:({children}:any)=><div>{children}</div>,ItemText:({children}:any)=><div>{children}</div>,ItemAction:({children}:any)=><div>{children}</div>}}));
jest.mock('@/components/side/AppStore/pkgViews',()=>({useClosePkgView:()=>()=>{}}));
jest.mock('@/utils/icons',()=>({__esModule:true,default:()=>null}));
const deferred=()=>{let resolve!:()=>void;return{promise:new Promise<void>(r=>resolve=r),resolve:()=>resolve()};};
for(const type of ['wrk','dsh'])test(`${type} sidebar and top saved markers agree after delayed successful ACK`,async()=>{
 const savedCode=type==='wrk'?JSON.stringify([{contents:'OLD'}]):JSON.stringify({title:'OLD'});
 const board:any={id:'owner',name:'a.'+type,path:'/',type,code:'',savedCode,...(type==='wrk'?{sheet:[{contents:'NEW'}]}:{dashboard:{title:'NEW'}})};
 let current:any[]=[];let setBoards!:(updater:any)=>void;
 function Harness(){const[boards,set]=useRecoilState(gBoardList);current=boards;setBoards=set;return <><OpenFile pBoard={boards[0]} pSetSelectedTab={()=>{}} pIdx={0}/><Tab pBoard={boards[0]} pSelectedTab="owner" pIdx={0} pTabDragInfo={{}} pSetSelectedTab={()=>{}} pSetTabDragInfo={()=>{}} pOnCloseTab={()=>{}} pOnContextMenu={()=>{}}/></>;}
 rememberFileIdentity('/a.'+type,'/a.'+type);
 const v=render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[board]);set(gSelectedTab,'owner');}}><Harness/></RecoilRoot>);
 const gate=deferred();const submitted=type==='wrk'?{data:board.sheet}:board;
 const saving=queueFileWrite('/a.'+type,async()=>({success:true}),{onResult:async()=>{setBoards((boards:any[])=>applyFileSaveResult(boards,board,type,submitted));await gate.promise;}});
 await waitFor(()=>expect(current[0].savedCode).not.toBe(savedCode));
 expect(v.getByTestId('sidebar-unsaved')).toBeTruthy();
 await act(async()=>{gate.resolve();await saving;});
 expect(isBoardSaved(current[0])).toBe(true);
 expect(v.getByTestId('main-tab-owner').getAttribute('data-file-state')).toBe('saved');
 if(v.queryAllByTestId('sidebar-unsaved').length!==0)throw new Error('Saved marker mismatch: '+JSON.stringify({type,top:v.getByTestId('main-tab-owner').getAttribute('data-file-state'),sidebarUnsaved:v.queryAllByTestId('sidebar-unsaved').length,actualSaved:isBoardSaved(current[0]),savedCode:current[0].savedCode}));
});
