import {act, fireEvent, render, screen} from '@testing-library/react';
import {RecoilRoot, useRecoilState} from 'recoil';
import {gBoardList, gSelectedTab} from '@/recoil/recoil';
import {loadBoardFromFile} from '@/components/side/FileExplorer/loadBoardFromFile';
import NewBoard from './index';

jest.mock('@/components/side/FileExplorer/loadBoardFromFile', () => ({loadBoardFromFile: jest.fn()}));
jest.mock('@/utils/recentFiles', () => ({useRecentFiles: () => [{name: 'recent.sql', path: '/', openedAt: 1}], recordRecentFile: jest.fn(), removeRecentFile: jest.fn()}));
jest.mock('./layout/useNewTabLayout', () => ({useNewTabLayout: () => ({nodes: [], save: jest.fn(), refresh: jest.fn()}), LAYOUT_TOAST_POSITION: 'bottom-right'}));
jest.mock('./groups/useNewTabGroups', () => ({useNewTabGroups: () => ({groups: [], isPartial: false, saveGroup: jest.fn(), deleteGroup: jest.fn()})}));
jest.mock('./widgetAccess', () => ({useStatzAccess: () => 'no', isWidgetAvailable: () => true}));
jest.mock('@/components/side/Shell/useOpenShellCreate', () => ({useOpenShellCreate: () => jest.fn()}));
jest.mock('./layout/LayoutBoard', () => ({LayoutBoard: ({pRenderWidget}: any) => pRenderWidget({type: 'recent', size: 4})}));

let latest: any[], setBoards: (value: any) => void;
const placeholder = {id: 'placeholder', type: 'new', name: 'New', path: '', code: '', savedCode: ''};
const source = {id: 'source', type: 'sql', name: 'source.sql', path: '/', code: 'FIRST STORED', savedCode: 'FIRST STORED'};
const keep = {id: 'keep', type: 'sql', name: 'SQL', path: '', code: 'KEEP DRAFT', savedCode: ''};
function App() {
    const [boards, set] = useRecoilState(gBoardList); latest = boards; setBoards = set;
    return boards.some(board => board.id === placeholder.id && board.type === 'new')
        ? <NewBoard pExtentionList={[]} setIsOpenModal={jest.fn()} pGetInfo={jest.fn()} /> : <span>another editor</span>;
}

// The browser keeps one actual Recent-entry workflow. Placeholder ownership,
// late errors and closing/type-changing the tab are component state transitions.
for (const action of ['active', 'edited', 'closed']) {
    it.each(['success', 'missing', 'transport'])(`Recent ${action} ignores stale %s completion without losing other tabs`, async outcome => {
        let release!: (value: any) => void;
        jest.mocked(loadBoardFromFile).mockImplementation(() => new Promise(resolve => {release = resolve;}));
        render(<RecoilRoot initializeState={({set}) => {set(gBoardList, [source, placeholder, keep] as any); set(gSelectedTab, placeholder.id);}}><App /></RecoilRoot>);
        fireEvent.click(screen.getByTestId('recent-%2Frecent.sql'));
        expect(loadBoardFromFile).toHaveBeenCalledWith({name: 'recent.sql', path: '/', openedAt: 1}, placeholder.id);
        const edited = {...placeholder, type: 'sql', code: 'NEW EDITED CONTENT'};
        if (action !== 'active') act(() => setBoards((boards: any[]) => [
            ...boards.filter(board => board.id !== placeholder.id), ...(action === 'edited' ? [edited] : []), {...keep, id: 'later-draft'},
        ]));
        const before = latest;
        const board = {...source, id: placeholder.id, name: 'recent.sql', code: 'CURRENT FILE', savedCode: 'CURRENT FILE'};
        await act(async () => release(outcome === 'success' ? {board} : {error: 'read failed', transport: outcome === 'transport'}));
        expect(latest.find(board => board.id === source.id)).toEqual(source);
        expect(latest.find(board => board.id === keep.id)).toEqual(keep);
        if (action === 'active' && outcome === 'success') expect(latest.find(item => item.id === placeholder.id)).toEqual(board);
        else expect(latest).toEqual(before);
    });
}
