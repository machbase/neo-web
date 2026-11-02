import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosHeaders } from 'axios';
import { getFiles } from '@/api/repository/fileTree';
import { SaveAsModal } from './SaveAsModal';
import { tazFileApi, type FileListItem } from './tazFileApi';

jest.mock('./tazFileApi', () => ({tazFileApi:{fetchTazFileList:jest.fn()}}));
jest.mock('@/api/repository/fileTree', () => ({getFiles:jest.fn()}));
const fetchFiles=jest.mocked(tazFileApi.fetchTazFileList);
const directory:FileListItem={name:'reports',type:'dir',size:0,lastModifiedUnixMillis:0};
const file:FileListItem={name:'existing.taz',type:'.taz',size:10,lastModifiedUnixMillis:0};
const emptyDirectoryResponse:Awaited<ReturnType<typeof getFiles>>={status:200,statusText:'OK',headers:{},config:{headers:new AxiosHeaders()},data:{name:'reports',isDir:true,gitClone:false,children:[]}};
const rootEntries = [{name:'boards',isDir:true},{name:'reports',isDir:true}];
beforeEach(()=>{fetchFiles.mockReset();jest.mocked(getFiles).mockReset().mockImplementation(async path => path==='/'
    ? {...emptyDirectoryResponse,data:{...emptyDirectoryResponse.data,children:rootEntries as any}} : emptyDirectoryResponse);});
afterEach(()=>jest.restoreAllMocks());

// Simulate the queue granting a turn. File writes themselves belong to the
// real queue tests; the modal supplies a live, cancellable final check.
function saveBoundary(success=true) {
    const write=jest.fn().mockResolvedValue(success);
    const onSaveAs=jest.fn(async(path,name,_overwritten,_before,prepare,canWrite)=>{
        const decision=await prepare(canWrite);
        return decision.status==='none'||decision.status==='confirmed'?write(path,name,decision.status==='confirmed'):false;
    });
    return {write,onSaveAs};
}

test('browses folders and defers the overwrite question to its queued final check',async()=>{
    fetchFiles.mockResolvedValueOnce([directory]).mockResolvedValue([file]);const {write,onSaveAs}=saveBoundary();const onClose=jest.fn();
    jest.mocked(getFiles).mockImplementation(async path=>({...emptyDirectoryResponse,data:{...emptyDirectoryResponse.data,
        children:(path==='/'?rootEntries:path==='/boards/'?[{name:'reports',isDir:true}]:[{name:file.name,isDir:false,gitClone:false,lastModifiedUnixMillis:0n,type:'.taz',virtual:false}]) as any}}));
    render(<SaveAsModal initialDirectoryPath=" /boards/ " initialFileName="copy" onClose={onClose} onSaveAs={onSaveAs}/>);
    expect(await screen.findByTestId('tag-analyzer-save-as-file-name-input')).toHaveValue('copy.taz');
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-item-reports'),{detail:2});fireEvent.click(await screen.findByTestId('tag-analyzer-save-as-item-existing.taz'));
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('cancel'));
    await waitFor(()=>expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());expect(write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm'));
    await waitFor(()=>expect(onClose).toHaveBeenCalledTimes(1));expect(write).toHaveBeenCalledWith('/boards/reports/','existing.taz',true);
});

test('disables saving during navigation and keeps the dialog open after a failed save',async()=>{
    let finish!:(files:FileListItem[])=>void;fetchFiles.mockResolvedValueOnce([directory]).mockImplementationOnce(()=>new Promise(r=>finish=r));
    const {write,onSaveAs}=saveBoundary(false),onClose=jest.fn();render(<SaveAsModal initialDirectoryPath="/" initialFileName="copy.taz" onClose={onClose} onSaveAs={onSaveAs}/>);
    fireEvent.click(await screen.findByTestId('tag-analyzer-save-as-item-reports'),{detail:2});expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeDisabled();
    await act(async()=>finish([]));fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    await waitFor(()=>expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());expect(write).toHaveBeenCalledWith('/reports/','copy.taz',false);expect(onClose).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'),{target:{value:'wrong.sql'}});expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeDisabled();
});

test('captures destination contents before queueing and refuses an unmounted final check',async()=>{
    fetchFiles.mockResolvedValue([]);const original:any={id:'b',type:'taz',name:'b.taz',path:'/',panels:[],boardTimeRange:{start:'now-1h',end:'now'}};let live=original;
    const onSaveAs=jest.fn(()=>new Promise<boolean>(()=>{}));const view=render(<SaveAsModal initialDirectoryPath="/" initialFileName="b.taz" onClose={jest.fn()} onSaveAs={onSaveAs} getSaveBoards={()=>[live]}/>);
    await waitFor(()=>expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));await waitFor(()=>expect(onSaveAs).toHaveBeenCalled());
    live={...original,boardTimeRange:{start:'now-3h',end:'now'}};
    const args=(onSaveAs.mock.calls[0] as unknown as any[]);expect(args[3].get(original.id)).toBe(original);expect(getFiles).not.toHaveBeenCalled();
    view.unmount();expect(await args[4](()=>true)).toEqual({status:'cancel'});expect(getFiles).not.toHaveBeenCalled();
});

test('cancelling a running final lookup also cancels its authentication retry',async()=>{
    fetchFiles.mockResolvedValue([]);
    let finish!:(value:Awaited<ReturnType<typeof getFiles>>)=>void;
    jest.mocked(getFiles).mockImplementationOnce(()=>new Promise(resolve=>finish=resolve));
    const {write,onSaveAs}=saveBoundary();
    render(<SaveAsModal initialDirectoryPath="/" initialFileName="copy.taz" onClose={jest.fn()} onSaveAs={onSaveAs}/>);
    await waitFor(()=>expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    await waitFor(()=>expect(getFiles).toHaveBeenCalledTimes(1));
    const retry=jest.mocked(getFiles).mock.calls[0][1]?.canRetryFileRequest;
    expect(retry).toEqual(expect.any(Function));expect(retry?.()).toBe(true);
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-cancel-button'));
    expect(retry?.()).toBe(false);
    await act(async()=>finish(emptyDirectoryResponse));
    expect(write).not.toHaveBeenCalled();expect(getFiles).toHaveBeenCalledTimes(1);
});

test('Cancel also invalidates authentication retry for a pending directory listing',async()=>{
    let finish!:(files:FileListItem[])=>void;
    let canRetry:(()=>boolean)|undefined;
    fetchFiles.mockResolvedValueOnce([directory]).mockImplementationOnce((_segments,canRead)=>{
        canRetry=canRead;return new Promise(resolve=>finish=resolve);
    });
    const onClose=jest.fn();render(<SaveAsModal initialDirectoryPath="/" initialFileName="copy.taz" onClose={onClose} onSaveAs={jest.fn()}/>);
    fireEvent.click(await screen.findByTestId('tag-analyzer-save-as-item-reports'),{detail:2});
    expect(canRetry).toEqual(expect.any(Function));expect(canRetry?.()).toBe(true);
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-cancel-button'));
    expect(canRetry?.()).toBe(false);
    await act(async()=>finish([file]));
    expect(onClose).toHaveBeenCalledTimes(1);expect(screen.queryByTestId('tag-analyzer-save-as-item-existing.taz')).toBeNull();
});
