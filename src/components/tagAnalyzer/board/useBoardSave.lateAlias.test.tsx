import {act,renderHook,waitFor} from '@testing-library/react';
import request from '@/api/core';
import {useBoardSave} from '@/components/tagAnalyzer/board/useBoardSave';
import {createTazBoardSnapshot,isTazBoardSaved} from '@/components/tagAnalyzer/persistence/tazBoardSnapshot';
import {applyFileSaveResult,invalidateFileSaveResult} from '@/utils/boardSaveResult';
import {saveBoardFile} from '@/utils/boardFileSave';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
jest.mock('@/api/core',()=>({__esModule:true,default:jest.fn()}));
const http=jest.mocked(request);
const board=(id:string,path:string,start:string)=>createTazBoardSnapshot({id,name:'b.taz',path,type:'taz',code:'',panels:[],boardTimeRange:{start,end:'now'},boardNumericRange:{start:'',end:''},savedCode:false});
it.each([false,true])('late parent case alias after first dispatch; close source=%s',async(close)=>{
 cancelAllPendingFileWrites();http.mockReset();
 let disk:any;let release!:()=>void;const hold=new Promise<void>(r=>{release=r});
 let boards=[{...board('a','/Reports/','now-1h'),boardTimeRange:{start:'now-2h',end:'now'}}];
 let firstSent=false;
 http.mockImplementation(async(config:any)=>{
   if(config.method==='GET')return {success:true,data:{isDir:true,children:config.url==='/api/files/'?[{name:'Reports',isDir:true}]:[{name:'b.taz',type:'.taz'}]}};
   if(config.url.includes('/reports/'))return {success:false};
   firstSent=true;await hold;disk=config.data;return {success:true};
 });
 const saved=jest.fn((value:any)=>{boards=applyFileSaveResult(boards,value,'taz',value)});
 const hook=renderHook(()=>useBoardSave({board:boards[0],isActive:true,applySaveResult:jest.fn(),onSavedBoard:saved,onFileSaved:jest.fn().mockResolvedValue(undefined),getSaveBoards:()=>boards}));
 let first!:Promise<boolean>;act(()=>{first=hook.result.current.save()});await waitFor(()=>expect(firstSent).toBe(true));
 // The late alias was loaded before the held actual POST reached the server.
 boards=[...boards,board('b','/reports/','now-1h')];
 const target=boards[1];const later=saveBoardFile({board:target,getSaveBoards:()=>boards,onSuccess:submitted=>{boards=applyFileSaveResult(boards,target,'taz',submitted)},onUncertain:()=>{boards=invalidateFileSaveResult(boards,target)}});
 if(close){boards=boards.filter(b=>b.id!=='a');hook.unmount()}
 await act(async()=>{release();await first;await later});
 const surviving=boards.find(b=>b.id==='b')!;
 expect(disk.boardTimeRange.start).toBe('now-2h');expect(surviving.boardTimeRange.start).toBe('now-1h');
 if(isTazBoardSaved(surviving))throw new Error('FALSE SAVED: disk now-2h, surviving late-alias tab now-1h');
});
