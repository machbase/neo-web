// issue #1570 F-123 — dropping a table from the tree said nothing on success, and for a table
// already dropped elsewhere showed the driver's raw ERR-2025 text and left the node in place.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { DBExplorer } from './DBExplorer';
import { getTableList } from '@/api/repository/api';
import { fetchQuery } from '@/api/repository/database';
import { Toast } from '@/design-system/components';

jest.mock('@/api/repository/api', () => ({
    backupStatus: jest.fn(),
    getBackupDBList: jest.fn(async () => ({ success: true, data: [] })),
    getConnectableDatabases: jest.fn(async () => []),
    getTableList: jest.fn(),
}));
jest.mock('@/api/repository/currentDatabase', () => ({ refreshDatabases: jest.fn(async () => undefined) }));
jest.mock('@/utils/currentDatabaseState', () => ({ getDatabases: () => [], isDatabaseWritable: () => true }));
jest.mock('@/api/repository/database', () => ({ fetchQuery: jest.fn() }));
jest.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ getExperiment: () => true }) }));
// row: DB_NM, USER_NM, TB_ID, TB_NM, TB_TYPE, TB_FLAG, DB_ID, PRIV
const ROW = ['MACHBASEDB', 'SYS', 11, 'GONE_T', 0, 0, -1, 0];
jest.mock('./TableInfo', () => ({
    TableInfo: ({ pValue, pContextMenu }: any) => (
        <div data-testid="db-node" onContextMenu={(e) => pContextMenu(e, ROW, 'SYS', 0)}>{`${pValue.dbName}:${pValue.tableLen}`}</div>
    ),
    BackupTableInfo: () => null,
}));
jest.mock('./DBMountModal', () => ({ DBMountModal: () => null }));
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), isCurUserEqualAdmin: () => false, getUserName: () => 'sys' }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

const withRow = { success: true, data: { columns: [], rows: [ROW] } };
const without = { success: true, data: { columns: [], rows: [] } };

const dropFromTree = async () => {
    await act(async () => {
        render(
            <RecoilRoot>
                <DBExplorer />
            </RecoilRoot>
        );
    });
    fireEvent.contextMenu(screen.getByTestId('db-node'));
    fireEvent.click(screen.getByText('Drop table'));
    await act(async () => {
        fireEvent.click(screen.getByText('OK'));
    });
};

beforeEach(() => jest.clearAllMocks());

test('a successful drop says so and re-reads the tree', async () => {
    (getTableList as jest.Mock).mockResolvedValueOnce(withRow).mockResolvedValue(without);
    (fetchQuery as jest.Mock).mockResolvedValue({ svrState: true, svrReason: 'success' });
    await dropFromTree();

    expect((fetchQuery as jest.Mock).mock.calls[0][0]).toMatch(/^DROP TABLE .*GONE_T/);
    expect(Toast.success).toHaveBeenCalledWith(expect.stringContaining('GONE_T'), expect.anything());
    expect(getTableList).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('db-node')).not.toBeInTheDocument();
});

test('a table already dropped elsewhere gets a plain message and a re-read tree', async () => {
    (getTableList as jest.Mock).mockResolvedValueOnce(withRow).mockResolvedValue(without);
    (fetchQuery as jest.Mock).mockResolvedValue({ svrState: false, svrReason: 'MACHCLI-ERR-2025, Table GONE_T does not exist.' });
    await dropFromTree();

    const sMessage = (Toast.error as jest.Mock).mock.calls[0][0];
    expect(sMessage).toContain('no longer exists');
    expect(sMessage).not.toContain('MACHCLI');
    expect(getTableList).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('db-node')).not.toBeInTheDocument();
});

test('any other failure keeps the server reason and the tree as it was', async () => {
    (getTableList as jest.Mock).mockResolvedValue(withRow);
    (fetchQuery as jest.Mock).mockResolvedValue({ svrState: false, svrReason: 'MACHCLI-ERR-9999, something else' });
    await dropFromTree();

    expect(Toast.error).toHaveBeenCalledWith('MACHCLI-ERR-9999, something else', expect.anything());
    expect(getTableList).toHaveBeenCalledTimes(1);
});
