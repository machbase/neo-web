// r19 (issue-1544): the "Select file" dialog listed `?filter=*.<type>` from the server, which is case-sensitive,
// so a non-hidden `X.TQL` was missing. The list is now fetched unfiltered and narrowed client-side without case.

import { render, screen, fireEvent } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { SelectFileBtn } from './SelectFileBtn';
import { getFileList } from '@/api/repository/api';

jest.mock('@/api/repository/api', () => ({
    getFileList: jest.fn(),
}));

/** The server's listing, its `?filter=*.<ext>` applied the way the server does it: case-sensitive, folders kept (measured). */
const serverListing = (aChildren: any[]) => (aFilter: string) => {
    const sExt = /^\?filter=\*\.(.+)$/.exec(aFilter ?? '')?.[1];
    const sChildren = sExt ? aChildren.filter((aC) => aC.isDir || aC.name.endsWith('.' + sExt)) : aChildren;
    return Promise.resolve({ success: true, data: { isDir: true, children: sChildren } });
};
const listRequestFilters = () => (getFileList as jest.Mock).mock.calls.map((aCall) => aCall[0]);

describe('SelectFileBtn — type list (r19)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lists X.TQL (case variant) with a.tql and folders; no ?filter= on the list request', async () => {
        (getFileList as jest.Mock).mockImplementation(
            serverListing([
                { name: 'sub', isDir: true, type: 'dir', lastModifiedUnixMillis: 0, size: 0 },
                { name: 'X.TQL', isDir: false, type: '.TQL', lastModifiedUnixMillis: 0, size: 1 },
                { name: 'a.tql', isDir: false, type: '.tql', lastModifiedUnixMillis: 0, size: 1 },
                { name: 'q.sql', isDir: false, type: '.sql', lastModifiedUnixMillis: 0, size: 1 },
            ])
        );
        render(
            <RecoilRoot>
                <SelectFileBtn pType="tql" pCallback={jest.fn()} />
            </RecoilRoot>
        );
        fireEvent.click(screen.getByText('Select file'));
        expect(await screen.findByText('X.TQL')).toBeInTheDocument();
        expect(screen.getByText('a.tql')).toBeInTheDocument();
        expect(screen.getByText('sub')).toBeInTheDocument();
        expect(screen.queryByText('q.sql')).toBeNull();
        expect(listRequestFilters().length).toBeGreaterThan(0);
        expect(listRequestFilters().every((aF) => !String(aF).includes('?filter='))).toBe(true);
    });
});
