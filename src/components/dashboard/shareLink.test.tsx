// The share link was built as path + name.split('.')[0] and both dashboard views re-appended a lower-case
// '.dsh'. With extension case ignored by the name rule, `X.DSH` is a valid name → link resolved to `X.dsh`
// (404 on case-sensitive servers); `v1.2.dsh` was cut to `v1` (issue-1544 r11). The link now carries the
// real file name; old extension-less links keep working.

jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn(() => Promise.resolve({ success: false })) }));
jest.mock('@/components/dashboard/panels/Panel', () => () => null);
jest.mock('@/public-dashboard/components/panels/Panel', () => () => null);
jest.mock('@/public-dashboard/api/repository/machiot', () => ({
    executeQuery: jest.fn(() => Promise.resolve({})),
    fetchBlockTimeMinMax: jest.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { ShareModal } from './ShareModal';
import DashboardView from '@/view/Dashboard/DashboardView';
import PublicDashboardView from '@/public-dashboard/components/Dashboard/DashboardView';
import { getFiles } from '@/api/repository/fileTree';
import { toDshPath } from '@/utils/filePath';

const shareLink = (aPath: string, aName: string) => {
    const { unmount } = render(<ShareModal isOpen onClose={jest.fn()} boardInfo={{ path: aPath, name: aName }} />);
    const sValue = (screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value;
    unmount();
    return sValue;
};

describe('share link uses the real file name', () => {
    it.each([
        ['/d/', 'X.DSH', '/web/ui/board/d/X.DSH'],
        ['/', 'v1.2.dsh', '/web/ui/board/v1.2.dsh'],
        ['/d/', 'plain.dsh', '/web/ui/board/d/plain.dsh'],
    ])('%s%s → %s', (aPath, aName, aExpected) => {
        expect(shareLink(aPath, aName)).toBe(window.location.origin + aExpected);
    });
});

describe('toDshPath', () => {
    it.each([
        ['d/X.DSH', 'd/X.DSH'],
        ['v1.2.dsh', 'v1.2.dsh'],
        ['d/x', 'd/x.dsh'], // links made before keep working
        ['v1.2', 'v1.2.dsh'],
        ['d/.dsh', 'd/.dsh.dsh'],
    ])('%s → %s', (aIn, aOut) => expect(toDshPath(aIn)).toBe(aOut));
});

describe('main DashboardView (/view/*) opens the file the link names', () => {
    beforeEach(() => (getFiles as jest.Mock).mockClear());
    it.each([
        ['/view/d/X.DSH', '/d/X.DSH'],
        ['/view/v1.2.dsh', '/v1.2.dsh'],
        ['/view/d/old', '/d/old.dsh'],
    ])('%s → getFiles(%s)', async (aUrl, aFile) => {
        render(
            <RecoilRoot>
                <MemoryRouter initialEntries={[aUrl]}>
                    <Routes>
                        <Route path="/view/*" element={<DashboardView />} />
                    </Routes>
                </MemoryRouter>
            </RecoilRoot>
        );
        await waitFor(() => expect(getFiles).toHaveBeenCalledWith(aFile));
    });
});

describe('public DashboardView (/board/*, the share link target) fetches the file the link names', () => {
    let sFetch: jest.Mock;
    beforeEach(() => {
        sFetch = jest.fn(() => Promise.resolve({ ok: false, text: () => Promise.resolve('') }));
        (global as any).fetch = sFetch;
    });
    it.each([
        ['/board/d/X.DSH', '/db/tql/d/X.DSH'],
        ['/board/v1.2.dsh', '/db/tql/v1.2.dsh'],
        ['/board/d/old', '/db/tql/d/old.dsh'],
    ])('%s → fetch(%s)', async (aUrl, aFetchUrl) => {
        render(
            <RecoilRoot>
                <MemoryRouter initialEntries={[aUrl]}>
                    <Routes>
                        {/* as in PublicRoutes: "/*", the view strips the leading 'board/' itself */}
                        <Route path="/*" element={<PublicDashboardView />} />
                    </Routes>
                </MemoryRouter>
            </RecoilRoot>
        );
        await waitFor(() => expect(sFetch).toHaveBeenCalledWith(aFetchUrl));
    });
});
