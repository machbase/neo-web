import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import { Block } from './Block';
import { getTableInfo, getVirtualTableInfo } from '@/api/repository/api';

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

const renderBlock = (blockOverrides: Record<string, any> = {}) => {
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
                pTableList={TABLE_LIST}
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
