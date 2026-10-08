// Every name entry point gives the same verdict for the same name (no caller-side lower-casing, endsWith or
// per-caller exceptions — issue-1544 r9). Table over the exact calls each caller now makes + component smoke checks.

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { SERVER_FILE_EXTENSIONS, nameFromUrl, validateName, validatePath } from './fileName';
import { FileModal } from '@/components/side/FileExplorer/FileModal';
import { SaveAsModal } from '@/components/tagAnalyzer/persistence/SaveAsModal';
import { gRecentDirectory } from '@/recoil/fileTree';
import { getFileList, postFileList } from '@/api/repository/api';
import { getFiles } from '@/api/repository/fileTree';

jest.mock('@/api/repository/api', () => ({ getFileList: jest.fn(), postFileList: jest.fn() }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
jest.mock('@/utils/UpdateTree', () => ({ TreeFetchDrilling: jest.fn(() => Promise.resolve({ tree: {} })) }));

// base name → expected verdict (extension appended per caller, in upper case for the first one)
const CASES: [string, string, boolean][] = [
    ['A', 'upper-case name and extension', true],
    ['x(1)', 'parentheses', true],
    ['a+b', "'+'", false],
    // r17: one charset = the rename (FileNameValidator) charset — an unbalanced ')' is allowed everywhere
    ['test)', "unbalanced ')'", true],
    ['test(1)', 'parentheses with digit', true],
    // r17: leading '.' is rejected for every entry point (the server hides it from /api/files listings)
    ['.hidden', "leading '.'", false],
];

const withExt = (aBase: string, aExt: string) => (aBase === 'A' ? `${aBase}.${aExt.toUpperCase()}` : `${aBase}.${aExt}`);

const CALLERS: [string, (aBase: string) => boolean][] = [
    ['FileModal (validatePath file)', (b) => validatePath('/d/' + withExt(b, 'sql'), { kind: 'file' }).ok],
    ['SaveModal (validateName file+sql)', (b) => validateName(withExt(b, 'sql'), { kind: 'file', type: 'sql' }).ok],
    ['SaveDashboardModal (validateName file+tql)', (b) => validateName(withExt(b, 'tql'), { kind: 'file', type: 'tql' }).ok],
    ['tagAnalyzer SaveAsModal (validateName file+taz)', (b) => validateName(withExt(b, 'taz'), { kind: 'file', type: 'taz' }).ok],
    ['file-tree rename (validateName on the edited base)', (b) => validateName(b, { kind: 'folder' }).ok],
    ['UrlDownloadModal (nameFromUrl file + SERVER_FILE_EXTENSIONS)', (b) => nameFromUrl('https://h/d/' + encodeURIComponent(withExt(b, 'sql')), { kind: 'file', extensions: SERVER_FILE_EXTENSIONS }).ok],
    ['git clone / Quick install (nameFromUrl repo)', (b) => nameFromUrl('https://h/x/' + encodeURIComponent(b) + '.git', { kind: 'repo' }).ok],
];

describe.each(CASES)('name %s (%s)', (aBase, _aLabel, aExpected) => {
    it.each(CALLERS)('%s', (_aCaller, aCheck) => {
        expect(aCheck(aBase)).toBe(aExpected);
    });
});

describe('component smoke — same verdict in the UI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (postFileList as jest.Mock).mockResolvedValue({ success: true });
        (getFiles as jest.Mock).mockResolvedValue({ success: true, data: { isDir: true, children: [] } });
        (getFileList as jest.Mock).mockResolvedValue({ success: true, data: { children: [] } });
    });

    it.each([
        ['/A.SQL', 1],
        ['/x(1).sql', 1],
        ['/a+b.sql', 0],
        ['/test).txt', 1],
        ['/.hidden/x.sql', 0],
    ])('FileModal %s → %d POST', async (aPath, aPosts) => {
        render(
            <RecoilRoot initializeState={({ set }) => set(gRecentDirectory, aPath)}>
                <FileModal setIsOpen={jest.fn()} />
            </RecoilRoot>
        );
        await act(async () => {
            fireEvent.click(screen.getByTestId('file-new-confirm'));
        });
        await waitFor(() => expect(postFileList).toHaveBeenCalledTimes(aPosts));
        if (aPosts) expect((postFileList as jest.Mock).mock.calls[0][2]).toBe(aPath.slice(1));
    });

    it.each([
        ['A.TAZ', false],
        ['x(1).taz', false],
        ['a+b.taz', true],
        ['test).taz', false],
        ['.hidden.taz', true],
    ])('tagAnalyzer SaveAsModal %s → submit disabled=%s', async (aName, aDisabled) => {
        render(<SaveAsModal initialDirectoryPath="/" initialFileName="mine.taz" onClose={jest.fn()} onSaveAs={jest.fn()} />);
        fireEvent.change(await screen.findByDisplayValue('mine.taz'), { target: { value: aName } });
        const sButton = screen.getByTestId('tag-analyzer-save-as-submit-button');
        expect((sButton as HTMLButtonElement).disabled).toBe(aDisabled);
    });
});
