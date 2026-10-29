import { getFiles } from '@/api/repository/fileTree';
import { resolveOverwrite } from './fileExistence';
import { forgetFileIdentities, getFileIdentity, hasFileIdentity, rememberDirectoryIdentity, rememberFileIdentity } from './fileIdentity';
import { isTabOnFile } from './boardAfterOverwrite';
import { applyFileSaveResult, applySaveAsResult } from './boardSaveResult';
import { isBoardSaved } from './boardSaveStatus';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';

jest.mock('@/api/repository/fileTree', () => ({getFiles: jest.fn()}));
afterEach(() => { forgetFileIdentities(); jest.resetAllMocks(); });

it.each([true, false])('server-observed same-file=%s keeps both drafts and uses the correct saved baseline', async sameFile => {
    const listing = {success:true,data:{isDir:true,children:[{name:'a.sql',type:'.sql'}]}};
    jest.mocked(getFiles).mockResolvedValueOnce(listing as any)
        .mockResolvedValueOnce((sameFile ? 'OLD' : {status:404,headers:{},data:{reason:'missing'}}) as any);
    expect(await resolveOverwrite('/', 'A.sql', async () => true)).toEqual({status:'confirmed'});
    const source = {id:'source',name:'source.sql',path:'/',type:'sql',code:'SOURCE',savedCode:'SOURCE_OLD'};
    const destination = {id:'destination',name:'a.sql',path:'/',type:'sql',code:'DEST_EDIT',savedCode:'DEST_OLD'};
    const boards = applySaveAsResult([source,destination], {owner:source,target:{path:'/',name:'A.sql'},fileType:'sql',submitted:'SOURCE',sourceIsCurrent:true,confirmed:true,previousBoards:new Map([[source.id,source],[destination.id,destination]]),isSaving:b=>b.id===destination.id});
    expect(boards).toHaveLength(2);expect(boards[1].code).toBe('DEST_EDIT');expect(boards[1].path).toBe('/');
    expect(boards[0].name).toBe(sameFile?'source.sql':'A.sql');
    expect(boards[1].savedCode).toBe(sameFile?'SOURCE':'DEST_OLD');
    const saved = applyFileSaveResult(boards, destination, 'sql', 'DEST_EDIT');
    expect(isBoardSaved(saved[1])).toBe(true);expect(saved[0].code).toBe('SOURCE');
    expect(saved[0].savedCode).toBe(sameFile?'SOURCE_OLD':'SOURCE');
    expect(isTabOnFile({id:'draft',name:'a.sql',path:''},{path:'/',name:'A.sql'},true)).toBe(false);
});

it('keeps case variants distinct when both exact names exist, without probing a file', async () => {
    jest.mocked(getFiles).mockResolvedValueOnce({success:true,data:{isDir:true,children:[{name:'a.sql'},{name:'A.sql'}]}} as any);
    expect(await resolveOverwrite('/', 'A.sql', async () => true)).toEqual({status:'confirmed'});
    expect(getFiles).toHaveBeenCalledTimes(1);
    expect(isTabOnFile({id:'a',path:'/',name:'a.sql'},{path:'/',name:'A.sql'})).toBe(false);
});

it('refuses an unverified alias and never treats a same-name folder as a file', async () => {
    jest.mocked(getFiles).mockResolvedValueOnce({success:true,data:{isDir:true,children:[{name:'a.sql'}]}} as any)
        .mockResolvedValueOnce({status:503,headers:{},data:{reason:'unavailable'}} as any);
    expect(await resolveOverwrite('/', 'A.sql', async () => true)).toEqual({status:'failed',reason:'unavailable'});
    expect(hasFileIdentity('/A.sql')).toBe(false);
    jest.mocked(getFiles).mockResolvedValueOnce({success:true,data:{isDir:true,children:[{name:'A.sql',isDir:true}]}} as any);
    const ask=jest.fn();expect((await resolveOverwrite('/', 'A.sql', ask)).status).toBe('folder');expect(ask).not.toHaveBeenCalled();
});

it('moves/deletes clear related aliases and logout clears all identities', () => {
    rememberFileIdentity('/d/A.sql','/d/a.sql');rememberFileIdentity('/d/a.sql','/d/a.sql');rememberFileIdentity('/d2/A.sql','/d2/a.sql');
    forgetFileIdentities('/D/');expect(hasFileIdentity('/d/A.sql')).toBe(false);expect(hasFileIdentity('/d2/A.sql')).toBe(true);
    cancelAllPendingFileWrites();expect(hasFileIdentity('/d2/A.sql')).toBe(false);
});

it('probes JSON aliases as raw text even when their file contents contain success:false', async () => {
    jest.mocked(getFiles).mockResolvedValueOnce({success:true,data:{isDir:true,children:[{name:'a.json'}]}} as any)
        .mockResolvedValueOnce('{"success":false}' as any);
    expect(await resolveOverwrite('/', 'A.JSON', async () => true)).toEqual({status:'confirmed'});
    expect(getFiles).toHaveBeenLastCalledWith('/A.JSON',{rawText:true});
    expect(isTabOnFile({id:'a',path:'/',name:'a.json'},{path:'/',name:'A.JSON'},true)).toBe(true);
});

it.each([true, false])('resolves every parent folder while preserving native same-file=%s', async sameFile => {
    jest.mocked(getFiles).mockImplementation(async path => ({success:true,data:{isDir:true,children:
        path === '/' ? [{name:'Reports',isDir:true}, ...sameFile ? [] : [{name:'reports',isDir:true}]] :
        path === '/Reports/' ? [{name:'Nested',isDir:true}] :
        path === '/reports/' ? [{name:'nested',isDir:true}] : [{name:'a.sql',type:'.sql'}],
    }} as any));
    await resolveOverwrite('/Reports/Nested/', 'a.sql', async () => true);
    await resolveOverwrite('/reports/nested/', 'a.sql', async () => true);
    expect(isTabOnFile({id:'alias',path:'/reports/nested/',name:'a.sql'}, {path:'/Reports/Nested/',name:'a.sql'},true)).toBe(sameFile);
    expect(getFileIdentity('/reports/nested/a.sql')).toBe(sameFile ? '/Reports/Nested/a.sql' : '/reports/nested/a.sql');
});

it('refuses a failed parent lookup without asking or recording a file identity', async () => {
    jest.mocked(getFiles).mockResolvedValueOnce({success:true,data:{isDir:true,children:[{name:'a.sql'}]}} as any)
        .mockResolvedValueOnce({status:503,headers:{},data:{reason:'parent unavailable'}} as any);
    const ask = jest.fn();
    expect(await resolveOverwrite('/Reports/', 'a.sql', ask)).toEqual({status:'failed',reason:'parent unavailable'});
    expect(ask).not.toHaveBeenCalled();
    expect(hasFileIdentity('/Reports/a.sql')).toBe(false);
});

it('folder mutation and logout clear observed directory aliases as well as files', () => {
    rememberDirectoryIdentity('/reports/', '/Reports/');
    rememberDirectoryIdentity('/other/', '/Other/');
    expect(getFileIdentity('/reports/a.sql')).toBe('/Reports/a.sql');
    forgetFileIdentities('/Reports/');
    expect(getFileIdentity('/reports/a.sql')).toBe('/reports/a.sql');
    expect(getFileIdentity('/other/a.sql')).toBe('/Other/a.sql');
    cancelAllPendingFileWrites();
    expect(getFileIdentity('/other/a.sql')).toBe('/other/a.sql');
});

it('a verified folder alias also matches a newly created exact file name', () => {
    rememberDirectoryIdentity('/reports/', '/Reports/');
    expect(hasFileIdentity('/reports/new.sql')).toBe(false);
    expect(isTabOnFile({id:'alias',path:'/reports/',name:'new.sql'}, {path:'/Reports/',name:'new.sql'},true)).toBe(true);
});
