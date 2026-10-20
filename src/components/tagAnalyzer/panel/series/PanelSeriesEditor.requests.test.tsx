import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { tableMetadataApi } from '../../api/tableMetadataApi';
import { PanelSeriesEditor } from './PanelSeriesEditor';

const TABLE_A = 'MACHBASEDB.SYS.TAG_A';
const TABLE_B = 'MACHBASEDB.SYS.TAG_B';
const COLUMNS = [
    { name: 'NAME', type: 5, flag: 0 },
    { name: 'TIME', type: 6, flag: 0x01000000 },
    { name: 'VALUE', type: 20, flag: 0 },
];

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
}

function renderEditor() {
    return render(
        <PanelSeriesEditor
            seriesList={[]}
            rollupTableList={{}}
            onFooterMessageChange={jest.fn()}
            onSeriesListChange={jest.fn()}
        />,
    );
}

async function selectTable(table: string) {
    fireEvent.focus(screen.getByLabelText('Table'));
    fireEvent.click(await screen.findByTestId(`tag-analyzer-table-option-${table}`));
}

describe('PanelSeriesEditor requests', () => {
    beforeEach(() => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([TABLE_A, TABLE_B]);
        jest.spyOn(tableMetadataApi, 'fetchTableColumns').mockResolvedValue(COLUMNS);
        jest.spyOn(tableMetadataApi, 'fetchTags').mockResolvedValue({ tags: [], total: 0 });
    });

    afterEach(() => jest.restoreAllMocks());

    it('enables rollup for an added series when its selected value column has metadata', async () => {
        jest.mocked(tableMetadataApi.fetchTags).mockResolvedValue({ tags: ['ROLLUP_TAG'], total: 1 });
        const onSeriesListChange = jest.fn();
        render(
            <PanelSeriesEditor
                seriesList={[]}
                rollupTableList={{ SYS: { 'MACHBASEDB.TAG_A': {
                    VALUE: [{ intervalMs: 1_000, supportsFirstLast: false }],
                } } }}
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        fireEvent.click(await screen.findByTestId('tag-analyzer-series-option-ROLLUP_TAG'));

        expect(onSeriesListChange).toHaveBeenCalledWith([
            expect.objectContaining({
                table: TABLE_A,
                sourceTagName: 'ROLLUP_TAG',
                useRollupTable: true,
                sourceColumns: expect.objectContaining({ value: 'VALUE' }),
            }),
        ]);
    });

    it('ignores source columns that complete after another table is selected', async () => {
        const firstColumns = deferred<typeof COLUMNS>();
        jest.mocked(tableMetadataApi.fetchTableColumns).mockImplementation((table) =>
            table === TABLE_A ? firstColumns.promise : Promise.resolve(COLUMNS),
        );
        renderEditor();

        await waitFor(() => expect(tableMetadataApi.fetchTableColumns).toHaveBeenCalledWith(TABLE_A));
        await selectTable(TABLE_B);
        await waitFor(() => expect(screen.getByLabelText('Time')).toHaveValue('TIME (DateTime)'));

        await act(async () => firstColumns.resolve([
            COLUMNS[0], { ...COLUMNS[1], name: 'OLD_TIME' }, COLUMNS[2],
        ]));

        expect(screen.getByLabelText('Table')).toHaveValue('TAG_B');
        expect(screen.getByLabelText('Time')).toHaveValue('TIME (DateTime)');
        expect(tableMetadataApi.fetchTags).toHaveBeenCalledTimes(1);
        expect(tableMetadataApi.fetchTags).toHaveBeenLastCalledWith(TABLE_B, 'NAME', '', 1, 10);
    });

    it('ignores a previous tag response after another table is selected', async () => {
        const oldTags = deferred<{ tags: string[]; total: number }>();
        jest.mocked(tableMetadataApi.fetchTags).mockImplementation((table) =>
            table === TABLE_A ? oldTags.promise : Promise.resolve({ tags: ['NEW_TAG'], total: 1 }),
        );
        renderEditor();

        await waitFor(() => expect(tableMetadataApi.fetchTags).toHaveBeenCalledWith(TABLE_A, 'NAME', '', 1, 10));
        await selectTable(TABLE_B);
        expect(await screen.findByTestId('tag-analyzer-series-option-NEW_TAG')).toBeInTheDocument();
        await act(async () => oldTags.resolve({ tags: ['OLD_TAG'], total: 80 }));

        expect(screen.queryByTestId('tag-analyzer-series-option-OLD_TAG')).not.toBeInTheDocument();
        expect(screen.getByTestId('tag-analyzer-series-option-NEW_TAG')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });

    it('keeps the newest explicit search when requests finish out of order', async () => {
        const oldSearch = deferred<{ tags: string[]; total: number }>();
        jest.mocked(tableMetadataApi.fetchTags).mockImplementation((_table, _column, search) =>
            search === 'old' ? oldSearch.promise : Promise.resolve({ tags: [search || 'INITIAL'], total: 1 }),
        );
        renderEditor();
        await screen.findByTestId('tag-analyzer-series-option-INITIAL');

        fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'old' } });
        fireEvent.click(screen.getByRole('button', { name: 'Search tags' }));
        await waitFor(() => expect(tableMetadataApi.fetchTags).toHaveBeenLastCalledWith(TABLE_A, 'NAME', 'old', 1, 10));
        fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'new' } });
        fireEvent.keyDown(screen.getByLabelText('Tag'), { key: 'Enter' });
        await screen.findByTestId('tag-analyzer-series-option-new');
        await act(async () => oldSearch.resolve({ tags: ['old'], total: 20 }));

        expect(screen.queryByTestId('tag-analyzer-series-option-old')).not.toBeInTheDocument();
        expect(screen.getByTestId('tag-analyzer-series-option-new')).toBeInTheDocument();
    });

    it('loads the entered page through the custom page input', async () => {
        jest.mocked(tableMetadataApi.fetchTags).mockImplementation((_table, _column, _search, page) =>
            Promise.resolve({ tags: [`PAGE_${page}`], total: 30 }),
        );
        renderEditor();
        await screen.findByTestId('tag-analyzer-series-option-PAGE_1');

        const pageInput = screen.getByLabelText('Current page number');
        fireEvent.change(pageInput, { target: { value: '2' } });
        expect(tableMetadataApi.fetchTags).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(pageInput, { key: 'Enter' });

        await screen.findByTestId('tag-analyzer-series-option-PAGE_2');
        expect(tableMetadataApi.fetchTags).toHaveBeenLastCalledWith(TABLE_A, 'NAME', '', 2, 10);
        expect(pageInput).toHaveValue('2');
        expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    });

    it('reloads the last available page when a paginated result shrinks', async () => {
        jest.mocked(tableMetadataApi.fetchTags)
            .mockResolvedValueOnce({ tags: ['FIRST'], total: 30 })
            .mockResolvedValueOnce({ tags: [], total: 12 })
            .mockResolvedValueOnce({ tags: ['LAST'], total: 12 });
        renderEditor();
        await screen.findByTestId('tag-analyzer-series-option-FIRST');

        fireEvent.click(screen.getByRole('button', { name: 'Last page' }));
        await screen.findByTestId('tag-analyzer-series-option-LAST');

        expect(jest.mocked(tableMetadataApi.fetchTags).mock.calls.map((call) => call[3])).toEqual([1, 3, 2]);
        expect(screen.getByLabelText('Current page number')).toHaveValue('2');
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    });
});
