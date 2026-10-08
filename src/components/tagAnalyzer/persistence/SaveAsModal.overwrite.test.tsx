// Save As judged "already exists" from the `?filter=*.taz` listing (server filter is case-sensitive) and asked
// with window.confirm. With extensions compared case-insensitively, `b.TAZ` is a valid name — but an existing
// `b.TAZ` never shows in the filtered list, so it was overwritten without a question (issue-1544 r10).

import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { SaveAsModal } from './SaveAsModal';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
    postFileList: jest.fn(),
}));
jest.mock('@/api/repository/fileTree', () => ({
    getFiles: jest.fn(),
}));

const renderSaveAs = (aOnSaveAs: jest.Mock) =>
    render(<SaveAsModal initialDirectoryPath="/d/" initialFileName="mine.taz" onClose={jest.fn()} onSaveAs={aOnSaveAs} />);

const typeAndSave = async (aName: string) => {
    fireEvent.change(await screen.findByDisplayValue('mine.taz'), { target: { value: aName } });
    await act(async () => {
        fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    });
};

describe('tagAnalyzer SaveAsModal — shared overwrite check', () => {
    let sConfirmSpy: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();
        // the dialog's filtered listing hides b.TAZ (server filter is case-sensitive)
        (getFileList as jest.Mock).mockResolvedValue({ success: true, data: { children: [] } });
        // the unfiltered re-query shows it
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [{ name: 'b.TAZ', isDir: false }] } });
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        sConfirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    });
    afterEach(() => sConfirmSpy.mockRestore());

    it('asks (ConfirmModal) for an existing b.TAZ missing from the filtered list; cancel saves nothing', async () => {
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        await typeAndSave('b.TAZ');

        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(getFiles).toHaveBeenCalledWith('/d/');
        expect(sOnSaveAs).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        await waitFor(() => expect(screen.queryByTestId('file-overwrite-dialog')).toBeNull());
        expect(sOnSaveAs).not.toHaveBeenCalled();
        expect(postFileList).not.toHaveBeenCalled();
        expect(sConfirmSpy).not.toHaveBeenCalled();
    });

    it('saves after OK', async () => {
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        await typeAndSave('b.TAZ');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(sOnSaveAs).toHaveBeenCalledWith('/d/', 'b.TAZ', true));
    });

    it('a case-only different name (B.taz) asks too, naming the existing b.TAZ (r12)', async () => {
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        await typeAndSave('B.taz');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'b.TAZ' already exists.");
        expect(sOnSaveAs).not.toHaveBeenCalled();
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('cancel'));
        });
        expect(sOnSaveAs).not.toHaveBeenCalled();
    });

    it('a second click while the re-query is pending does not start a second save (busy before the lookup)', async () => {
        let sResolveLookup: (v: any) => void = () => {};
        (getFiles as jest.Mock).mockImplementation(() => new Promise((r) => (sResolveLookup = r)));
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        fireEvent.change(await screen.findByDisplayValue('mine.taz'), { target: { value: 'fresh.taz' } });
        await act(async () => {
            fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
        });
        await act(async () => {
            fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
        });
        await act(async () => sResolveLookup({ success: true, data: { isDir: true, children: [] } }));
        await waitFor(() => expect(sOnSaveAs).toHaveBeenCalledTimes(1));
        expect(getFiles).toHaveBeenCalledTimes(1);
    });

    it('a failed lookup saves nothing and shows the reason inside the dialog (r13)', async () => {
        (getFiles as jest.Mock).mockResolvedValue({ status: 500, headers: {}, data: { success: false, reason: 'lookup failed' } });
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        await typeAndSave('fresh.taz');
        expect(await screen.findByTestId('tag-analyzer-save-as-error')).toHaveTextContent('lookup failed');
        expect(sOnSaveAs).not.toHaveBeenCalled();
    });

    it('r20 M1: B.taz typed over b.TAZ → asked about b.TAZ, onSaveAs receives the TYPED name B.taz', async () => {
        const sOnSaveAs = jest.fn().mockResolvedValue(true);
        renderSaveAs(sOnSaveAs);
        await typeAndSave('B.taz');
        const sDialog = await screen.findByTestId('file-overwrite-dialog');
        expect(sDialog).toHaveTextContent("A file named 'b.TAZ' already exists.");
        await act(async () => {
            fireEvent.click(within(sDialog).getByTestId('confirm'));
        });
        await waitFor(() => expect(sOnSaveAs).toHaveBeenCalledWith('/d/', 'B.taz', true));
        expect(sOnSaveAs).not.toHaveBeenCalledWith('/d/', 'b.TAZ', expect.anything());
    });
});

/** The server's listing, its `?filter=*.<ext>` applied the way the server does it: case-sensitive, folders kept (measured). */
const serverListing = (aChildren: any[]) => (aFilter: string) => {
    const sExt = /^\?filter=\*\.(.+)$/.exec(aFilter ?? '')?.[1];
    const sChildren = sExt ? aChildren.filter((aC) => aC.isDir || aC.name.endsWith('.' + sExt)) : aChildren;
    return Promise.resolve({ success: true, data: { isDir: true, children: sChildren } });
};
const listRequestFilters = () => (getFileList as jest.Mock).mock.calls.map((aCall) => aCall[0]);

// r19: the .taz list (tazFileApi.fetchTazFileList) now comes unfiltered and is narrowed client-side without case.
describe('tagAnalyzer SaveAsModal — type list (r19)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lists B.TAZ (case variant) with a.taz and folders; no ?filter= on the list request', async () => {
        (getFileList as jest.Mock).mockImplementation(
            serverListing([
                { name: 'sub', isDir: true, type: 'dir' },
                { name: 'B.TAZ', isDir: false, type: '.TAZ' },
                { name: 'a.taz', isDir: false, type: '.taz' },
                { name: 'q.sql', isDir: false, type: '.sql' },
            ])
        );
        renderSaveAs(jest.fn());
        expect(await screen.findByTestId(`tag-analyzer-save-as-item-${encodeURIComponent('B.TAZ')}`)).toBeInTheDocument();
        expect(screen.getByTestId('tag-analyzer-save-as-item-a.taz')).toBeInTheDocument();
        expect(screen.getByTestId('tag-analyzer-save-as-item-sub')).toBeInTheDocument();
        expect(screen.queryByTestId('tag-analyzer-save-as-item-q.sql')).toBeNull();
        expect(listRequestFilters().length).toBeGreaterThan(0);
        expect(listRequestFilters().every((aF) => !String(aF).includes('?filter='))).toBe(true);
    });
});
