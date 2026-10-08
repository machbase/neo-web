// A damaged board file exists on the server; it must not be reported (and marked) as "not found"
// (issue-1544). loadBoardFromFile tells the two apart with `invalid`.

import { renderHook, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ReactNode } from 'react';
import { useOpenGroupItem } from './useOpenGroupItem';
import { loadBoardFromFile } from '@/components/side/FileExplorer/loadBoardFromFile';
import { Toast } from '@/design-system/components';

jest.mock('@/components/side/FileExplorer/loadBoardFromFile', () => ({ loadBoardFromFile: jest.fn() }));
jest.mock('@/components/side/AppStore/appTabs', () => ({ useAppStoreTabs: () => ({ openAppViewTab: jest.fn() }) }));
jest.mock('@/components/side/AppStore/pkgHtml', () => ({ probePkgHtml: jest.fn() }));
jest.mock('@/components/side/AppStore/pkgViews', () => ({ useOpenPkgView: () => jest.fn() }));
jest.mock('./groupResources', () => ({
    KIND_LABELS: { file: { one: 'File', many: 'Files', action: 'Open' } },
    resolveItem: jest.fn(),
}));
jest.mock('@/utils/recentFiles', () => ({ recordRecentFile: jest.fn() }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => <RecoilRoot>{children}</RecoilRoot>;
const ITEM = { kind: 'file' as const, ref: '/d/broken.dsh', label: 'broken.dsh' };

describe('useOpenGroupItem — damaged file', () => {
    beforeEach(() => jest.clearAllMocks());

    it('an invalid (damaged) file shows a damaged notice, not "not found", and is not marked missing', async () => {
        (loadBoardFromFile as jest.Mock).mockResolvedValue({ error: 'Unexpected token', invalid: true });
        const { result } = renderHook(() => useOpenGroupItem(), { wrapper });
        let sOk: boolean | undefined;
        await act(async () => {
            sOk = await result.current(ITEM);
        });
        expect(sOk).toBe(true);
        expect(Toast.error).toHaveBeenCalledTimes(1);
        const sMessage = (Toast.error as jest.Mock).mock.calls[0][0];
        expect(sMessage).toContain('damaged');
        expect(sMessage).not.toContain('not found');
    });

    it('a missing file is still reported as not found', async () => {
        (loadBoardFromFile as jest.Mock).mockResolvedValue({ error: 'not found' });
        const { result } = renderHook(() => useOpenGroupItem(), { wrapper });
        let sOk: boolean | undefined;
        await act(async () => {
            sOk = await result.current(ITEM);
        });
        expect(sOk).toBe(false);
        expect((Toast.error as jest.Mock).mock.calls[0][0]).toContain('was not found');
    });

    it('a transport failure stays quiet here (unchanged)', async () => {
        (loadBoardFromFile as jest.Mock).mockResolvedValue({ error: 'Network Error', transport: true });
        const { result } = renderHook(() => useOpenGroupItem(), { wrapper });
        let sOk: boolean | undefined;
        await act(async () => {
            sOk = await result.current(ITEM);
        });
        expect(sOk).toBe(true);
        expect(Toast.error).not.toHaveBeenCalled();
    });
});

jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));

describe('useOpenGroupItem — damaged .taz through the real loader', () => {
    beforeEach(() => jest.clearAllMocks());

    it('a broken .taz (loader catch branch) is reported as damaged, not "not found"', async () => {
        const { getFiles } = jest.requireMock('@/api/repository/fileTree');
        (getFiles as jest.Mock).mockResolvedValue('{broken');
        const sActual = jest.requireActual('@/components/side/FileExplorer/loadBoardFromFile');
        (loadBoardFromFile as jest.Mock).mockImplementation(sActual.loadBoardFromFile);
        const { result } = renderHook(() => useOpenGroupItem(), { wrapper });
        let sOk: boolean | undefined;
        await act(async () => {
            sOk = await result.current({ kind: 'file' as const, ref: '/d/broken.taz', label: 'broken.taz' });
        });
        expect(getFiles).toHaveBeenCalledWith('/d/broken.taz');
        expect(sOk).toBe(true);
        const sMessage = (Toast.error as jest.Mock).mock.calls[0][0];
        expect(sMessage).toContain('damaged');
        expect(sMessage).not.toContain('not found');
    });
});
