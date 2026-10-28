// issue #1570 F-180 — a failed Refresh (network failure or HTTP 500) emptied the tree and said
// nothing, so it read as an empty database. The tree the user had must stay, with a line under the
// header that says it was not refreshed (Side.LoadError) — not a toast that fades.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { DBExplorer } from './DBExplorer';
import { getTableList } from '@/api/repository/api';
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
jest.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ getExperiment: () => false }) }));
jest.mock('./TableInfo', () => ({
    TableInfo: ({ pValue }: any) => <div data-testid="db-node">{`${pValue.dbName}:${pValue.tableLen}`}</div>,
    BackupTableInfo: () => null,
}));
jest.mock('./DBMountModal', () => ({ DBMountModal: () => null }));
jest.mock('@/utils', () => ({ ...jest.requireActual('@/utils'), isCurUserEqualAdmin: () => false }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

// row: DB_NM, USER_NM, TB_NM, TB_ID, TB_TYPE, …
const OK = { success: true, data: { columns: [], rows: [['MACHBASEDB', 'SYS', 'T1', 1, 6, 0, 0, 0, 1]] } };

const refresh = async () => {
    await act(async () => {
        fireEvent.click(screen.getByTestId('db-explorer-refresh'));
    });
};

const mount = async () => {
    await act(async () => {
        render(
            <RecoilRoot>
                <DBExplorer />
            </RecoilRoot>
        );
    });
};

beforeEach(() => jest.clearAllMocks());

test.each([
    ['network failure', Object.assign(new Error('Network Error'), { isAxiosError: true, name: 'AxiosError' }), 'Network Error'],
    ['HTTP 500', { status: 500, statusText: 'Internal Server Error', headers: {}, data: { success: false, reason: 'server busy' } }, 'server busy'],
])('%s keeps the previous tree and tells the user', async (_label, aFailure, aReason) => {
    (getTableList as jest.Mock).mockResolvedValueOnce(OK).mockResolvedValueOnce(aFailure);
    await mount();
    expect(screen.getByTestId('db-node')).toHaveTextContent('MACHBASEDB:1');

    await refresh();

    expect(screen.getByTestId('db-node')).toHaveTextContent('MACHBASEDB:1');
    expect(screen.getByTestId('db-explorer-load-error')).toHaveTextContent(`Not refreshed · ${aReason} · as of`);
    expect(Toast.error).not.toHaveBeenCalled();
});

test('a first read that fails says it could not load', async () => {
    (getTableList as jest.Mock).mockResolvedValueOnce({ status: 500, statusText: 'x', headers: {}, data: { reason: 'server busy' } });
    await mount();

    expect(screen.queryByTestId('db-node')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-explorer-load-error')).toHaveTextContent("Couldn't load · server busy");
});

test('Retry on the line reads the list again', async () => {
    (getTableList as jest.Mock).mockResolvedValueOnce({ status: 500, statusText: 'x', headers: {}, data: { reason: 'server busy' } }).mockResolvedValueOnce(OK);
    await mount();
    await act(async () => {
        fireEvent.click(screen.getByTestId('db-explorer-load-error-retry'));
    });

    expect(screen.getByTestId('db-node')).toHaveTextContent('MACHBASEDB:1');
    expect(screen.queryByTestId('db-explorer-load-error')).not.toBeInTheDocument();
});

test('a refresh that succeeds after a failure shows the new tree', async () => {
    (getTableList as jest.Mock)
        .mockResolvedValueOnce(OK)
        .mockResolvedValueOnce({ status: 500, statusText: 'x', headers: {}, data: { reason: 'x' } })
        .mockResolvedValueOnce({ success: true, data: { columns: [], rows: [...OK.data.rows, ['MACHBASEDB', 'SYS', 'T2', 2, 6, 0, 0, 0, 1]] } });
    await mount();
    await refresh();
    await refresh();

    expect(screen.getByTestId('db-node')).toHaveTextContent('MACHBASEDB:2');
    expect(screen.queryByTestId('db-explorer-load-error')).not.toBeInTheDocument();
});
