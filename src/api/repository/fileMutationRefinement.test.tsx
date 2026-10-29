import {act, renderHook} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import request from '@/api/core';
import {moveFile} from './fileTree';
import {cancelAllPendingFileWrites} from './fileWriteQueue';
import {loadBoardFromFile} from '@/components/side/FileExplorer/loadBoardFromFile';
import {useFileMoveTabs} from '@/hooks/useFileMoveTabs';
import {gBoardList} from '@/recoil/recoil';
import {saveBoardFile} from '@/utils/boardFileSave';
import {applyFileSaveResult, applySaveAsResult, getBoardSaveData, invalidateFileSaveResult, applyFileReadResult} from '@/utils/boardSaveResult';
import {getFileMutationRelation, rememberDirectoryIdentity} from '@/utils/fileIdentity';

jest.mock('@/api/core', () => ({__esModule: true, default: jest.fn()}));
const missing = {status: 404, headers: {}, data: {reason: 'missing'}};
const lost = {isAxiosError: true, message: 'response lost'};
const doc = (type: string, value: string): any => type === 'wrk'
    ? {data: [{id: 'cell', contents: value, type: 'mrk', height: 200}]}
    : {dashboard: {title: value, panels: [], variables: [], timeRange: {start: 'now-1h', end: 'now'}}};
const value = (type: string, data: any) => type === 'wrk' ? data.data[0].contents : data.dashboard.title;
const draft = {id: 'sql', name: 'SQL', type: 'sql', path: '', code: 'KEEP SQL DRAFT', savedCode: ''};
const owner = (type: string) => ({id: 'owner', name: 'a.' + type, type, path: '/src/', code: '',
    savedCode: JSON.stringify(type === 'wrk' ? doc(type, 'ORIGINAL').data : doc(type, 'ORIGINAL').dashboard),
    ...(type === 'wrk' ? {sheet: doc(type, 'OWNER_DRAFT').data} : doc(type, 'OWNER_DRAFT'))});

function storage(distinct: boolean, destinationPeer = false) {
    const disk = new Map<string, any>(), calls: string[] = [];
    let put: (path: string, destination: string) => Promise<any>;
    const canonical = (path: string) => distinct ? path : path.replace(/^\/(SRC|DEST)\//, match => match.toLowerCase());
    const folders = ['src', ...(distinct ? ['SRC'] : []), 'dest', ...(destinationPeer && distinct ? ['DEST'] : [])];
    jest.mocked(request).mockImplementation(async (config: any) => {
        const path = decodeURIComponent(config.url.replace('/api/files', '')); calls.push(config.method + ' ' + path);
        if (config.method === 'PUT') return put(path, config.data.destination);
        if (config.method === 'POST') {disk.set(canonical(path), config.data); return {success: true} as any;}
        if (path === '/') return {data: {isDir: true, children: folders.map(name => ({name, isDir: true}))}} as any;
        if (path.endsWith('/')) return {data: {isDir: true, children: [...disk.keys()].filter(key => key.startsWith(canonical(path))).map(key => ({name: key.slice(canonical(path).length)}))}} as any;
        return (disk.has(canonical(path)) ? JSON.stringify(disk.get(canonical(path))) : missing) as any;
    });
    return {disk, calls, move: (callback: typeof put) => {put = callback;}};
}
function app(type: string) {
    return renderHook(() => ({moves: useFileMoveTabs(), state: useRecoilState(gBoardList)}), {
        wrapper: ({children}) => <RecoilRoot initializeState={({set}) => set(gBoardList, [owner(type), draft] as any)}>{children}</RecoilRoot>,
    });
}
function requestSave(view: ReturnType<typeof app>, id: string, target?: {path: string; name: string}) {
    const board = view.result.current.state[0].find(board => board.id === id)!;
    const previous = new Map(view.result.current.state[0].map(board => [board.id, board]));
    return saveBoardFile({board, target, saveAs: !!target, getSaveBoards: () => view.result.current.state[0],
            onSuccess: (submitted, context) => view.result.current.state[1](boards => target
                ? applySaveAsResult(boards, {owner: board, target, fileType: board.type, submitted, sourceIsCurrent: true, confirmed: true, previousBoards: previous, isSaving: context.isSaving})
                : applyFileSaveResult(boards, board, board.type, submitted)),
            onRead: loaded => view.result.current.state[1](boards => applyFileReadResult(boards, loaded)),
            onUncertain: (changed = target ?? board) => view.result.current.state[1](boards => invalidateFileSaveResult(boards, changed)),
        });
}
async function persist(view: ReturnType<typeof app>, id: string, target?: {path: string; name: string}, expected = true) {
    let saved = false;
    await act(async () => {saved = await requestSave(view, id, target);});
    expect(saved).toBe(expected);
}
beforeEach(() => {cancelAllPendingFileWrites(); jest.mocked(request).mockReset();});
afterEach(() => cancelAllPendingFileWrites());


// A successful fresh observation may separate a peer, but never completes the
// old PUT. Test both spelling relationships and every public peer operation.
for(const type of ['wrk','dsh'])for(const distinct of [false,true])for(const side of ['source','destination'])for(const operation of ['open','save-as'])for(const rejectOther of [false,true]) {
 test(`${type}: ${distinct?'separate':'alias'} ${side} ${operation} after ordinary Save ${rejectOther?'500':'200'}`,async()=>{
  const model=storage(distinct,true),view=app(type),name='a.'+type;
  const src='/src/'+name,dest='/dest/'+name,peer=(side==='source'?'/SRC/':'/DEST/')+name;
  model.disk.set(src,doc(type,'ORIGINAL'));if(distinct)model.disk.set(peer,doc(type,'INDEPENDENT'));
  model.move(async()=>lost);
  await act(async()=>{await moveFile(src,dest,view.result.current.moves(src));});
  const original=view.result.current.state[0][0];expect(original.path).toBe('/src/');
  expect(value(type,getBoardSaveData(original))).toBe('OWNER_DRAFT');
  // Ordinary Save observes the same peer directory through the shared resolver.
  const other={...owner(type),id:'other',name:'other.'+type,path:side==='source'?'/SRC/':'/DEST/'};
  model.disk.set(other.path+other.name,doc(type,'OTHER_ORIGINAL'));
  await act(async()=>view.result.current.state[1](boards=>[...boards,other]));
  const base=jest.mocked(request).getMockImplementation()!;
  if(rejectOther)jest.mocked(request).mockImplementation(async(c:any)=>c.method==='POST'&&c.url.endsWith(other.name)?{status:500,headers:{},data:{success:false,reason:'rejected'}} as any:base(c));
  // When the folder is itself a source alias it correctly remains protected.
  await persist(view,'other',undefined,!rejectOther);
  if(operation==='open') {
   const opened=await loadBoardFromFile({path:peer.slice(0,peer.lastIndexOf('/')+1),name});
   if(distinct){expect(opened.error).toBeUndefined();expect(value(type,getBoardSaveData(opened.board))).toBe('INDEPENDENT');}
   else expect(opened.error).toMatch(/not confirmed/i);
  }else await persist(view,'owner',{path:peer.slice(0,peer.lastIndexOf('/')+1),name},distinct);
  expect(model.disk.get(src)).toEqual(doc(type,'ORIGINAL'));
  expect(view.result.current.state[0].some(board=>board.id==='sql'&&board.code===draft.code)).toBe(true);
  expect(await postProtected()).toMatchObject({success:false});
  async function postProtected(){return moveFile(src,'/later/'+name,view.result.current.moves(src));}
  const puts=model.calls.filter(call=>call.startsWith('PUT '));expect(puts).toHaveLength(1);
  view.unmount();
 });
}

test('verified distinct parent folders separate children that do not yet exist',()=>{
 rememberDirectoryIdentity('/src/','/src/');rememberDirectoryIdentity('/SRC/','/SRC/');
 expect(getFileMutationRelation('/SRC/new.wrk','/src/new.wrk')).toBe('different');
 rememberDirectoryIdentity('/Src/','/src/');expect(getFileMutationRelation('/Src/new.wrk','/src/new.wrk')).toBe('same');
});
