import {act, renderHook} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import request from '@/api/core';
import {gBoardList} from '@/recoil/recoil';
import {useBoardFileSave} from './useBoardFileSave';
import {saveBoardFile} from '@/utils/boardFileSave';
import {applyFileReadResult, applyFileSaveResult, invalidateFileSaveResult} from '@/utils/boardSaveResult';
import {isBoardSaved} from '@/utils/boardSaveStatus';
import {rememberFileIdentity} from '@/utils/fileIdentity';

jest.mock('@/api/core', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@/design-system/components', () => ({Toast: {error: jest.fn()}}));

const panel = (id: string) => ({id, title: id, type: 'line'});
const original = {id: 'dashboard', name: 'auto.dsh', path: '/', type: 'dsh', code: '',
    dashboard: {title: 'ORIGINAL', panels: [panel('one')], variables: [], timeRange: {start: 'now-1h', end: 'now'}},
    savedCode: JSON.stringify({title: 'ORIGINAL', panels: [panel('one')], variables: [], timeRange: {start: 'now-1h', end: 'now'}})};
const draft = {id: 'draft', name: 'SQL', path: '', type: 'sql', code: 'KEEP DRAFT', savedCode: ''};

// One browser case per automatic-save entry point is enough; terminal outcomes
// share the real automatic hook, common queue, serializer and saved-state rules.
for (const manualSucceeds of [false, true]) {
    it.each(['success', 'rejected-before-write', 'rejected-after-write'])(
        `automatic save %s after manual success=${manualSucceeds} keeps live edits and the actual baseline`,
        async outcome => {
            let disk = JSON.stringify(original), posts = 0, release!: () => void, entered!: () => void;
            const gate = new Promise<void>(resolve => {release = resolve;}), started = new Promise<void>(resolve => {entered = resolve;});
            rememberFileIdentity('/auto.dsh', '/auto.dsh');
            jest.mocked(request).mockImplementation(async (config: any) => {
                if (config.method === 'GET') return (config.url.endsWith('/')
                    ? {success: true, data: {isDir: true, children: [{name: 'auto.dsh'}]}} : disk) as any;
                const bytes = JSON.stringify(config.data);
                if (++posts === 1) {
                    if (manualSucceeds) disk = bytes;
                    entered(); await gate;
                    return (manualSucceeds ? {success: true} : {status: 500, headers: {}, data: {success: false}}) as any;
                }
                if (outcome === 'success' || outcome === 'rejected-after-write') disk = bytes;
                return (outcome === 'success' ? {success: true} : {status: 500, headers: {}, data: {success: false, reason: outcome}}) as any;
            });
            const view = renderHook(() => ({automatic: useBoardFileSave(), boards: useRecoilState(gBoardList)}), {
                wrapper: ({children}) => <RecoilRoot initializeState={({set}) => set(gBoardList, [original, draft] as any)}>{children}</RecoilRoot>,
            });
            let manual!: Promise<boolean>, automatic!: Promise<void>;
            act(() => {manual = saveBoardFile({board: original, getSaveBoards: () => view.result.current.boards[0],
                onSuccess: submitted => view.result.current.boards[1](boards => applyFileSaveResult(boards, original, 'dsh', submitted)),
                onRead: loaded => view.result.current.boards[1](boards => applyFileReadResult(boards, loaded)),
                onUncertain: () => view.result.current.boards[1](boards => invalidateFileSaveResult(boards, original)),
            });});
            await started;
            const edited = {...original, dashboard: {...original.dashboard, panels: [...original.dashboard.panels, panel('two')]}};
            act(() => view.result.current.boards[1]([edited, draft, {...draft, id: 'later-draft'}] as any));
            act(() => {automatic = view.result.current.automatic(edited);});
            expect(posts).toBe(1);
            await act(async () => {release(); await manual; await automatic;});
            const current = view.result.current.boards[0][0] as typeof original;
            const persisted = JSON.parse(disk);
            const automaticStored = outcome === 'success' || outcome === 'rejected-after-write';
            expect(current.dashboard.panels).toHaveLength(2);
            expect(persisted.dashboard.panels).toHaveLength(automaticStored ? 2 : 1);
            expect(isBoardSaved(current)).toBe(automaticStored);
            expect(current.savedCode).toBe(JSON.stringify(persisted.dashboard));
            expect(view.result.current.boards[0].slice(1)).toEqual([draft, {...draft, id: 'later-draft'}]);
            expect(posts).toBe(2);
            view.unmount();
        },
    );
}
