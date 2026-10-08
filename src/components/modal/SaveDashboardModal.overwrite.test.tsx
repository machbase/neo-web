// The dashboard panel "Save" (to .tql) judged "already exists" from the `?filter=*.tql` listing (server filter is
// case-sensitive) and asked with window.confirm. With extensions compared case-insensitively `X.TQL` is valid,
// but an existing `X.TQL` never shows in the filtered list → overwritten without a question (issue-1544 r10).

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { RecoilRoot, useRecoilValue } from 'recoil';
import { SaveDashboardModal } from './SaveDashboardModal';
import { gBoardList } from '@/recoil/recoil';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
    postFileList: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
    deleteFile: jest.fn(),
}));
jest.mock('@/api/repository/machiot', () => ({ fetchBlockTimeMinMax: jest.fn() }));
jest.mock('@/utils/DashboardQueryParser', () => ({
    DashboardQueryParser: jest.fn(() => [[{ sql: 'SELECT 1' }], [], '']),
    SqlResDataType: jest.fn(() => 'TIME_VALUE'),
}));
jest.mock('@/utils/DashboardChartOptionParser', () => ({ DashboardChartOptionParser: jest.fn(() => ({})) }));
jest.mock('@/utils/DashboardChartCodeParser', () => ({ DashboardChartCodeParser: jest.fn(() => '') }));
jest.mock('@/utils/eChartHelper', () => ({ chartTypeConverter: jest.fn(() => 'line') }));

const PANEL = { title: 'X', w: 10, h: 10, type: 'Line', blockList: [{}], transformBlockList: [], xAxisOptions: [], yAxisOptions: [], chartOptions: {}, theme: 'dark', isAxisInterval: false, plg: '', useCustomTime: false };

const renderSave = () =>
    render(
        <RecoilRoot>
            <SaveDashboardModal setIsOpen={jest.fn()} pPanelInfo={PANEL} pDashboardTime={{ start: '1000', end: '2000' }} />
        </RecoilRoot>
    );

const typeAndSave = async (aName: string) => {
    fireEvent.change(await screen.findByDisplayValue('X.tql'), { target: { value: aName } });
    await act(async () => {
        fireEvent.click(screen.getByText('OK'));
    });
};

describe('SaveDashboardModal — shared overwrite check', () => {
    let sConfirmSpy: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        (getFileList as jest.Mock).mockResolvedValue({ success: true, data: { children: [] } });
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'X.TQL', isDir: false }] } });
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        sConfirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    });
    afterEach(() => sConfirmSpy.mockRestore());

    it('asks (ConfirmModal) for an existing X.TQL missing from the filtered list; cancel → 0 POST', async () => {
        renderSave();
        await typeAndSave('X.TQL');

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(getFiles).toHaveBeenCalledWith('/');
        expect(postFileList).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull());
        expect(postFileList).not.toHaveBeenCalled();
        expect(sConfirmSpy).not.toHaveBeenCalled();
    });

    it('POSTs once after OK', async () => {
        renderSave();
        await typeAndSave('X.TQL');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][2]).toBe('X.TQL');
    });

    it('a case-only different name (x.tql) asks too, naming the existing X.TQL (r12)', async () => {
        renderSave();
        await typeAndSave('x.tql');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'X.TQL' already exists.");
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('A.TQL enables the save button (the caller goes through validateName)', async () => {
        renderSave();
        fireEvent.change(await screen.findByDisplayValue('X.tql'), { target: { value: 'A.TQL' } });
        expect(screen.getByText('OK').closest('button')).not.toBeDisabled();
        fireEvent.change(screen.getByDisplayValue('A.TQL'), { target: { value: 'A.SQL' } });
        expect(screen.getByText('OK').closest('button')).toBeDisabled();
    });

    it('a failed lookup saves nothing and shows the reason inside the dialog (r13)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'lookup failed' } });
        renderSave();
        await typeAndSave('fresh.tql');
        expect(await screen.findByTestId('save-dashboard-error')).toHaveTextContent('lookup failed');
        expect(postFileList).not.toHaveBeenCalled();
    });

    it('r20 M1: x.tql typed over X.TQL → POST uses the TYPED x.tql; the tab open on X.TQL (confirmed) gets the new content and the typed name', async () => {
        const sOnFile = { id: 'a', name: 'X.TQL', path: '/', type: 'tql', code: 'old', savedCode: 'old' };
        const sCurrentDash = { id: 'd', name: 'board.dsh', path: '/', type: 'dsh', code: '' };
        let sBoards: any[] = [];
        const Spy = () => {
            sBoards = useRecoilValue(gBoardList) as any[];
            return null;
        };
        render(
            <RecoilRoot initializeState={({ set }) => set(gBoardList, [sCurrentDash, sOnFile] as any)}>
                <SaveDashboardModal setIsOpen={jest.fn()} pPanelInfo={PANEL} pDashboardTime={{ start: '1000', end: '2000' }} />
                <Spy />
            </RecoilRoot>
        );
        await typeAndSave('x.tql');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect((postFileList as jest.Mock).mock.calls[0][2]).toBe('x.tql');
        const sPosted = (postFileList as jest.Mock).mock.calls[0][0];
        // .tql export: the tab on the target file is updated (not closed), the dashboard tab untouched
        await waitFor(() => expect(sBoards.find((aB) => aB.id === 'a')).toMatchObject({ name: 'x.tql', code: sPosted, savedCode: sPosted }));
        expect(sBoards.map((aB) => aB.id)).toEqual(['d', 'a']);
        expect(sBoards.find((aB) => aB.id === 'd')).toEqual(sCurrentDash);
    });

    it('after an overwrite only the tab of the same name AND path is updated', async () => {
        const sSame = { id: 'a', name: 'X.TQL', path: '/', type: 'tql', code: 'old' };
        const sOther = { id: 'b', name: 'X.TQL', path: '/other/', type: 'tql', code: 'other' };
        let sBoards: any[] = [];
        const Spy = () => {
            sBoards = useRecoilValue(gBoardList) as any[];
            return null;
        };
        render(
            <RecoilRoot initializeState={({ set }) => set(gBoardList, [sSame, sOther] as any)}>
                <SaveDashboardModal setIsOpen={jest.fn()} pPanelInfo={PANEL} pDashboardTime={{ start: '1000', end: '2000' }} />
                <Spy />
            </RecoilRoot>
        );
        await typeAndSave('X.TQL');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(sBoards.find((aB) => aB.id === 'a').code).not.toBe('old'));
        expect(sBoards.find((aB) => aB.id === 'b')).toMatchObject({ code: 'other', path: '/other/' });
    });

    it('a new name saves straight away', async () => {
        renderSave();
        await typeAndSave('fresh.tql');
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(1));
        expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull();
    });
});

/** The server's listing, its `?filter=*.<ext>` applied the way the server does it: case-sensitive, folders kept (measured). */
const serverListing = (aChildren: any[]) => (aFilter: string) => {
    const sExt = /^\?filter=\*\.(.+)$/.exec(aFilter ?? '')?.[1];
    const sChildren = sExt ? aChildren.filter((aC) => aC.isDir || aC.name.endsWith('.' + sExt)) : aChildren;
    return Promise.resolve({ success: true, data: { isDir: true, children: sChildren } });
};
const listRequestFilters = () => (getFileList as jest.Mock).mock.calls.map((aCall) => aCall[0]);

// r19: the .tql list now comes unfiltered from the server and is narrowed client-side without case.
describe('SaveDashboardModal — type list (r19)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lists X.TQL (case variant) with a.tql and folders; no ?filter= on the list request', async () => {
        (getFileList as jest.Mock).mockImplementation(
            serverListing([
                { name: 'sub', isDir: true, type: 'dir' },
                { name: 'X.TQL', isDir: false, type: '.TQL' },
                { name: 'a.tql', isDir: false, type: '.tql' },
                { name: 'q.sql', isDir: false, type: '.sql' },
            ])
        );
        renderSave();
        expect(await screen.findByText('X.TQL')).toBeInTheDocument();
        expect(screen.getByText('a.tql')).toBeInTheDocument();
        expect(screen.getByText('sub')).toBeInTheDocument();
        expect(screen.queryByText('q.sql')).toBeNull();
        expect(listRequestFilters().length).toBeGreaterThan(0);
        expect(listRequestFilters().every((aF) => !String(aF).includes('?filter='))).toBe(true);
    });
});
