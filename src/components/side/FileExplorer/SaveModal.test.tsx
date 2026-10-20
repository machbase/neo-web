// Save as judged "already exists" from the dialog's cached, extension-filtered listing and used
// window.confirm. It missed files the filter hides or that appeared meanwhile, and after an
// overwrite its tab filter (`name !== x && path !== y`) dropped unrelated tabs (issue-1544).

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { SaveModal } from './SaveModal';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';
import { saveTazBoard } from '@/components/tagAnalyzer/persistence/tazDocumentService';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';

jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
    postFileList: jest.fn(),
}));
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
jest.mock('@/components/tagAnalyzer/persistence/tazDocumentService', () => ({
    loadTazBoard: jest.fn(),
    saveTazBoard: jest.fn(),
}));

let sLatestBoards: any[] = [];
const BoardSpy = () => {
    sLatestBoards = useRecoilValue(gBoardList) as any[];
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
        (saveTazBoard as jest.Mock).mockImplementation((aB: any) => Promise.resolve({ ...aB }));
        renderSave([sTazTab], 'z1');
        await screen.findByDisplayValue('mine.taz');
        typeName('mine.taz', 'OTHER.taz');
        await clickApply();
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(saveTazBoard).toHaveBeenCalledTimes(1));
        expect((saveTazBoard as jest.Mock).mock.calls[0][0]).toMatchObject({ name: 'OTHER.taz', path: '/' });
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
        (saveTazBoard as jest.Mock).mockResolvedValue({ ...sTazTab, name: 'other.taz', path: '/a/' });
        renderSave([sTazTab], 'z1');
        await screen.findByDisplayValue('mine.taz');
        typeName('mine.taz', 'other.taz');
        await clickApply();

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(saveTazBoard).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(saveTazBoard).toHaveBeenCalledTimes(1));
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
