import { act, render } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { useRecoilValue } from 'recoil';
import { RecoilRoot, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, type GBoardListType } from '@/recoil/recoil';
import { isBoardSaved } from '@/utils/boardSaveStatus';
import { createTazBoardSnapshot } from '../persistence/tazBoardSnapshot';
import { Toast } from '@/design-system/components';
import { tableMetadataApi } from '../api/tableMetadataApi';
import type { RollupTableMap } from '../api/rollupMetadata';
import type { BoardInfo } from '../board/boardModel';
import Board from '../board/Board';
import TagAnalyzer from './TagAnalyzer';

jest.mock('@/design-system/components', () => ({
    Toast: { error: jest.fn(), warning: jest.fn() },
    Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('../api/tableMetadataApi', () => ({ tableMetadataApi: { fetchRollupMetadata: jest.fn() } }));
jest.mock('../board/Board', () => ({ __esModule: true, default: jest.fn(() => <div />) }));
const fetchMetadata = jest.mocked(tableMetadataApi.fetchRollupMetadata);
const ROLLUPS: RollupTableMap = {
    SYS: { TAG: { VALUE: [{ intervalMs: 1000, supportsFirstLast: true }] } },
};

function deferredMetadata() {
    let resolve!: (value: RollupTableMap) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<RollupTableMap>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function Workspace({ isActive, info }: { isActive: boolean; info: BoardInfo }) {
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    useEffect(() => { setSelectedTab(isActive ? info.id : ''); }, [isActive, info.id, setSelectedTab]);
    return <TagAnalyzer info={info} />;
}

let instance = 0;
function renderWorkspace(boardId = 'board-a') {
    const name = `workspace-${instance++}`;
    const content = (isActive: boolean, id: string) => {
        const info: BoardInfo = {
            id, name, type: 'taz', path: '', code: '', savedCode: false, panels: [],
            boardTimeRange: { start: '', end: '' },
            boardNumericRange: { start: '', end: '' },
        };
        return <RecoilRoot><Workspace isActive={isActive} info={info} /></RecoilRoot>;
    };
    const view = render(content(false, boardId));
    return {
        setActive: (isActive: boolean, id = boardId) => view.rerender(content(isActive, id)),
        get metadata() {
            return jest.mocked(Board).mock.calls.filter(([props]) => props.info.name === name).at(-1)?.[0].rollupTableList;
        },
        get isLoading() { return view.container.childElementCount === 0; },
    };
}

beforeEach(() => jest.clearAllMocks());

it('renders inactive workspaces with a shared empty map and gates children while loading', async () => {
    const request = deferredMetadata();
    fetchMetadata.mockReturnValue(request.promise);
    const first = renderWorkspace();
    const second = renderWorkspace('board-b');
    const emptyMap = first.metadata;

    expect(first.isLoading).toBe(false);
    expect(emptyMap).toEqual({});
    expect(second.metadata).toBe(emptyMap);
    expect(fetchMetadata).not.toHaveBeenCalled();

    first.setActive(true);
    expect(first.isLoading).toBe(true);
    expect(second.isLoading).toBe(false);
    expect(fetchMetadata).toHaveBeenCalledTimes(1);

    await act(async () => request.resolve(ROLLUPS));
    expect(first.isLoading).toBe(false);
    expect(first.metadata).toBe(ROLLUPS);
});

it('keeps loaded metadata across activation changes and board identifiers', async () => {
    const request = deferredMetadata();
    fetchMetadata.mockReturnValue(request.promise);
    const workspace = renderWorkspace();
    workspace.setActive(true);
    await act(async () => request.resolve(ROLLUPS));

    workspace.setActive(false, 'board-b');
    expect(workspace.isLoading).toBe(false);
    expect(workspace.metadata).toBe(ROLLUPS);
    workspace.setActive(true, 'board-b');
    expect(workspace.isLoading).toBe(false);
    expect(workspace.metadata).toBe(ROLLUPS);
    expect(fetchMetadata).toHaveBeenCalledTimes(1);
});

it('falls back to a stable empty result after a current failure without retrying', async () => {
    const request = deferredMetadata();
    fetchMetadata.mockReturnValue(request.promise);
    const workspace = renderWorkspace();
    workspace.setActive(true);
    await act(async () => request.reject(new Error('Metadata unavailable')));
    expect(Toast.error).not.toHaveBeenCalled();
    const fallback = workspace.metadata;

    expect(workspace.isLoading).toBe(false);
    expect(fallback).toEqual({});
    workspace.setActive(false);
    workspace.setActive(true);
    expect(workspace.metadata).toBe(fallback);
    expect(fetchMetadata).toHaveBeenCalledTimes(1);
});

it('ignores metadata completed after deactivation and reloads on reactivation', async () => {
    const oldRequest = deferredMetadata();
    const currentRequest = deferredMetadata();
    fetchMetadata.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
    const workspace = renderWorkspace();
    const emptyMap = workspace.metadata;
    workspace.setActive(true);
    workspace.setActive(false);
    await act(async () => oldRequest.resolve(ROLLUPS));

    expect(workspace.metadata).toBe(emptyMap);
    expect(workspace.isLoading).toBe(false);
    workspace.setActive(true);
    expect(workspace.isLoading).toBe(true);
    expect(fetchMetadata).toHaveBeenCalledTimes(2);

    await act(async () => currentRequest.resolve(ROLLUPS));
    expect(workspace.isLoading).toBe(false);
    expect(workspace.metadata).toBe(ROLLUPS);
});

it.each(['success', 'failure'] as const)('ignores an obsolete %s after changing boards', async (outcome) => {
    const oldRequest = deferredMetadata();
    const currentRequest = deferredMetadata();
    fetchMetadata.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
    const workspace = renderWorkspace();
    workspace.setActive(true);
    workspace.setActive(true, 'board-b');

    await act(async () => {
        if (outcome === 'success') oldRequest.resolve({});
        else oldRequest.reject(new Error('Obsolete failure'));
    });
    expect(workspace.isLoading).toBe(true);
    expect(Toast.error).not.toHaveBeenCalled();
    await act(async () => currentRequest.resolve(ROLLUPS));
    expect(workspace.isLoading).toBe(false);
    expect(workspace.metadata).toBe(ROLLUPS);
});

it('marks its board list entry unsaved while the board reports edits (F-171)', () => {
    const info = createTazBoardSnapshot({
        id: 'board-dirty', name: 'dirty.taz', type: 'taz', path: '/', code: '', savedCode: false, panels: [],
        boardTimeRange: { start: '', end: '' },
        boardNumericRange: { start: '', end: '' },
    });
    let boards: GBoardListType[] = [];
    function BoardList() {
        boards = useRecoilValue(gBoardList);
        return null;
    }
    render(
        <RecoilRoot initializeState={({ set }) => set(gBoardList, [info as unknown as GBoardListType])}>
            <Workspace isActive={false} info={info} />
            <BoardList />
        </RecoilRoot>,
    );
    const props = jest.mocked(Board).mock.calls.at(-1)?.[0];
    expect(isBoardSaved(boards[0])).toBe(true);

    act(() => props?.onUnsavedChangesChange?.(true));
    expect(isBoardSaved(boards[0])).toBe(false);
    act(() => props?.onUnsavedChangesChange?.(false));
    expect(isBoardSaved(boards[0])).toBe(true);
});
