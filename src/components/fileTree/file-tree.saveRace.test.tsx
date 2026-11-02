import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { RecoilRoot, useRecoilState } from 'recoil';
import request from '@/api/core';
import { FileTree } from './file-tree';
import { gBoardList } from '@/recoil/recoil';
import { gFileTree } from '@/recoil/fileTree';
import { cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';
import { rememberFileIdentity } from '@/utils/fileIdentity';
import { saveBoardFile } from '@/utils/boardFileSave';
import { applyFileSaveResult, invalidateFileSaveResult } from '@/utils/boardSaveResult';
import { isBoardSaved } from '@/utils/boardSaveStatus';

jest.mock('@/api/core', () => ({ __esModule: true, default: jest.fn() }));
const deferred = () => {
    let resolve!: (value: any) => void;
    const promise = new Promise<any>(done => { resolve = done; });
    return { promise, resolve };
};
const board = (type: string, value: string) => ({
    id: 'peer', name: `keep.${type}`, path: '/', type, code: '',
    savedCode: JSON.stringify(type === 'wrk' ? [{ id: 'cell', contents: value }] : { title: value }),
    ...(type === 'wrk' ? { sheet: [{ id: 'cell', contents: value }] } : { dashboard: { title: value } }),
});
beforeEach(() => { cancelAllPendingFileWrites(); jest.mocked(request).mockReset(); });
afterEach(() => cancelAllPendingFileWrites());

for (const type of ['wrk', 'dsh']) {
    test(`${type}: delayed drag preserves acknowledged content, metadata and a new draft`, async () => {
        const moved = deferred(), saved = deferred();
        let moveSent = false, saveSent = false;
        let current: any[] = [], setCurrent!: (update: any) => void;
        const original = board(type, 'OLD');
        const file = { id: `SS.${type}`, name: `SS.${type}`, path: '/src/', depth: 2, type: 0 };
        const source = { id: 'src', name: 'src', path: '/', depth: 1, type: 1, parentId: '0', isOpen: true, files: [file], dirs: [] };
        const target = { id: 'dest', name: 'dest', path: '/', depth: 1, type: 1, parentId: '0', isOpen: true, files: [], dirs: [] };
        const root = { id: '0', name: '/', path: '/', depth: 0, type: 1, isOpen: true, dirs: [source, target], files: [] };
        function Observe() {
            const [boards, setBoards] = useRecoilState(gBoardList);
            current = boards; setCurrent = setBoards;
            return null;
        }
        rememberFileIdentity(original.path + original.name, original.path + original.name);
        jest.mocked(request).mockImplementation(async (config: any) => {
            if (config.method === 'PUT') { moveSent = true; return moved.promise; }
            if (config.method === 'POST') { saveSent = true; return saved.promise; }
            return { success: true } as any;
        });
        const view = render(
            <RecoilRoot initializeState={({ set }) => { set(gBoardList, [original] as any); set(gFileTree, root as any); }}>
                <Observe />
                <FileTree rootDir={root as any} selectedFile={undefined} onSelect={() => {}} onFetchDir={() => {}}
                    onContextMenu={() => {}} onSetFileTree={() => {}} onRename={() => {}} />
            </RecoilRoot>
        );
        const saving = saveBoardFile({
            board: board(type, 'NEW'), getSaveBoards: () => current,
            onSuccess: submitted => setCurrent((boards: any[]) => applyFileSaveResult(boards, original, type, submitted)),
            onUncertain: (uncertain = original) => setCurrent((boards: any[]) => invalidateFileSaveResult(boards, uncertain)),
        });
        await waitFor(() => expect(saveSent).toBe(true));
        const item = view.container.querySelector(`[id="/src/SS.${type}-2"]`)!;
        const destination = view.container.querySelector('[id="/dest-1"]')!;
        fireEvent.dragStart(item); fireEvent.dragEnter(destination); fireEvent.dragEnd(item);
        await waitFor(() => expect(moveSent).toBe(true));
        await act(async () => { saved.resolve({ success: true }); expect(await saving).toBe(true); });
        expect(isBoardSaved(current[0])).toBe(false);
        expect(current[0].savedCode).toContain('NEW');
        const confirmed = current[0];
        const draft = { id: 'fresh', name: 'new.sql', path: '', type: 'sql', code: 'UNSAVED NEW TAB', savedCode: false };
        act(() => setCurrent((boards: any[]) => [...boards, draft]));
        await act(async () => { moved.resolve({ success: true }); await moved.promise; });
        await waitFor(() => expect(current).toHaveLength(2));
        expect(current[0]).toBe(confirmed);
        expect(isBoardSaved(current[0])).toBe(false);
        expect(current[1]).toBe(draft);
    });
}
