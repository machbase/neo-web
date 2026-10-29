// Save as judged "already exists" from the dialog's cached, extension-filtered listing and used
// window.confirm. It missed files the filter hides or that appeared meanwhile, and after an
// overwrite its tab filter (`name !== x && path !== y`) dropped unrelated tabs (issue-1544).

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { RecoilRoot, useRecoilState } from 'recoil';
import { SaveModal } from './SaveModal';
import { getFiles } from '@/api/repository/fileTree';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { useAbortController } from '@/hooks/useAbortController';
import { queueFileWrite, UncertainFileWriteError, cancelAllPendingFileWrites } from '@/api/repository/fileWriteQueue';

jest.mock('@/api/core', () => {
    const transport = jest.fn(), listing = jest.fn();
    return { __esModule: true, transport, listing, default: (config: any) => {
        if (config.method === 'GET') return listing(config.url.includes('?') ? config.url.slice(config.url.indexOf('?')) : '', config.url.split('?')[0], '');
        const path = decodeURIComponent(config.url.replace('/api/files', ''));
        const separator = path.lastIndexOf('/');
        return transport(config.data, path.slice(0, separator + 1), path.slice(separator + 1));
    }};
});
const postFileList = jest.requireMock('@/api/core').transport as jest.Mock;
const getFileList = jest.requireMock('@/api/core').listing as jest.Mock;
jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
    deleteFile: jest.fn(),
}));
jest.mock('@/utils/UpdateTree', () => ({
    TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })),
}));
jest.mock('@/utils/recentFiles', () => ({
    recordRecentFile: jest.fn(),
}));


let sLatestBoards: any[] = [];
let updateBoards: (updater: any) => void;
let selectTab: (id: string) => void;
let latestSelectedTab: string;
const BoardSpy = () => {
    const [boards, setBoards] = useRecoilState(gBoardList);
    sLatestBoards = boards;
    updateBoards = setBoards;
    const [selected, setSelected] = useRecoilState(gSelectedTab);
    latestSelectedTab = selected;
    selectTab = setSelected;
    return null;
};

/** `aVisible`: what the dialog listed when it opened; `aServerTruth`: the folder at save time (re-queried). Since r19 the
 *  list request carries no filter, so `aVisible` only stands for a server-side `?filter=` call (none expected). */
const mockListing = (aVisible: any[], aServerTruth: any[]) => {
    (getFileList as jest.Mock).mockImplementation((aFilter: string) =>
        Promise.resolve({ success: true, data: { isDir: true, children: aFilter ? aVisible : aServerTruth } })
    );
    // the shared overwrite check re-queries without a filter through fileTree.getFiles
    (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: aServerTruth } });
};

const renderSave = (aBoards: any[], aSelected: string) => {
    render(
        <RecoilRoot
            initializeState={({ set }) => {
                set(gBoardList, aBoards as any);
                set(gSelectedTab, aSelected);
            }}
        >
            <SaveModal setIsOpen={jest.fn()} pIsSave={true} />
            <BoardSpy />
        </RecoilRoot>
    );
};

const typeName = (aFrom: string, aTo: string) => fireEvent.change(screen.getByDisplayValue(aFrom), { target: { value: aTo } });

const clickApply = async () => {
    await act(async () => {
        fireEvent.click(screen.getByText('Apply'));
    });
};

const SQL_TAB = { id: 't1', type: 'sql', name: 'q.sql', path: '/', code: 'SELECT 1', savedCode: '', sheet: [], panels: [], range_bgn: '', range_end: '' };

it.each(['sql', 'wrk'].flatMap(type => ['unchanged', 'closed', 'renamed', 'superseded', 'superseded-only', 'ended-lifetime', 'released-dialog'].map(change => [type, change])))
('keeps a %s destination attached while its later Save waits and its source is %s', async (type, change) => {
    jest.clearAllMocks();
    const source = { ...SQL_TAB, type, name: `q.${type}`, sheet: [{ id: 'source', contents: 'SOURCE' }] };
    const destination = { ...SQL_TAB, id: 'destination', type, name: `b.${type}`, code: 'DESTINATION',
        savedCode: type === 'wrk' ? JSON.stringify([{ id: 'destination', contents: 'DESTINATION' }]) : 'DESTINATION',
        sheet: [{ id: 'destination', contents: 'DESTINATION' }] };
    mockListing([], [{ name: destination.name, type: `.${type}` }]);
    let finish!: (result: any) => void;
    (postFileList as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    let requests!: ReturnType<typeof useAbortController>;
    const SharedSave = () => {
        requests = useAbortController();
        return <SaveModal pIsSave setIsOpen={jest.fn()} saveRequests={requests} />;
    };
    render(<RecoilRoot initializeState={({ set }) => {
        set(gBoardList, [source, destination] as any); set(gSelectedTab, source.id);
    }}><SharedSave /><BoardSpy /></RecoilRoot>);
    await screen.findByDisplayValue(source.name);
    typeName(source.name, destination.name); await clickApply();
    await act(async () => fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm')));
    await waitFor(() => expect(finish).toBeDefined());
    let finishDestination!: () => void;
    const pendingDestination = change === 'released-dialog'
        ? queueFileWrite('/' + destination.name, () => new Promise(resolve => { finishDestination = () => resolve({ success: true }); }))
        : undefined;
    // The destination's ordinary Save is queued behind this Save As. It may
    // later succeed OR fail; until then the file contains the source snapshot.
    const currentSource = change === 'renamed' ? { ...source, name: `renamed.${type}` } : source;
    act(() => {
        if (change !== 'superseded-only') requests.createSignal(destination.id);
        selectTab(destination.id);
        updateBoards(change === 'closed' ? [destination] : [currentSource, destination]);
        if (change.startsWith('superseded')) requests.createSignal(source.id);
        if (change === 'ended-lifetime') requests.abort();
        if (change === 'released-dialog') {
            const dialog = requests.createSignal(destination.id);
            requests.releaseSignal(dialog, destination.id);
            expect(requests.hasPendingRequest(destination.id)).toBe(false);
        }
    });
    await act(async () => finish({ success: true }));
    if (pendingDestination) { finishDestination(); await pendingDestination; }
    expect(sLatestBoards).toEqual([...(change === 'closed' ? [] : [currentSource]), { ...destination,
        savedCode: type === 'wrk' ? JSON.stringify(source.sheet) : source.code,
    }]);
    expect(latestSelectedTab).toBe(destination.id);
});

describe('SaveModal — overwrite check', () => {
    let sConfirmSpy: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        sConfirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    });
    afterEach(() => sConfirmSpy.mockRestore());

    it('asks even for Save As onto the tab\'s own file (no original-location exception, r12)', async () => {
        mockListing([{ name: 'q.sql', type: '.sql' }], [{ name: 'q.sql', type: '.sql' }]);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'q.sql' already exists.");
        expect(postFileList).not.toHaveBeenCalled();
        expect(sConfirmSpy).not.toHaveBeenCalled();
    });

    it('own-file Save As: after OK it saves once and keeps the tab being saved', async () => {
        mockListing([{ name: 'q.sql', type: '.sql' }], [{ name: 'q.sql', type: '.sql' }]);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        await clickApply();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(sLatestBoards.map((aB) => aB.id)).toEqual(['t1']));
        expect(sLatestBoards[0]).toMatchObject({ name: 'q.sql', path: '/', savedCode: 'SELECT 1' });
    });

    it('asks for a case-only different name, naming the existing file', async () => {
        mockListing([], [{ name: 'Dup.sql', type: '.sql' }]);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'dup.SQL');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'Dup.sql' already exists.");
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('A.SQL enables the save button (the caller goes through validateName)', async () => {
        mockListing([], []);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'A.SQL');
        expect(screen.getByText('Apply').closest('button')).not.toBeDisabled();
        typeName('A.SQL', 'A.TQL');
        expect(screen.getByText('Apply').closest('button')).toBeDisabled();
    });

    it('a failed lookup saves nothing and shows the reason inside the dialog (r13)', async () => {
        mockListing([], []);
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'lookup failed' } });
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'fresh.sql');
        await clickApply();
        expect(await screen.findByTestId('save-modal-error')).toHaveTextContent('lookup failed');
        expect(postFileList).not.toHaveBeenCalled();
        expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull();
    });

    it('a same-name folder blocks inside the dialog (r13)', async () => {
        mockListing([], [{ name: 'Dup.sql', type: 'dir', isDir: true }]);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'dup.sql');
        await clickApply();
        expect(await screen.findByTestId('save-modal-error')).toHaveTextContent("A folder named 'Dup.sql' already exists.");
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('r20 M1: A.sql typed, a.sql there → asked about a.sql; POST, tab and Recent use the TYPED A.sql; the other tab on a.sql (confirmed) closes', async () => {
        const { recordRecentFile } = jest.requireMock('@/utils/recentFiles');
        const { TreeFetchDrilling } = jest.requireMock('@/utils/UpdateTree');
        const sOtherOnFile = { ...SQL_TAB, id: 't9', name: 'a.sql', path: '/' };
        mockListing([], [{ name: 'a.sql', type: '.sql' }]);
        renderSave([SQL_TAB, sOtherOnFile], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'A.sql');
        await clickApply();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'a.sql' already exists.");
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][2]).toBe('A.sql');
        expect(recordRecentFile).toHaveBeenCalledWith({ name: 'A.sql', path: '/' });
        expect(TreeFetchDrilling).toHaveBeenCalledWith(expect.anything(), '/A.sql', true);
        await waitFor(() => expect(sLatestBoards.map((aB) => aB.id)).toEqual(['t1']));
        expect(sLatestBoards[0]).toMatchObject({ name: 'A.sql', path: '/' });
    });

    it('confirmed dsh overwrite shares the general post-processing: savedCode = JSON.stringify(dashboard) (r13)', async () => {
        const sDash = { panels: [{ id: 'p' }], timeRange: { start: 'now-1h', end: 'now' } };
        const sDshTab = { ...SQL_TAB, id: 'd1', type: 'dsh', name: 'b.dsh', path: '/', code: '', dashboard: sDash };
        mockListing([{ name: 'b.dsh', type: '.dsh' }], [{ name: 'b.dsh', type: '.dsh' }]);
        renderSave([sDshTab], 'd1');
        await screen.findByDisplayValue('b.dsh');
        await clickApply();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(sLatestBoards[0].savedCode).toBe(JSON.stringify(sDash)));
    });

    it('taz branch saves under the TYPED name too (r20 M1) and keeps the tab', async () => {
        const sTazTab = { ...SQL_TAB, id: 'z1', type: 'taz', name: 'mine.taz', path: '/' };
        mockListing([], [{ name: 'other.taz', type: '.taz' }]);

        renderSave([sTazTab], 'z1');
        await screen.findByDisplayValue('mine.taz');
        typeName('mine.taz', 'OTHER.taz');
        await clickApply();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect(postFileList.mock.calls[0].slice(1)).toEqual(['/', 'OTHER.taz']);
        await waitFor(() => expect(sLatestBoards.map((aB) => [aB.id, aB.name])).toEqual([['z1', 'OTHER.taz']]));
    });

    it('asks (ConfirmModal) for a same-named file the filtered cache does not show', async () => {
        mockListing([], [{ name: 'dup.sql', type: '.sql' }]);
        renderSave([SQL_TAB], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'dup.sql');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(postFileList).not.toHaveBeenCalled();
        expect(sConfirmSpy).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull());
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('asks for the taz branch too and saves only after OK', async () => {
        const sTazTab = { ...SQL_TAB, id: 'z1', type: 'taz', name: 'mine.taz', path: '/a/' };
        mockListing([], [{ name: 'other.taz', type: '.taz' }]);
        jest.mocked(getFiles).mockImplementation(async path => ({success:true,data:{isDir:true,children:path==='/'
            ?[{name:'a',isDir:true}]:[{name:'other.taz',type:'.taz'}]}} as any));

        renderSave([sTazTab], 'z1');
        await screen.findByDisplayValue('mine.taz');
        typeName('mine.taz', 'other.taz');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(postFileList).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect(sConfirmSpy).not.toHaveBeenCalled();
    });

    it('keeps unrelated tabs that share only the name or only the path after an overwrite', async () => {
        const sSameNameOtherPath = { ...SQL_TAB, id: 't2', name: 'dup.sql', path: '/other/' };
        const sSamePathOtherName = { ...SQL_TAB, id: 't3', name: 'zzz.sql', path: '/' };
        const sReplaced = { ...SQL_TAB, id: 't4', name: 'dup.sql', path: '/' };
        mockListing([{ name: 'dup.sql', type: '.sql' }], [{ name: 'dup.sql', type: '.sql' }]);
        renderSave([SQL_TAB, sSameNameOtherPath, sSamePathOtherName, sReplaced], 't1');
        await screen.findByDisplayValue('q.sql');
        typeName('q.sql', 'dup.sql');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(sLatestBoards.map((aB) => aB.id).sort()).toEqual(['t1', 't2', 't3']));
        expect(sLatestBoards.find((aB) => aB.id === 't1')).toMatchObject({ name: 'dup.sql', path: '/' });
    });
});

/** The server's listing, its `?filter=*.<ext>` applied the way the server does it: case-sensitive, folders kept (measured). */
const serverListing = (aChildren: any[]) => (aFilter: string) => {
    const sExt = /^\?filter=\*\.(.+)$/.exec(aFilter ?? '')?.[1];
    const sChildren = sExt ? aChildren.filter((aC) => aC.isDir || aC.name.endsWith('.' + sExt)) : aChildren;
    return Promise.resolve({ success: true, data: { isDir: true, children: sChildren } });
};
const listRequestFilters = () => (getFileList as jest.Mock).mock.calls.map((aCall) => aCall[0]);

// r19: the type list was fetched with the server `?filter=*.sql`, which is case-sensitive, so a non-hidden
// `X.SQL` was invisible in Save As and only surfaced as the overwrite question.
describe('SaveModal — type list (r19)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lists X.SQL (case variant) with a.sql and folders; no ?filter= on the list request; other types stay out', async () => {
        (getFileList as jest.Mock).mockImplementation(
            serverListing([
                { name: 'sub', isDir: true, type: 'dir' },
                { name: 'X.SQL', isDir: false, type: '.SQL' },
                { name: 'a.sql', isDir: false, type: '.sql' },
                { name: 'b.tql', isDir: false, type: '.tql' },
            ])
        );
        renderSave([SQL_TAB], 't1');
        expect(await screen.findByText('X.SQL')).toBeInTheDocument();
        expect(screen.getByText('a.sql')).toBeInTheDocument();
        expect(screen.getByText('sub')).toBeInTheDocument();
        expect(screen.queryByText('b.tql')).toBeNull();
        expect(listRequestFilters().length).toBeGreaterThan(0);
        expect(listRequestFilters().every((aF) => !String(aF).includes('?filter='))).toBe(true);
    });
});


it('Save As applies its submitted snapshot to the current tabs and keeps later source edits', async () => {
    mockListing([], []);
    let resolveSave!: (result: any) => void;
    (postFileList as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderSave([SQL_TAB], SQL_TAB.id);
    await screen.findByDisplayValue('q.sql');
    typeName('q.sql', 'new.sql');
    await clickApply();
    await waitFor(() => expect(resolveSave).toBeDefined());
    const draft = { ...SQL_TAB, id: 'draft', path: '', name: 'SQL', code: 'NEW TAB DRAFT', savedCode: '' };
    act(() => updateBoards((boards: any[]) => [...boards.map((board) => ({ ...board, code: 'LATER SOURCE EDIT' })), draft]));
    await act(async () => resolveSave({ success: true }));
    await waitFor(() => expect(sLatestBoards[0].name).toBe('new.sql'));
    expect(sLatestBoards.map((board) => board.id)).toEqual([SQL_TAB.id, 'draft']);
    expect(sLatestBoards[0]).toMatchObject({ code: 'LATER SOURCE EDIT', savedCode: SQL_TAB.code, path: '/' });
    expect(sLatestBoards[1]).toEqual(draft);
});

it.each(['closed', 'renamed'])('Save As does not restore or rename a source tab that was %s while waiting', async (change) => {
    mockListing([], []);
    let resolveSave!: (result: any) => void;
    (postFileList as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderSave([SQL_TAB], SQL_TAB.id);
    await screen.findByDisplayValue('q.sql');
    typeName('q.sql', 'new.sql');
    await clickApply();
    await waitFor(() => expect(resolveSave).toBeDefined());
    const current = change === 'closed' ? [] : [{ ...SQL_TAB, name: 'renamed.sql', code: 'LATER EDIT' }];
    act(() => updateBoards(current));
    await act(async () => resolveSave({ success: true }));
    expect(sLatestBoards).toEqual(current);
});

it('Save As keeps the opening worksheet when another file type becomes selected', async () => {
    jest.clearAllMocks();
    mockListing([], []);
    (postFileList as jest.Mock).mockResolvedValue({ success: true });
    const source = { ...SQL_TAB, type: 'wrk', name: 'a.wrk', code: '', sheet: [{ id: 'a', contents: 'WORKSHEET A' }] };
    const other = { ...SQL_TAB, id: 'other', name: 'b.sql', code: 'SELECT B' };
    renderSave([source, other], source.id);
    await screen.findByDisplayValue('a.wrk');
    act(() => selectTab(other.id));
    typeName('a.wrk', 'copy.wrk');
    await clickApply();
    await waitFor(() => expect(postFileList).toHaveBeenCalledWith({ data: source.sheet }, '/', 'copy.wrk'));
    expect(sLatestBoards).toEqual([{ ...source, name: 'copy.wrk', savedCode: JSON.stringify(source.sheet) }, other]);
    expect(latestSelectedTab).toBe(other.id);
});

it('selects the saving tab if a confirmed overwrite closes the active destination tab', async () => {
    jest.clearAllMocks();
    mockListing([], [{ name: 'b.sql', type: '.sql' }]);
    (postFileList as jest.Mock).mockResolvedValue({ success: true });
    const other = { ...SQL_TAB, id: 'other', name: 'b.sql', code: 'SELECT B' };
    renderSave([SQL_TAB, other], SQL_TAB.id);
    await screen.findByDisplayValue('q.sql');
    act(() => selectTab(other.id));
    typeName('q.sql', 'b.sql'); await clickApply();
    const dialog = await screen.findByTestId('file-overwrite-dialog');
    await act(async () => fireEvent.click(within(dialog).getByTestId('confirm')));
    await waitFor(() => expect(sLatestBoards.map(board => board.id)).toEqual([SQL_TAB.id]));
    expect(latestSelectedTab).toBe(SQL_TAB.id);
});

it.each(['closed', 'renamed'])('Save As refuses to save an opening tab that was %s before Apply', async change => {
    jest.clearAllMocks();
    mockListing([], []);
    (postFileList as jest.Mock).mockResolvedValue({ success: true });
    const other = { ...SQL_TAB, id: 'other', name: 'b.sql', code: 'SELECT B' };
    renderSave([SQL_TAB, other], SQL_TAB.id);
    await screen.findByDisplayValue('q.sql');
    const current = change === 'closed' ? [other] : [{ ...SQL_TAB, name: 'renamed.sql' }, other];
    act(() => { updateBoards(current); selectTab(other.id); });
    typeName('q.sql', 'copy.sql');
    await clickApply();
    expect(postFileList).not.toHaveBeenCalled();
    expect(screen.getByTestId('save-modal-error')).toHaveTextContent('The source tab was closed or changed');
    expect(sLatestBoards).toEqual(current);
});


it.each(['later-edit', 'new-tab'])('preserves a destination %s after overwrite approval as an unsaved draft', async change => {
    jest.clearAllMocks(); mockListing([], [{ name: 'b.sql', type: '.sql' }]);
    let finish!: (value: any) => void;
    (postFileList as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const other = { ...SQL_TAB, id: 'other', name: 'b.sql', code: 'APPROVED B' };
    renderSave(change === 'later-edit' ? [SQL_TAB, other] : [SQL_TAB], SQL_TAB.id);
    await screen.findByDisplayValue('q.sql'); typeName('q.sql', 'b.sql'); await clickApply();
    await act(async () => fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm')));
    await waitFor(() => expect(finish).toBeDefined());
    const draft = { ...other, code: 'B AFTER CONFIRM' };
    act(() => { updateBoards([SQL_TAB, draft]); selectTab(other.id); });
    await act(async () => finish({ success: true }));
    expect(sLatestBoards).toEqual([{ ...SQL_TAB, name: 'b.sql', savedCode: SQL_TAB.code }, { ...draft, path: '', savedCode: false }]);
    expect(latestSelectedTab).toBe(other.id);
});

describe('Save As preflight still belongs to its open source', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        mockListing([], []);
    });
    it.each(['cancel', 'close-source', 'rename-source', 'change-type'])('does not POST after %s during its target lookup', async action => {
        let finish!: (value: unknown) => void;
        (getFiles as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        renderSave([SQL_TAB], SQL_TAB.id);
        await screen.findByDisplayValue('q.sql'); typeName('q.sql', 'copy.sql');
        await clickApply(); await waitFor(() => expect(getFiles).toHaveBeenCalledTimes(1));
        await act(async () => {
            if (action === 'cancel') fireEvent.click(within(screen.getByTestId('file-save-dialog')).getByRole('button', { name: /^Cancel$/ }));
            else if (action === 'close-source') updateBoards([]);
            else updateBoards((boards: any[]) => boards.map(board => ({ ...board, ...(action === 'rename-source' ? { name: 'renamed.sql' } : { type: 'tql' }) })));
        });
        await act(async () => { finish({ success: true, data: { isDir: true, children: [] } }); });
        expect(postFileList).not.toHaveBeenCalled();
        if (action !== 'cancel') await screen.findByText('The source tab was closed or changed. Please reopen Save As.');
    });
});

it('a second Apply during preflight cannot supersede the first save attempt', async () => {
    jest.clearAllMocks(); mockListing([], []);
    (postFileList as jest.Mock).mockResolvedValue({ success: true });
    let finish!: (value: unknown) => void;
    (getFiles as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    renderSave([SQL_TAB], SQL_TAB.id); await screen.findByDisplayValue('q.sql'); typeName('q.sql', 'copy.sql');
    await clickApply(); await clickApply();
    expect(getFiles).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ success: true, data: { isDir: true, children: [] } }); });
    await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
});


it('own-file Save As with a lost response invalidates only that file and keeps all drafts', async () => {
    jest.clearAllMocks();
    const source = {...SQL_TAB, savedCode: SQL_TAB.code};
    const neighbour = {...source, id:'case-neighbour', name:'Q.SQL'};
    mockListing([{name: source.name, type: '.sql'}], [{name: source.name, type: '.sql'}]);
    // This neighbour represents a distinct case-sensitive file, whose exact
    // entry and body must exist in the mocked server as they do on Neo.
    jest.mocked(getFiles).mockResolvedValue({success:true,data:{isDir:true,children:[{name:'q.sql'},{name:'Q.SQL'}]}} as any);
    (postFileList as jest.Mock).mockRejectedValueOnce(new UncertainFileWriteError(new Error('response lost')));
    renderSave([source, neighbour], source.id);
    await screen.findByDisplayValue(source.name); await clickApply();
    await act(async () => fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm')));
    await waitFor(() => expect(sLatestBoards[0].savedCode).toBe(false));
    expect(sLatestBoards).toEqual([{...source, savedCode: false}, neighbour]);
    expect(screen.getByTestId('file-save-dialog')).toBeInTheDocument();
});

it.each(['cancel','close-source'])('extra alias preflight after %s must not POST', async action => {
    jest.clearAllMocks();
    jest.requireActual('@/utils/fileIdentity').forgetFileIdentities();
    (postFileList as jest.Mock).mockResolvedValue({success:true});
    const source={...SQL_TAB,path:'/Reports/'};
    const peer={...SQL_TAB,id:'peer',path:'/REPORTS/',name:'b.sql',code:'OLD',savedCode:'OLD'};
    (getFileList as jest.Mock).mockResolvedValue({success:true,data:{isDir:true,children:[{name:'b.sql',type:'.sql'}]}});
    let releaseAlias!:()=>void;
    (getFiles as jest.Mock).mockImplementation(async path=>{
        if(path==='/REPORTS/') return new Promise(resolve=>{releaseAlias=()=>resolve({success:true,data:{isDir:true,children:[{name:'b.sql',type:'.sql'}]}});});
        return {success:true,data:{isDir:true,children:path==='/'?[{name:'Reports',type:'dir',isDir:true}]:[{name:'b.sql',type:'.sql'}]}};
    });
    const SharedSave=()=>{const requests=useAbortController();return <SaveModal pIsSave setIsOpen={jest.fn()} saveRequests={requests}/>;};
    render(<RecoilRoot initializeState={({set})=>{set(gBoardList,[source,peer] as any);set(gSelectedTab,source.id);}}><SharedSave/><BoardSpy/></RecoilRoot>);
    await screen.findByDisplayValue(source.name);typeName(source.name,'b.sql');await clickApply();
    await act(async()=>fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm')));
    await waitFor(()=>expect(releaseAlias).toBeDefined());
    await act(async()=>{
        if(action==='cancel') fireEvent.click(within(screen.getByTestId('file-save-dialog')).getByRole('button',{name:/^Cancel$/}));
        else updateBoards([peer]);
    });
    await act(async()=>releaseAlias());
    expect(postFileList).not.toHaveBeenCalled();
});


it.each(['wrk', 'dsh'].flatMap(type => ['cancel', 'logout'].map(action => [type, action])))
('a late %s Save As lookup after %s cannot replace current directory identity', async (type, action) => {
    jest.clearAllMocks();
    cancelAllPendingFileWrites();
    const {rememberDirectoryIdentity, getFileMutationRelation} = jest.requireActual('@/utils/fileIdentity');
    const source = {...SQL_TAB, type, name: 'a.' + type, path: '/TARGET/',
        sheet: [{id:'cell', contents:'KEEP WRK DRAFT', type:'mrk', height:200}],
        dashboard: {title:'KEEP DSH DRAFT', panels:[], variables:[], timeRange:{start:'now-1h',end:'now'}, distanceRange:{start:'',end:''}}};
    (getFileList as jest.Mock).mockResolvedValue({data:{isDir:true,children:[]}});
    let release!: () => void;
    jest.mocked(getFiles).mockImplementation(async path => {
        if (path === '/') return new Promise(resolve => {release = () => resolve({data:{isDir:true,children:[{name:'target',isDir:true}]}} as any);});
        return {data:{isDir:true,children:[]}} as any;
    });
    renderSave([source], source.id);
    await screen.findByDisplayValue(source.name); typeName(source.name, 'pending.' + type); await clickApply();
    await waitFor(() => expect(release).toBeDefined());
    const next = {...SQL_TAB, id:'new-login', code:'NEW LOGIN DRAFT', savedCode:''};
    await act(async () => {
        if (action === 'cancel') fireEvent.click(within(screen.getByTestId('file-save-dialog')).getByRole('button',{name:/^Cancel$/}));
        else {cancelAllPendingFileWrites(); updateBoards([next]); selectTab(next.id);}
        // A current lookup observed the folder's new actual spelling.
        rememberDirectoryIdentity('/target/', '/TARGET/');
        rememberDirectoryIdentity('/TARGET/', '/TARGET/');
    });
    expect(getFileMutationRelation('/TARGET/new.' + type, '/target')).toBe('same');
    await act(async () => release());
    expect(postFileList).not.toHaveBeenCalled();
    expect(getFileMutationRelation('/TARGET/new.' + type, '/target')).toBe('same');
    expect(sLatestBoards).toEqual(action === 'logout' ? [next] : [source]);
    cancelAllPendingFileWrites();
});
