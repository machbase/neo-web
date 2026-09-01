import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import { Block } from './Block';
import { getTableInfo, getVirtualTableInfo } from '@/api/repository/api';
import { resetCurrentDatabase, setCurrentDatabase, setDatabases } from '@/utils/currentDatabaseState';

jest.mock('@/api/repository/api', () => ({
    getTableInfo: jest.fn(),
    getVirtualTableInfo: jest.fn(),
}));

jest.mock('@/api/repository/machiot', () => ({
    fetchDashboardJsonColumnSamples: jest.fn(),
    getRollupTableList: jest.fn(() => Promise.resolve([])),
    getTqlChart: jest.fn(),
}));

const TABLE_LIST = [['MACHBASEDB', 'MACHBASEDB', 1, 'TAG', 6, 0, -1]];
const TABLE_ROWS = [
    ['NAME', 5, 0, 0, 134217728],
    ['TIME', 6, 0, 1, 16777216],
    ['VALUE', 20, 0, 2, 0],
];

const createBlockInfo = (overrides: Record<string, any> = {}) => ({
    id: 'block-1',
    table: 'TAG',
    userName: 'MACHBASEDB',
    color: '#73BF69',
    type: 'tag',
    filter: [{ id: 'filter-1', column: 'NAME', operator: '', value: '', useFilter: false, useTyping: false, typingValue: '' }],
    values: [{ id: 'value-1', alias: '', value: 'VALUE', jsonKey: '', aggregator: 'avg' }],
    useRollup: false,
    name: 'NAME',
    time: 'TIME',
    useCustom: false,
    aggregator: 'avg',
    diff: 'none',
    tag: '',
    value: 'VALUE',
    jsonKey: '',
    alias: '',
    math: '',
    isValidMath: true,
    duration: { from: '', to: '' },
    customFullTyping: {
        use: false,
        text: '',
    },
    isVisible: true,
    tableInfo: TABLE_ROWS,
    ...overrides,
});

const renderBlock = (blockOverrides: Record<string, any> = {}, tableList: any[] = TABLE_LIST) => {
    const blockInfo = createBlockInfo(blockOverrides);
    const panelOption = {
        type: 'Gauge',
        blockList: [blockInfo],
        transformBlockList: [],
    };

    return render(
        <RecoilRoot>
            <Block
                pBlockInfo={blockInfo}
                pPanelOption={panelOption}
                pVariables={[]}
                pTableList={tableList}
                pType="modify"
                pGetTables={jest.fn()}
                pSetPanelOption={jest.fn()}
                pBlockOrder={0}
                pBlockCount={{ addable: true }}
            />
        </RecoilRoot>
    );
};

const getTableRow = () => {
    const row = screen.getByText('Table').closest('.page-dp-row');
    expect(row).not.toBeNull();
    return row as HTMLElement;
};

describe('Block virtual stat table layout', () => {
    beforeEach(() => {
        jest.mocked(getTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
        jest.mocked(getVirtualTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('shows Value field beside Table only once for virtual stat tables', async () => {
        renderBlock({
            table: 'V$TAG_STAT',
            useCustom: true,
        });

        await waitFor(() => expect(getVirtualTableInfo).toHaveBeenCalled());

        expect(screen.queryByText('Time field')).not.toBeInTheDocument();
        expect(within(getTableRow()).getByText('Value field')).toBeInTheDocument();
        expect(screen.getAllByText('Value field')).toHaveLength(1);
    });

    test('keeps Time field beside Table for normal tables', async () => {
        renderBlock();

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());

        expect(within(getTableRow()).getByText('Time field')).toBeInTheDocument();
    });

    test('does not show the moved virtual stat Value field in full typing mode', async () => {
        renderBlock({
            table: 'V$TAG_STAT',
            useCustom: true,
            customFullTyping: {
                use: true,
                text: 'select * from V$TAG_STAT',
            },
        });

        await waitFor(() => expect(getVirtualTableInfo).toHaveBeenCalled());

        expect(screen.queryByText('Value field')).not.toBeInTheDocument();
        expect(screen.queryByText('Time field')).not.toBeInTheDocument();
    });
});

/**
 * Since v8.7 a table-list row names its table in full — `database.owner.table` — because a
 * shorter name resolves against whichever database the session is in, and a server can now hold
 * several. Two things in this panel were written when that was not true.
 */
describe('Block resolves its row against fully qualified table names', () => {
    // One tag table in MACHBASEDB, exactly as parseDashboardTables now emits it. Index 1 is the
    // owner, 3 the qualified name, 6 the database id (text, since a mounted id overflows a
    // JavaScript number).
    const V87_TABLE_LIST = [['MACHBASEDB', 'SYS', 1, 'MACHBASEDB.SYS.TAG', 6, 0, '1']];

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([{ id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true }]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        jest.mocked(getTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
        jest.mocked(getVirtualTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
    });

    afterEach(() => {
        resetCurrentDatabase();
        jest.clearAllMocks();
    });

    test('a qualified stat view is read on its own database and owner', async () => {
        // The bug this guards: the name was assembled as `owner.V$table_STAT` from a row that
        // already carried its database, giving `MACHBASEDB.V$SYS_STAT` — which the engine reads
        // as a user called MACHBASEDB and rejects with ERR-2080.
        renderBlock({ table: 'MACHBASEDB.SYS.V$TAG_STAT', useCustom: true }, V87_TABLE_LIST);

        await waitFor(() => expect(getVirtualTableInfo).toHaveBeenCalled());
        expect(getVirtualTableInfo).toHaveBeenCalledWith('1', 'V$TAG_STAT', 'SYS');
    });

    test('a qualified ordinary table finds its row', async () => {
        renderBlock({ table: 'MACHBASEDB.SYS.TAG' }, V87_TABLE_LIST);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('1', 1);
    });

    test('a config written before v8.7 still finds its row', async () => {
        // Saved dashboards hold whatever was unambiguous then — `TAG`, not the qualified name.
        // Rows are qualified now, so an exact comparison left those panels with no row at all
        // and therefore no column list.
        renderBlock({ table: 'TAG' }, V87_TABLE_LIST);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('1', 1);
    });

    test('a pre-v8.7 stat view name resolves too', async () => {
        renderBlock({ table: 'V$TAG_STAT', useCustom: true }, V87_TABLE_LIST);

        await waitFor(() => expect(getVirtualTableInfo).toHaveBeenCalled());
        expect(getVirtualTableInfo).toHaveBeenCalledWith('1', 'V$TAG_STAT', 'SYS');
    });

    test('a table the list does not carry is dropped rather than crashing the panel', async () => {
        // The row reads below the lookup are unguarded, so a stale config used to throw inside
        // a render and take the whole panel down with it.
        expect(() => renderBlock({ table: 'FACTORY_A.SYS.GONE' }, V87_TABLE_LIST)).not.toThrow();

        await waitFor(() => expect(getTableInfo).not.toHaveBeenCalled());
        expect(getVirtualTableInfo).not.toHaveBeenCalled();
    });
});

/**
 * An under-qualified name from a pre-v8.7 config no longer identifies one row on its own:
 * `ATABLE` exists in three databases on a test server, and `SYS.ATABLE` sits beside
 * `KEV.ATABLE` inside one of them. What the config *does* carry — its owner, and the database
 * the session is in — has to supply the missing parts, and when that still leaves a choice the
 * answer must be nothing rather than whichever row the engine happened to list first.
 */
describe('Block refuses to guess which row an ambiguous legacy name means', () => {
    const KEV_ROW = ['MACHBASEDB', 'KEV', 494, 'MACHBASEDB.KEV.ATABLE', 6, 0, '1'];
    const SYS_ROW = ['MACHBASEDB', 'SYS', 130, 'MACHBASEDB.SYS.ATABLE', 6, 0, '1'];
    const FACTORY_ROW = ['FACTORY_A', 'SYS', 291, 'FACTORY_A.SYS.ATABLE', 6, 0, '2'];
    const MOUNT_ROW = ['MOUNT_DDD', 'SYS', 130, 'MOUNT_DDD.SYS.ATABLE', 6, 0, '4611686018427387913'];
    const LINE_B_ROW = ['LINE_B', 'SYS', 77, 'LINE_B.SYS.ATABLE', 6, 0, '3'];

    beforeEach(() => {
        resetCurrentDatabase();
        setDatabases([
            { id: '1', name: 'MACHBASEDB', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: true },
            { id: '2', name: 'FACTORY_A', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
            { id: '3', name: 'LINE_B', kind: 'ACTIVE', accessMode: 'READ_WRITE', isDefault: false },
            { id: '4611686018427387913', name: 'MOUNT_DDD', kind: 'MOUNTED', accessMode: 'READ_ONLY', isDefault: false },
        ]);
        setCurrentDatabase({ id: '1', name: 'MACHBASEDB' });
        jest.mocked(getTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
        jest.mocked(getVirtualTableInfo).mockResolvedValue({ data: { rows: TABLE_ROWS } } as any);
    });

    afterEach(() => {
        resetCurrentDatabase();
        jest.clearAllMocks();
    });

    test('the block’s own owner breaks a tie between two owners in one database', async () => {
        // KEV's row is listed first, so a plain `find` bound the panel to table 494 — another
        // user's table — while the data query still read SYS's.
        renderBlock({ table: 'ATABLE', userName: 'SYS' }, [KEV_ROW, SYS_ROW]);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('1', 130);
    });

    test('the session’s database breaks a tie between databases', async () => {
        renderBlock({ table: 'SYS.ATABLE', userName: 'SYS' }, [FACTORY_ROW, SYS_ROW]);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('1', 130);
    });

    test('a mounted row is never chosen over an active one', async () => {
        // A mounted database has no V$ catalogue at all — measured, V$TABLES carries no rows
        // for it — so binding the panel there reads no columns and leaves the stale ones up.
        renderBlock({ table: 'SYS.ATABLE', userName: 'SYS' }, [MOUNT_ROW, FACTORY_ROW]);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('2', 291);
    });

    test('two candidates outside this database resolve to no row at all', async () => {
        // Nothing left to break the tie with. `find` would answer with whichever row the
        // engine listed first — measured, that order is not stable across table names — and
        // binding a panel's columns to a different table than its data query reads is worse
        // than showing none.
        renderBlock({ table: 'SYS.ATABLE', userName: 'SYS' }, [FACTORY_ROW, LINE_B_ROW]);

        await waitFor(() => expect(getTableInfo).not.toHaveBeenCalled());
        expect(getVirtualTableInfo).not.toHaveBeenCalled();
    });

    test('one surviving active candidate is still unambiguous', async () => {
        renderBlock({ table: 'SYS.ATABLE', userName: 'SYS' }, [FACTORY_ROW]);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('2', 291);
    });

    test('a lone mounted candidate is not accepted either', async () => {
        // The `< 2` shortcut used to return before any filtering, so a single mounted row was
        // bound outright. That is not a harmless miss: M$SYS_COLUMNS *does* answer for a mount,
        // so the panel fills a plausible column list — and `ATABLE` is table id 130 in both
        // MACHBASEDB and a mount of it, so nothing about the wrong bind looks wrong.
        renderBlock({ table: 'SYS.ATABLE', userName: 'SYS' }, [MOUNT_ROW]);

        await waitFor(() => expect(getTableInfo).not.toHaveBeenCalled());
        expect(getVirtualTableInfo).not.toHaveBeenCalled();
    });

    test('an exact qualified name never reaches the tie-break', async () => {
        renderBlock({ table: 'FACTORY_A.SYS.ATABLE', userName: 'SYS' }, [KEV_ROW, SYS_ROW, FACTORY_ROW]);

        await waitFor(() => expect(getTableInfo).toHaveBeenCalled());
        expect(getTableInfo).toHaveBeenCalledWith('2', 291);
    });
});
