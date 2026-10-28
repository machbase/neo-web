// issue #1570 F-180 — Refresh also re-reads every table's record count. When that read failed the
// count was set to 0, so a lost connection made every table look emptied.

jest.mock('@/api/repository/api', () => ({
    getTableInfo: jest.fn(),
    getColumnIndexInfo: jest.fn(),
    getRecordCount: jest.fn(),
    unMountDB: jest.fn(),
    mountDB: jest.fn(),
    backupStatus: jest.fn(),
}));
jest.mock('@/utils/currentDatabaseState', () => ({ isMountedDatabaseName: () => false, normalizeDatabaseId: (a: any) => a }));
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), getUserName: () => 'sys', isCurUserEqualAdmin: () => true }));

import { render, screen, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { TableInfo } from './TableInfo';
import { getRecordCount } from '@/api/repository/api';

// row: DB_NM, USER_NM, TB_NM, TB_ID, TB_TYPE, …
const ROW = ['MACHBASEDB', 'SYS', 'T1', 1, 6, 0, 0, 0, 1];
const VALUE = {
    dbName: 'MACHBASEDB',
    tableLen: 1,
    userList: [{ userName: 'SYS', total: 1, tableList: { log: [], transaction: [], fixed: [], volatile: [], lookup: [], keyValue: [], tag: [ROW], view: [], exception: [] } }],
};
const COUNT = (n: number) => ({ success: true, data: { rows: [[n]] } });

beforeEach(() => jest.clearAllMocks());

const renderAt = (aRefresh: number) => (
    <RecoilRoot>
        <TableInfo pShowHiddenObj pValue={VALUE} pRefresh={aRefresh} pUpdate={jest.fn()} pContextMenu={jest.fn()} />
    </RecoilRoot>
);

test.each([
    ['network failure', Object.assign(new Error('Network Error'), { isAxiosError: true, name: 'AxiosError' })],
    ['HTTP 500', { status: 500, statusText: 'Internal Server Error', headers: {}, data: { success: false, reason: 'server busy' } }],
])('a count read that fails (%s) keeps the count shown', async (_label, aFailure) => {
    (getRecordCount as jest.Mock).mockResolvedValueOnce(COUNT(1204)).mockResolvedValueOnce(aFailure);
    const { rerender } = await act(async () => render(renderAt(0)));
    expect(screen.getByText('1,204')).toBeInTheDocument();

    await act(async () => {
        rerender(renderAt(1));
    });
    expect(getRecordCount).toHaveBeenCalledTimes(2);
    expect(screen.getByText('1,204')).toBeInTheDocument();
});

test('a table that really is empty still reads 0', async () => {
    (getRecordCount as jest.Mock).mockResolvedValueOnce(COUNT(1204)).mockResolvedValueOnce(COUNT(0));
    const { rerender } = await act(async () => render(renderAt(0)));
    await act(async () => {
        rerender(renderAt(1));
    });
    expect(screen.queryByText('1,204')).not.toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
});
