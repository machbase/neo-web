import {act, renderHook} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import type {ReactNode} from 'react';
import {gFileTree} from '@/recoil/fileTree';
import {TreeFetchDrilling} from '@/utils/UpdateTree';
import {cancelAllPendingFileWrites} from '@/api/repository/fileWriteQueue';
import {useFileTreeRefresh} from './useFileTreeRefresh';

jest.mock('@/utils/UpdateTree', () => ({TreeFetchDrilling: jest.fn()}));
const tree = (name: string) => ({depth:0, dirs:[], files:[], id:name, name, parentId:undefined, type:0, path:'/'});
const initial = tree('initial'), latest = tree('latest'), stale = tree('stale'), current = tree('current');
const wrapper = ({children}: {children: ReactNode}) => <RecoilRoot initializeState={({set}) => set(gFileTree, initial)}>{children}</RecoilRoot>;
const setup = () => renderHook(() => ({refresh:useFileTreeRefresh(), state:useRecoilState(gFileTree)}), {wrapper});
beforeEach(() => jest.resetAllMocks());

it('re-reads after another publisher changes the tree instead of publishing old data', async () => {
    let release!: (result: any) => void;
    jest.mocked(TreeFetchDrilling).mockImplementationOnce(() => new Promise(resolve => {release=resolve;})).mockResolvedValueOnce({tree:current, exist:true});
    const {result} = setup(); let refreshing!: Promise<void>;
    act(() => {refreshing = result.current.refresh('/b.sql');});
    act(() => result.current.state[1](latest));
    await act(async () => {release({tree:stale}); await refreshing;});
    expect(TreeFetchDrilling).toHaveBeenNthCalledWith(2, latest, '/b.sql', true);
    expect(result.current.state[0]).toEqual(current);
});

it('keeps the newer tree if the fresh lookup fails', async () => {
    let release!: (result: any) => void;
    jest.mocked(TreeFetchDrilling).mockImplementationOnce(() => new Promise(resolve => {release=resolve;})).mockRejectedValueOnce(new Error('lookup failed'));
    const {result} = setup(); let refreshing!: Promise<void>;
    act(() => {refreshing = result.current.refresh('/b.sql');});
    act(() => result.current.state[1](latest));
    await act(async () => {release({tree:stale}); await expect(refreshing).rejects.toThrow('lookup failed');});
    expect(result.current.state[0]).toEqual(latest);
});

it.each(['cancel','logout'])('does not publish or re-read after %s', async action => {
    let release!: (result: any) => void, active=true;
    jest.mocked(TreeFetchDrilling).mockImplementationOnce(() => new Promise(resolve => {release=resolve;}));
    const {result} = setup(); let refreshing!: Promise<void>;
    act(() => {refreshing = result.current.refresh('/b.sql', () => active);});
    act(() => {result.current.state[1](latest); if(action==='cancel')active=false;else cancelAllPendingFileWrites();});
    await act(async () => {release({tree:stale}); await refreshing;});
    expect(TreeFetchDrilling).toHaveBeenCalledTimes(1);
    expect(result.current.state[0]).toEqual(latest);
});

import {useFileTreeRead} from '@/hooks/useFileTreeRefresh';
it('an unchanged older refresh cannot discard a newer navigation result',async()=>{
 const {result}=renderHook(()=>({read:useFileTreeRead(),state:useRecoilState(gFileTree)}),{wrapper});
 let oldDone!:(v:any)=>void,newDone!:(v:any)=>void,old!:Promise<void>,next!:Promise<void>;
 const baseline=result.current.state[0];
 act(()=>{old=result.current.read(()=>new Promise(r=>{oldDone=r;}));next=result.current.read(()=>new Promise(r=>{newDone=r;}),{retry:false});});
 await act(async()=>{oldDone(baseline);await old;});
 await act(async()=>{newDone(latest);await next;});
 expect(result.current.state[0]).toEqual(latest);
});
