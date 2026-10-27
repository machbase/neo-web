// issue #1570 F-139 — for a tag whose name ends in `\` the engine answers "a row updated." to a
// METADATA UPDATE and changes nothing. The table used to paint the typed value as if stored;
// after a save it must show the row as the database holds it.

import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { MetaTablePage } from './metaTablePage';
import { fetchQuery, fetchTqlQuery } from '@/api/repository/database';

jest.mock('@/api/repository/database', () => ({ fetchQuery: jest.fn(), fetchTqlQuery: jest.fn() }));
jest.mock('@/utils/currentDatabaseState', () => ({ ...jest.requireActual('@/utils/currentDatabaseState'), isDatabaseWritable: () => true }));
jest.mock('@/components/tagHierarchy/TagHierarchyPage', () => ({ TagHierarchyPage: () => null }));
jest.mock('./statzTableModal', () => ({ StatzTableModal: () => null }));
jest.mock('@/design-system/components/Toast', () => ({
    Toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));
jest.mock('@/design-system/components/Table/CommonTable', () => ({
    __esModule: true,
    default: ({ data, onSave }: any) => (
        <div>
            {data?.rows?.map((r: any[]) => (
                <div key={String(r[0])} data-testid={`meta-row-${r[0]}`}>
                    {r.map((c) => String(c)).join('|')}
                </div>
            ))}
            <button onClick={() => onSave({ modBeforeInfo: { rowIdx: 0, row: data.rows[0] }, modAfterInfo: { row: [data.rows[0][0], data.rows[0][1], 'typed'] } })}>save-first</button>
        </div>
    ),
}));

const COLUMNS = ['_ID', 'NAME', 'DESCR'];
const TABLE = ['MACHBASEDB', 'SYS', 1, 'S3_META', 6, 0, -1, 0];

const renderPage = async () => {
    await act(async () => {
        render(
            <RecoilRoot>
                <MetaTablePage pIsActiveTab pMTableInfo={TABLE} pRefresh={{ state: 0, set: jest.fn() }} pMColInfo={{ rows: [['NAME']] }} />
            </RecoilRoot>
        );
    });
};

const page = (aRows: any[][]) => ({ svrState: true, svrData: { columns: COLUMNS, types: [], rows: aRows } });

beforeEach(() => jest.clearAllMocks());

test('a save the engine did not apply shows the stored value, re-read by _ID', async () => {
    (fetchTqlQuery as jest.Mock).mockImplementation(async (aSql: string) =>
        aSql.includes('where _id = 20') ? page([[20, 'F_DB_tail\\', 'old']]) : page([[20, 'F_DB_tail\\', 'old']])
    );
    (fetchQuery as jest.Mock).mockImplementation(async (aSql: string) =>
        aSql.startsWith('UPDATE') ? { svrState: true, svrReason: 'a row updated.' } : { svrState: true, svrData: { rows: [[1]] } }
    );
    await renderPage();
    const sMetaRow = await screen.findByTestId('meta-row-20');
    expect(sMetaRow).toHaveTextContent('20|F_DB_tail\\|old');

    await act(async () => {
        fireEvent.click(screen.getByText('save-first'));
    });

    expect((fetchTqlQuery as jest.Mock).mock.calls.some((c) => /select \* from .*_S3_META_META.* where _id = 20/.test(c[0]))).toBe(true);
    expect(screen.getByTestId('meta-row-20')).toHaveTextContent('20|F_DB_tail\\|old');
});

test('a save that was applied shows the stored new value', async () => {
    let sStored = 'old';
    (fetchTqlQuery as jest.Mock).mockImplementation(async () => page([[21, 'F_DB_plain', sStored]]));
    (fetchQuery as jest.Mock).mockImplementation(async (aSql: string) => {
        if (aSql.startsWith('UPDATE')) {
            sStored = 'typed';
            return { svrState: true, svrReason: 'a row updated.' };
        }
        return { svrState: true, svrData: { rows: [[1]] } };
    });
    await renderPage();
    await screen.findByTestId('meta-row-21');
    await act(async () => {
        fireEvent.click(screen.getByText('save-first'));
    });

    expect(screen.getByTestId('meta-row-21')).toHaveTextContent('21|F_DB_plain|typed');
});
