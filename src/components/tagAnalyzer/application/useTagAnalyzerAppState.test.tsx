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
import { useTagAnalyzerAppState } from './useTagAnalyzerAppState';

const tab = (id: string, name: string, path: string) => ({ id, type: 'taz', name, path, code: '', savedCode: '' }) as any;

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
        result.current.app.updateSavedBoard({ ...sTabs[0], name: 'b.taz', path: '/d/' }, { overwritten: false });
    });
    expect(result.current.boards.map((aB) => aB.id)).toEqual(['cur', 'stale', 'caseOnly', 'elsewhere']);
    expect(result.current.boards[0].name).toBe('b.taz');
});
