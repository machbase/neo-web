import { act, renderHook } from '@testing-library/react';
import { RecoilRoot, useRecoilState } from 'recoil';
import request from '@/api/core';
import { moveFile } from '@/api/repository/fileTree';
import { cancelAllPendingFileWrites, readFileConsistently } from '@/api/repository/fileWriteQueue';
import { gBoardList } from '@/recoil/recoil';
import { useFileMoveTabs } from './useFileMoveTabs';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import { rememberFileIdentity } from '@/utils/fileIdentity';
import { saveBoardFile } from '@/utils/boardFileSave';
import { invalidateFileSaveResult, applySaveAsResult } from '@/utils/boardSaveResult';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
const missing = {status: 404, headers: {}, data: {reason: 'not found'}};
const lost = {isAxiosError: true, message: 'response lost'};
const doc = (type: string, text: string) => type === 'wrk' ? {data: [{id:'cell', contents:text, type:'mrk', height:200}]} : {dashboard:{title:text, panels:[], variables:[], timeRange:{start:'now-1h',end:'now'}}};
const board = (type: string, name: string, text: string) => ({id:'owner',type,name,path:'/src/',code:'',savedCode:JSON.stringify(type==='wrk' ? doc(type,text).data : doc(type,text).dashboard), ...(type==='wrk' ? {sheet:doc(type,text).data} : doc(type,text))});
beforeEach(() => {cancelAllPendingFileWrites(); jest.mocked(request).mockReset();});
afterEach(() => cancelAllPendingFileWrites());

for (const type of ['wrk','dsh']) for (const distinct of [false,true]) test(`${type}: ${distinct?'distinct':'same'} alias move preserves drafts and destination`, async () => {
    const name = 'case.'+type, alias='CASE.'+type, disk = new Map<string, any>([['/src/'+name, doc(type,'ORIGINAL')]]);
    if(distinct) disk.set('/src/'+alias,doc(type,'DISTINCT'));
    const source = board(type,alias,distinct?'DISTINCT':'ORIGINAL');
    const draft = {...source,id:'draft',name:'SQL',path:'',type:'sql',code:'KEEP DRAFT',savedCode:''};
    jest.mocked(request).mockImplementation(async (config:any) => {
        const path = decodeURIComponent(config.url.replace('/api/files',''));
        if(config.method==='PUT') {disk.set(config.data.destination,disk.get(path));disk.delete(path);return {success:true} as any;}
        if(path==='/') return {data:{isDir:true,children:[{name:'src',isDir:true},{name:'dest',isDir:true}]}} as any;
        if(path==='/src/') return {data:{isDir:true,children:[...disk.keys()].filter(p=>p.startsWith('/src/')).map(p=>({name:p.slice(5)}))}} as any;
        return JSON.stringify(disk.get(path) ?? (!distinct&&path==='/src/'+alias?disk.get('/src/'+name):undefined)) as any || missing;
    });
    const view = renderHook(() => ({moves:useFileMoveTabs(), state:useRecoilState(gBoardList)}), {wrapper:({children}) => <RecoilRoot initializeState={({set})=>set(gBoardList,[source,draft] as any)}>{children}</RecoilRoot>});
    await act(async () => {expect(await moveFile('/src/'+name,'/dest/'+name,view.result.current.moves('/src/'+name))).toMatchObject({success:true});});
    expect(view.result.current.state[0][0]).toMatchObject({id:'owner',path:distinct?'/src/':'/dest/',name:distinct?alias:name});
    expect(view.result.current.state[0][1]).toEqual(draft);
    expect(isBoardSaved(view.result.current.state[0][0])).toBe(true);
    expect(disk.has('/src/'+name)).toBe(false);expect(disk.get('/dest/'+name)).toEqual(doc(type,'ORIGINAL'));
});

for (const type of ['wrk','dsh']) for (const mode of ['moved','not-moved','unknown'] as const) test(`${type}: response lost ${mode} uses storage and keeps later edits`, async () => {await verifyUnknownMove(type,mode,0);});

test('only the move owner can read while recovery is gated; logout drops old results', async () => {await verifyUnknownMove('wrk','unknown',502);cancelAllPendingFileWrites();expect(await readFileConsistently('/src/case.wrk',async()=> 'NEW SESSION')).toMatchObject({success:false});});

test('an ordinary save snapshot cannot recreate the source after the owner was detached', async()=>{
    const source=board('wrk','case.wrk','DRAFT');rememberFileIdentity('/src/case.wrk','/src/case.wrk');
    const result=await saveBoardFile({board:source,getSaveBoards:()=>[{...source,path:''}],onSuccess:jest.fn(),onUncertain:jest.fn()});
    expect(result).toBe(false);expect(request).not.toHaveBeenCalled();
});

for (const type of ['wrk','dsh']) for (const distinct of [false,true]) test(`${type}: observed folder ${distinct?'siblings':'aliases'} relocate only the moved file`,async()=>{
    const name='case.'+type, source={...board(type,name,'ORIGINAL'),path:'/SRC/'};
    jest.mocked(request).mockImplementation(async(config:any)=>{
        const path=config.url.replace('/api/files','');
        if(config.method==='PUT')return {success:true} as any;
        if(path==='/')return {data:{isDir:true,children:[{name:'src',isDir:true},...(distinct?[{name:'SRC',isDir:true}]:[])]}} as any;
        if(path==='/src/'||path==='/SRC/')return {data:{isDir:true,children:[{name}]}} as any;
        return JSON.stringify(doc(type,'ORIGINAL')) as any;
    });
    const view=renderHook(()=>({moves:useFileMoveTabs(),state:useRecoilState(gBoardList)}),{wrapper:({children})=><RecoilRoot initializeState={({set})=>set(gBoardList,[source] as any)}>{children}</RecoilRoot>});
    await act(async()=>{await moveFile('/src','/dest/src',view.result.current.moves('/src'));});
    expect(view.result.current.state[0][0]).toMatchObject({id:'owner',path:distinct?'/SRC/':'/dest/src/',name});
    expect(isBoardSaved(view.result.current.state[0][0])).toBe(true);
});

for(const type of ['wrk','dsh'])test(`${type}: failed recovery read cannot claim that the moved draft was saved`,async()=>{await verifyUnknownMove(type,'unknown',0);});

for (const type of ['wrk', 'dsh']) for (const status of [502, 503, 504]) test(`${type}: gateway ${status} reconciles the completed move through the existing loader`, async () => {await verifyUnknownMove(type,'moved',status);});

for (const type of ['wrk', 'dsh']) test(`${type}: an in-flight move can finish after both probes; stale Save must not recreate its source`, async () => {await verifyUnknownMove(type,'not-moved',0);});

for (const type of ['wrk', 'dsh']) test(`${type}: an explicit Neo rejection preserves the original saved binding`, async () => {
    const name = 'case.' + type, source = board(type, name, 'ORIGINAL');
    jest.mocked(request).mockImplementation(async (config: any) => {
        if (config.method === 'PUT') return {status: 500, headers: {}, data: {success: false, reason: 'destination already exists'}} as any;
        if (config.url === '/api/files/') return {data: {isDir: true, children: [{name: 'src', isDir: true}]}} as any;
        return {data: {isDir: true, children: [{name}]}} as any;
    });
    const view = renderHook(() => ({moves: useFileMoveTabs(), state: useRecoilState(gBoardList)}), {
        wrapper: ({children}) => <RecoilRoot initializeState={({set}) => set(gBoardList, [source] as any)}>{children}</RecoilRoot>,
    });
    await act(async () => { await moveFile('/src/' + name, '/dest/' + name, view.result.current.moves('/src/' + name)); });
    expect(view.result.current.state[0][0]).toEqual(source); expect(isBoardSaved(view.result.current.state[0][0])).toBe(true);
});


for (const type of ['wrk', 'dsh']) for (const edited of [false, true]) for (const readFails of [false, true]) {
    test(`${type}: normal move retains a known baseline without unnecessary GET (edited=${edited}, readFails=${readFails})`, async () => {
        const name = 'case.' + type, original: any = doc(type, 'ORIGINAL');
        if (type === 'dsh') original.dashboard.distanceRange = {start: '', end: ''};
        const source = {...board(type, name, 'ORIGINAL'),
            ...(type === 'wrk' ? {sheet: original.data} : original),
            savedCode: JSON.stringify(type === 'wrk' ? original.data : original.dashboard)};
        const draft = {...source, id:'new-draft', name:'DRAFT.' + type, path:'', savedCode:false};
        const sql = {id:'sql', type:'sql', name:'SQL', path:'', code:'KEEP SQL DRAFT', savedCode:''};
        const disk = new Map([['/src/' + name, original]]), posts: string[] = [];
        let finish!: () => void, held = false;
        const gate = new Promise<void>(resolve => {finish = resolve;});
        jest.mocked(request).mockImplementation(async (config: any) => {
            const path = config.url.replace('/api/files', '');
            if (config.method === 'PUT') {held = true; await gate; disk.set('/dest/' + name, disk.get('/src/' + name)!); disk.delete('/src/' + name); return {success:true} as any;}
            if (config.method === 'POST') {posts.push(path); return {success:true} as any;}
            if (path === '/') return {data:{isDir:true, children:[{name:'src',isDir:true},{name:'dest',isDir:true}]}} as any;
            if (path === '/src/') return {data:{isDir:true,children:[{name}]}} as any;
            if (path === '/dest/' + name && readFails) return lost as any;
            return (disk.has(path) ? JSON.stringify(disk.get(path)) : missing) as any;
        });
        const view = renderHook(() => ({moves:useFileMoveTabs(), state:useRecoilState(gBoardList)}), {
            wrapper:({children}) => <RecoilRoot initializeState={({set})=>set(gBoardList,[source,draft,sql] as any)}>{children}</RecoilRoot>,
        });
        let moving!: Promise<any>;
        await act(async () => {
            moving = moveFile('/src', '/dest', view.result.current.moves('/src'));
            for (let i = 0; i < 300 && !held; i++) await Promise.resolve();
            expect(held).toBe(true);
        });
        try {
            await act(async () => {
                expect(await saveBoardFile({board:draft, target:{path:'/src/',name:'new.' + type}, saveAs:true,
                    getSaveBoards:()=>view.result.current.state[0], onSuccess:jest.fn(),
                    onUncertain:(target=draft)=>view.result.current.state[1](boards=>invalidateFileSaveResult(boards,target)),
                })).toBe(false);
                if (edited) view.result.current.state[1](boards=>boards.map(board=>board.id==='owner' ? {...board,
                    ...(type==='wrk' ? {sheet:[{...original.data[0],contents:'LATER EDIT'}]} : {dashboard:{...original.dashboard,title:'LATER EDIT'}})} : board));
            });
            expect(view.result.current.state[0][0].savedCode).toBe(source.savedCode);
        } finally {finish(); await act(async()=>{await moving;});}
        const current = view.result.current.state[0][0];
        expect(current).toMatchObject({id:'owner', path:'/dest/', name});
        expect(type==='wrk' ? current.sheet![0].contents : current.dashboard.title).toBe(edited?'LATER EDIT':'ORIGINAL');
        expect(current.savedCode).toBe(source.savedCode);
        expect(isBoardSaved(current)).toBe(!edited);
        expect(view.result.current.state[0].map(board=>board.id)).toEqual(['owner','new-draft','sql']);
        expect(view.result.current.state[0][1]).toEqual(draft); expect(view.result.current.state[0][2]).toEqual(sql);
        expect(posts).toEqual([]); expect(disk.has('/src/' + name)).toBe(false);
        expect(disk.get('/dest/' + name)).toEqual(original);
    });
}

async function verifyUnknownMove(type:string,mode:string,status:number){
 const name='case.'+type,source={...board(type,name,'LATER EDIT')},sql={id:'sql',name:'SQL',path:'',type:'sql',code:'KEEP DRAFT',savedCode:''};
 const disk=new Map<string,any>([['/src/'+name,doc(type,'ORIGINAL')]]);const writes:string[]=[];
 jest.mocked(request).mockImplementation(async(c:any)=>{const path=c.url.replace('/api/files','');
  if(c.method==='PUT'){if(mode==='moved'){disk.set('/dest/'+name,disk.get('/src/'+name));disk.delete('/src/'+name);}return(status?{status,headers:{},data:{reason:'gateway'}}:lost) as any;}
  if(c.method==='POST'){writes.push(path);disk.set(path,c.data);return{success:true} as any;}
  if(path==='/')return{data:{isDir:true,children:[{name:'src',isDir:true},{name:'dest',isDir:true}]}} as any;
  if(path==='/src/'||path==='/dest/')return{data:{isDir:true,children:[{name}]}} as any;
  return(disk.has(path)?JSON.stringify(disk.get(path)):missing) as any;
 });
 const view=renderHook(()=>({moves:useFileMoveTabs(),state:useRecoilState(gBoardList)}),{wrapper:({children})=><RecoilRoot initializeState={({set})=>set(gBoardList,[source,sql] as any)}>{children}</RecoilRoot>});
 await act(async()=>{await moveFile('/src/'+name,'/dest/'+name,view.result.current.moves('/src/'+name));});
 const current=view.result.current.state[0][0];expect(current).toMatchObject({id:'owner',path:'/src/'});expect(type==='wrk'?current.sheet![0].contents:current.dashboard.title).toBe('LATER EDIT');expect(isBoardSaved(current)).toBe(false);
 expect(await readFileConsistently('/dest/'+name,async()=>JSON.stringify(disk.get('/dest/'+name)))).toMatchObject({success:false});
 const target={path:'/',name:'rescue.'+type};
 await act(async()=>{expect(await saveBoardFile({board:current,target,saveAs:true,getSaveBoards:()=>view.result.current.state[0],onUncertain:jest.fn(),onSuccess:(submitted,context)=>view.result.current.state[1](boards=>applySaveAsResult(boards,{owner:current,target,fileType:type,submitted,sourceIsCurrent:context.isLatestAction,confirmed:false,isSaving:context.isSaving}))})).toBe(true);});
 expect(writes).toEqual(['/rescue.'+type]);expect(view.result.current.state[0].map(b=>b.id)).toEqual(['owner','sql']);expect(view.result.current.state[0][1]).toEqual(sql);expect(isBoardSaved(view.result.current.state[0][0])).toBe(true);view.unmount();
}
