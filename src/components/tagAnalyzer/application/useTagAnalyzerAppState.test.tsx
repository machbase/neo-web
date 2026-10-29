// issue-1544 r13/r15: after a TAZ Save As over an existing file, the saving tab is kept/updated and OTHER tabs open
// on that file (exact real name + path) are closed — only when the overwrite was confirmed. A Ctrl+S save
// (no confirm) closes nothing; a tab whose name differs only in case is a different file (Linux) and stays.

jest.mock('../api/tableMetadataApi', () => ({ tableMetadataApi: { fetchRollupMetadata: jest.fn(() => Promise.resolve({})) } }));
jest.mock('@/utils/UpdateTree', () => ({ TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })) }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { createTazBoardSnapshot } from '../persistence/tazBoardSnapshot';
import { useTagAnalyzerAppState } from './useTagAnalyzerAppState';

const tab = (id: string, name: string, path: string) => createTazBoardSnapshot({ id, type: 'taz', name, path, code: '', panels: [], boardTimeRange: {start:'now-1h',end:'now'}, boardNumericRange:{start:'',end:''}, savedCode: false }) as any;

const setup = (aTabs: any[]) => {
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(
            RecoilRoot,
            {
                initializeState: ({ set }: any) => {
                    set(gBoardList, aTabs);
                    set(gSelectedTab, 'other-tab');
                },
            } as any,
            children
        );
    return renderHook(() => ({ app: useTagAnalyzerAppState(aTabs[0]), boards: useRecoilValue(gBoardList) as any[] }), { wrapper });
};

const sTabs = [tab('cur', 'mine.taz', '/'), tab('stale', 'b.taz', '/d/'), tab('caseOnly', 'B.TAZ', '/d/'), tab('elsewhere', 'b.taz', '/x/')];

it('confirmed overwrite (r20): keeps the saving tab, closes other tabs on the confirmed file (case-insensitive name, same path), leaves other-path tabs', async () => {
    const { result } = setup(sTabs);
    await act(async () => {
        // onSaveAs got the TYPED name 'b.taz' (r20) and saved into /d/ after a confirm
        result.current.app.updateSavedBoard({ ...sTabs[0], name: 'b.taz', path: '/d/' }, { overwritten: true });
    });
    expect(result.current.boards.map((aB) => [aB.id, aB.name, aB.path])).toEqual([
        ['cur', 'b.taz', '/d/'],
        ['elsewhere', 'b.taz', '/x/'],
    ]);
});

it('not confirmed (Ctrl+S / new file): only the saving tab changes', async () => {
    const { result } = setup(sTabs);
    await act(async () => {
        result.current.app.updateSavedBoard({ ...sTabs[0], name: 'b.taz', path: '/d/' }, { overwritten: false, saveAs: true });
    });
    expect(result.current.boards.map((aB) => aB.id)).toEqual(['cur', 'stale', 'caseOnly', 'elsewhere']);
    expect(result.current.boards[0].name).toBe('b.taz');
});


it('acknowledgement-only results preserve tabs and later runtime content without moving a newer Save As owner', async () => {
    const writer = {...tab('writer','copy.taz','/new/'), boardTimeRange: {start:'now-4h',end:'now'},panels:[]};
    const target = {...tab('target','old.taz','/'), boardTimeRange:{start:'now-3h',end:'now'},panels:[]};
    const neighbour = {...target,id:'case-neighbour',name:'OLD.TAZ'};
    const {result} = setup([writer,target,neighbour]);
    await act(async () => result.current.app.updateSavedBoard({...writer,name:'old.taz',path:'/',savedCode:'first snapshot'}, {overwritten:false,acknowledgementOnly:true}));
    expect(result.current.boards[0]).toBe(writer);
    expect(result.current.boards[1]).toEqual({...target,savedCode:'first snapshot',version:undefined,loadWarning:undefined});
    expect(result.current.boards[2]).toBe(neighbour);
});


it('mirrors runtime edits without rolling back saved metadata, and ignores a stale renamed owner', async () => {
    const original=tab('owner','a.taz','/');const {result}=setup([original]);
    await act(async()=>result.current.app.updateRuntimeBoard({...original,boardTimeRange:{start:'now-3h',end:'now'},savedCode:'STALE'}));
    expect(result.current.boards[0].boardTimeRange.start).toBe('now-3h');expect(result.current.boards[0].savedCode).toBe(original.savedCode);
    await act(async()=>result.current.app.updateRuntimeBoard({...original,name:'old.taz',boardTimeRange:{start:'now-4h',end:'now'}}));
    expect(result.current.boards[0].boardTimeRange.start).toBe('now-3h');
});

it('keeps different files acknowledgements when success and uncertainty arrive in one batch', async () => {
    const a={...tab('a','a.taz','/'),boardTimeRange:{start:'now-2h',end:'now'}};
    const b={...tab('b','b.taz','/'),boardTimeRange:{start:'now-2h',end:'now'}};
    const saved=createTazBoardSnapshot({...a,name:'b.taz'});
    const {result}=setup([a,b]);
    await act(async()=>{
        result.current.app.updateSavedBoard(saved,{overwritten:false,acknowledgementOnly:true});
        result.current.app.updateSavedBoard({...a,savedCode:false},{overwritten:false,acknowledgementOnly:true});
    });
    expect(result.current.boards[0].savedCode).toBe(false);
    expect(result.current.boards[1].savedCode).toBe(saved.savedCode);
    expect(result.current.boards.map(board=>board.boardTimeRange.start)).toEqual(['now-2h','now-2h']);
});
