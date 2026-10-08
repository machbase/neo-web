// Every name entry point gives the same verdict for the same name (no caller-side lower-casing, endsWith or
// per-caller exceptions — issue-1544 r9). r20: each row renders the REAL caller component and observes what the user
// gets (POST made or not / save button enabled or not); the earlier table re-called validateName itself and could not
// catch a caller that stopped using it.

import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { FileModal } from '@/components/side/FileExplorer/FileModal';
import { FolderModal } from '@/components/side/FileExplorer/FolderModal';
import { SaveModal } from '@/components/side/FileExplorer/SaveModal';
import { UrlDownloadModal } from '@/components/modal/UrlDownloadModal';
import { SaveDashboardModal } from '@/components/modal/SaveDashboardModal';
import { SaveAsModal } from '@/components/tagAnalyzer/persistence/SaveAsModal';
import { gRecentDirectory } from '@/recoil/fileTree';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(), deleteFile: jest.fn() }));
jest.mock('@/utils/UpdateTree', () => ({ TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })) }));
jest.mock('@/utils/recentFiles', () => ({ recordRecentFile: jest.fn() }));
jest.mock('@/api/repository/machiot', () => ({ fetchBlockTimeMinMax: jest.fn() }));
jest.mock('@/utils/DashboardQueryParser', () => ({
    DashboardQueryParser: jest.fn(() => [[{ sql: 'SELECT 1' }], [], '']),
    SqlResDataType: jest.fn(() => 'TIME_VALUE'),
}));
jest.mock('@/utils/DashboardChartOptionParser', () => ({ DashboardChartOptionParser: jest.fn(() => ({})) }));
jest.mock('@/utils/DashboardChartCodeParser', () => ({ DashboardChartCodeParser: jest.fn(() => '') }));
jest.mock('@/utils/eChartHelper', () => ({ chartTypeConverter: jest.fn(() => 'line') }));

// base name → expected verdict. The extension is appended per caller; 'A' gets it in upper case.
const CASES: [string, string, boolean][] = [
    ['A', 'upper-case name and extension', true],
    ['x(1)', 'parentheses', true],
    ['a+b', "'+'", false],
    // r17: one charset = the rename charset — an unbalanced ')' is allowed everywhere
    ['test)', "unbalanced ')'", true],
    // r17: leading '.' is rejected for every entry point (the server hides it from /api/files listings)
    ['.hidden', "leading '.'", false],
];
const withExt = (aBase: string, aExt: string) => (aBase === 'A' ? `${aBase}.${aExt.toUpperCase()}` : `${aBase}.${aExt}`);

const PANEL = { title: 'X', w: 10, h: 10, type: 'Line', blockList: [{}], transformBlockList: [], xAxisOptions: [], yAxisOptions: [], chartOptions: {}, theme: 'dark', isAxisInterval: false, plg: '', useCustomTime: false };
const SQL_TAB = { id: 't1', type: 'sql', name: 'q.sql', path: '/', code: 'SELECT 1', savedCode: '', sheet: [], panels: [], range_bgn: '', range_end: '' };

const flushDebounce = () =>
    act(async () => {
        await new Promise((r) => setTimeout(r, 300));
    });
const isDisabled = (aEl: HTMLElement) => (aEl.closest('button') as HTMLButtonElement).disabled;

/** Each caller, rendered for real: returns whether the UI accepts the name. */
const CALLERS: [string, (aBase: string) => Promise<boolean>][] = [
    [
        'FileModal (OK → POST)',
        async (b) => {
            const sName = withExt(b, 'sql');
            render(
                <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, '/' + sName)}>
                    <FileModal setIsOpen={jest.fn()} />
                </RecoilRoot>
            );
            await act(async () => {
                fireEvent.click(screen.getByTestId('file-new-confirm'));
            });
            // definite signal either way: the in-modal error, or the POST
            await waitFor(() => expect(!!screen.queryByTestId('file-new-error') || (postFileList as jest.Mock).mock.calls.length > 0).toBe(true));
            return (postFileList as jest.Mock).mock.calls.length === 1 && (postFileList as jest.Mock).mock.calls[0][2] === sName;
        },
    ],
    [
        'SaveModal (Apply enabled)',
        async (b) => {
            render(
                <RecoilRoot
                    initializeState={({ set }) => {
                        set(gBoardList, [SQL_TAB] as any);
                        set(gSelectedTab, 't1');
                    }}
                >
                    <SaveModal setIsOpen={jest.fn()} pIsSave={true} />
                </RecoilRoot>
            );
            fireEvent.change(await screen.findByDisplayValue('q.sql'), { target: { value: withExt(b, 'sql') } });
            return !isDisabled(screen.getByText('Apply'));
        },
    ],
    [
        'SaveDashboardModal (OK enabled)',
        async (b) => {
            render(
                <RecoilRoot>
                    <SaveDashboardModal setIsOpen={jest.fn()} pPanelInfo={PANEL} pDashboardTime={{ start: '1000', end: '2000' }} />
                </RecoilRoot>
            );
            fireEvent.change(await screen.findByDisplayValue('X.tql'), { target: { value: withExt(b, 'tql') } });
            return !isDisabled(screen.getByText('OK'));
        },
    ],
    [
        'tagAnalyzer SaveAsModal (submit enabled)',
        async (b) => {
            render(<SaveAsModal initialDirectoryPath="/" initialFileName="mine.taz" onClose={jest.fn()} onSaveAs={jest.fn()} />);
            fireEvent.change(await screen.findByDisplayValue('mine.taz'), { target: { value: withExt(b, 'taz') } });
            return !(screen.getByTestId('tag-analyzer-save-as-submit-button') as HTMLButtonElement).disabled;
        },
    ],
    [
        'UrlDownloadModal (OK → POST)',
        async (b) => {
            const sName = withExt(b, 'csv');
            (global as any).fetch = jest.fn(() => Promise.resolve({ status: 200, text: () => Promise.resolve('a,b'), json: () => Promise.resolve({}) }));
            render(
                <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, '/d/')}>
                    <UrlDownloadModal setIsOpen={jest.fn()} pCallback={jest.fn()} />
                </RecoilRoot>
            );
            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://h/d/' + encodeURIComponent(sName) } });
            await act(async () => {
                fireEvent.click(screen.getByText('OK'));
            });
            await waitFor(() => expect(!!screen.queryByTestId('url-download-error') || (postFileList as jest.Mock).mock.calls.length > 0).toBe(true));
            return (postFileList as jest.Mock).mock.calls.length === 1 && (postFileList as jest.Mock).mock.calls[0][2] === sName;
        },
    ],
    [
        'FolderModal git clone (URL → folder name, OK → POST)',
        async (b) => {
            render(
                <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, '/')}>
                    <FolderModal setIsOpen={jest.fn()} pIsGit={true} />
                </RecoilRoot>
            );
            fireEvent.change(screen.getByTestId('folder-new-git-url-input'), { target: { value: 'https://h/x/' + encodeURIComponent(b) + '.git' } });
            await flushDebounce();
            if (screen.queryByTestId('folder-new-error')) return false;
            await act(async () => {
                fireEvent.click(screen.getByTestId('folder-new-confirm'));
            });
            await waitFor(() => expect((postFileList as jest.Mock).mock.calls.length).toBe(1));
            return (postFileList as jest.Mock).mock.calls[0][1] === '/' + b;
        },
    ],
];

describe('every name entry point, rendered — same verdict for the same name', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        (getFileList as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
    });
    afterEach(cleanup);

    describe.each(CASES)('name %s (%s)', (aBase, _aLabel, aExpected) => {
        it.each(CALLERS)('%s', async (_aCaller, aRun) => {
            expect(await aRun(aBase)).toBe(aExpected);
        });
    });
});
