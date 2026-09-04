import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { tableMetadataApi } from '../../api/tableMetadataApi';
import {
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
} from '../../seriesModel';
import { PanelSeriesEditor } from './PanelSeriesEditor';

const SERIES: PanelSeriesDefinition = {
    key: 'series-1',
    table: 'TAG',
    sourceTagName: 'TAG_A',
    alias: 'Tag A',
    calculationMode: PanelSeriesCalculationMode.Average,
    useSecondaryAxis: false,
    id: undefined,
    useRollupTable: false,
    sourceColumns: {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        timeBaseTime: false,
    },
};
const NUMERIC_SERIES: PanelSeriesDefinition = {
    ...SERIES,
    key: 'numeric-series',
    sourceColumns: {
        ...SERIES.sourceColumns,
        timeBaseTime: true,
        timeType: 4,
    },
};

describe('PanelSeriesEditor', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('updates a selected series calculation mode', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([]);
        const onSeriesListChange = jest.fn();

        render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        expect(screen.getByLabelText('Table')).toHaveRole('combobox');
        await waitFor(() =>
            expect(tableMetadataApi.fetchTableNames).toHaveBeenCalledTimes(1),
        );
        fireEvent.click(screen.getByRole('button', { name: 'AVG' }));
        fireEvent.click(screen.getByRole('option', { name: 'SUM' }));

        expect(onSeriesListChange).toHaveBeenCalledWith([
            {
                ...SERIES,
                calculationMode: PanelSeriesCalculationMode.Sum,
            },
        ]);
    });

    it('allows clearing a locked list but blocks selecting another x-axis kind', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([]);
        const onFooterMessageChange = jest.fn();
        const onSeriesListChange = jest.fn();

        const view = render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={onFooterMessageChange}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        await waitFor(() =>
            expect(tableMetadataApi.fetchTableNames).toHaveBeenCalledTimes(1),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
        expect(onSeriesListChange).toHaveBeenCalledWith([]);

        view.rerender(
            <PanelSeriesEditor
                seriesList={[NUMERIC_SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={onFooterMessageChange}
                onSeriesListChange={onSeriesListChange}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'AVG' }));
        fireEvent.click(screen.getByRole('option', { name: 'SUM' }));

        expect(onSeriesListChange).toHaveBeenCalledTimes(1);
        expect(onFooterMessageChange).toHaveBeenLastCalledWith(
            'The panel x-axis type cannot be changed.',
        );
    });

    it('selects the first user and table when the database changes', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.SYS_FIRST',
            'FACTORY_A.USER_A.A_FIRST',
            'FACTORY_A.USER_A.A_SECOND',
            'FACTORY_A.USER_B.B_FIRST',
            'FACTORY_A.USER_B.B_SECOND',
        ]);
        const fetchColumns = jest
            .spyOn(tableMetadataApi, 'fetchTableColumns')
            .mockImplementation(async (tableName) => {
                const owner = tableName.split('.')[1];
                return [
                    { name: `NAME_${owner}`, type: 5, flag: 0 },
                    {
                        name: `TIME_${owner}`,
                        type: 6,
                        flag: 0x01000000,
                    },
                    { name: `VALUE_${owner}`, type: 20, flag: 0 },
                ];
            });

        render(
            <PanelSeriesEditor
                seriesList={[]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={jest.fn()}
            />,
        );

        const sourceLocation = screen.getByRole('group', {
            name: 'Source location',
        });
        const sourceFields = screen.getByRole('group', {
            name: 'Source fields',
        });
        const database = within(sourceLocation).getByLabelText('Database');
        const user = within(sourceLocation).getByLabelText('User');
        const table = within(sourceLocation).getByLabelText('Table');
        const time = within(sourceFields).getByLabelText('Time');
        const value = within(sourceFields).getByLabelText('Value');

        expect(user).toHaveRole('combobox');
        await waitFor(() => expect(database).toHaveValue('MACHBASEDB'));
        await waitFor(() => expect(table).toHaveValue('SYS_FIRST'));
        expect(user).toHaveValue('SYS');
        expect(time).toHaveValue('TIME_SYS (DateTime)');
        expect(value).toHaveValue('VALUE_SYS (No Rollup)');

        fireEvent.focus(database);
        fireEvent.change(database, { target: { value: 'FACTORY_A' } });
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-database-option-FACTORY_A',
            ),
        );
        await waitFor(() => expect(user).toHaveValue('USER_A'));
        await waitFor(() => expect(table).toHaveValue('A_FIRST'));
        expect(fetchColumns).toHaveBeenLastCalledWith(
            'FACTORY_A.USER_A.A_FIRST',
        );
        await waitFor(() => {
            expect(time).toHaveValue('TIME_USER_A (DateTime)');
            expect(value).toHaveValue('VALUE_USER_A (No Rollup)');
        });

        fireEvent.focus(user);
        expect(
            await screen.findByTestId('tag-analyzer-user-option-USER_A'),
        ).toBeInTheDocument();
        fireEvent.click(
            screen.getByTestId('tag-analyzer-user-option-USER_B'),
        );

        await waitFor(() => expect(user).toHaveValue('USER_B'));
        await waitFor(() => expect(table).toHaveValue('B_FIRST'));
        expect(table).toBeEnabled();
        expect(fetchColumns).toHaveBeenLastCalledWith(
            'FACTORY_A.USER_B.B_FIRST',
        );
        await waitFor(() => {
            expect(time).toHaveValue('TIME_USER_B (DateTime)');
            expect(value).toHaveValue('VALUE_USER_B (No Rollup)');
        });

        fireEvent.change(user, { target: { value: 'USER_A' } });
        fireEvent.click(
            await screen.findByTestId('tag-analyzer-user-option-USER_A'),
        );
        await waitFor(() => expect(table).toHaveValue('A_FIRST'));
        expect(fetchColumns).toHaveBeenLastCalledWith(
            'FACTORY_A.USER_A.A_FIRST',
        );
        await waitFor(() => {
            expect(time).toHaveValue('TIME_USER_A (DateTime)');
            expect(value).toHaveValue('VALUE_USER_A (No Rollup)');
        });

        fireEvent.focus(table);
        expect(
            await screen.findByTestId(
                'tag-analyzer-table-option-FACTORY_A.USER_A.A_FIRST',
            ),
        ).toHaveTextContent('A_FIRST');
        expect(
            screen.getByTestId(
                'tag-analyzer-table-option-FACTORY_A.USER_A.A_SECOND',
            ),
        ).toHaveTextContent('A_SECOND');
        expect(
            screen.queryByTestId(
                'tag-analyzer-table-option-FACTORY_A.USER_B.B_FIRST',
            ),
        ).not.toBeInTheDocument();
    });

    it('offers tables from every database, mounted backups included', async () => {
        // The picker used to be fed by `GET /api/tables`, which measured against a v8.7 server
        // returns only the session database — so another database's tables, and a mounted backup's,
        // were not merely hard to tell apart, they were absent. `fetchTableNames` now reads the same
        // catalogue query the dashboard uses; this pins that the whole list reaches the field and
        // that picking a row keeps the database it names.
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.ATABLE',
            'FACTORY_A.SYS.ATABLE',
            'EEEEE.SYS.ATABLE',
        ]);
        jest.spyOn(tableMetadataApi, 'fetchTableColumns').mockResolvedValue([]);

        render(
            <PanelSeriesEditor
                seriesList={[]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={jest.fn()}
            />,
        );

        const database = await screen.findByLabelText('Database');
        const user = screen.getByLabelText('User');
        const table = screen.getByLabelText('Table');
        await waitFor(() => expect(database).toHaveValue('MACHBASEDB'));

        fireEvent.focus(database);
        fireEvent.change(database, { target: { value: 'EEEEE' } });
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-database-option-EEEEE',
            ),
        );
        await waitFor(() => expect(table).toHaveValue('ATABLE'));
        expect(user).toHaveValue('SYS');

        fireEvent.focus(table);
        expect(
            await screen.findByTestId(
                'tag-analyzer-table-option-EEEEE.SYS.ATABLE',
            ),
        ).toBeInTheDocument();
        expect(database).toHaveValue('EEEEE');
        expect(user).toHaveValue('SYS');
    });

    it('keeps the picked table when the list cannot account for it', async () => {
        // The behaviour replaced: anything the list did not contain verbatim was swapped for
        // `availableSourceTableNames[0]` without a word, so the next tag added went to a table the
        // user never chose. An empty list is the reachable form of that here — nothing to swap to,
        // and nothing should be swapped.
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([]);
        jest.spyOn(tableMetadataApi, 'fetchTableColumns').mockResolvedValue([]);
        const onSeriesListChange = jest.fn();

        render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        await waitFor(() =>
            expect(tableMetadataApi.fetchTableNames).toHaveBeenCalledTimes(1),
        );
        expect(await screen.findByRole('combobox', { name: /^Table/ })).toHaveValue('');
        expect(onSeriesListChange).not.toHaveBeenCalled();
    });

    it('does not add the same source series twice', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'TAG',
        ]);
        jest.spyOn(tableMetadataApi, 'fetchTableColumns').mockResolvedValue([
            { name: 'NAME', type: 5, flag: 0 },
            { name: 'TIME', type: 6, flag: 0x01000000 },
            { name: 'VALUE', type: 20, flag: 0 },
        ]);
        jest.spyOn(tableMetadataApi, 'fetchTags').mockResolvedValue({
            tags: ['TAG_A'],
            total: 1,
        });
        const onFooterMessageChange = jest.fn();
        const onSeriesListChange = jest.fn();

        render(
            <PanelSeriesEditor
                seriesList={[SERIES]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={onFooterMessageChange}
                onSeriesListChange={onSeriesListChange}
            />,
        );

        await waitFor(() =>
            expect(screen.getByLabelText('Table')).toHaveValue('TAG'),
        );
        expect(screen.getByLabelText('User')).toBeDisabled();
        fireEvent.click(
            await screen.findByTestId('tag-analyzer-series-option-TAG_A'),
        );

        expect(onSeriesListChange).not.toHaveBeenCalled();
        expect(onFooterMessageChange).toHaveBeenLastCalledWith(
            'This series has already been added.',
        );
    });

    it('applies an explicit tag search after the initial tag load', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.TAG',
        ]);
        jest.spyOn(tableMetadataApi, 'fetchTableColumns').mockResolvedValue([
            { name: 'NAME', type: 5, flag: 0 },
            { name: 'TIME', type: 6, flag: 0x01000000 },
            { name: 'VALUE', type: 20, flag: 0 },
        ]);
        const fetchTags = jest
            .spyOn(tableMetadataApi, 'fetchTags')
            .mockImplementation(async (_table, _column, searchText) =>
                searchText
                    ? { tags: ['use'], total: 1 }
                    : { tags: ['barn'], total: 1 },
            );

        render(
            <PanelSeriesEditor
                seriesList={[]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={jest.fn()}
            />,
        );

        await waitFor(() =>
            expect(screen.getByLabelText('Table')).toHaveValue('TAG'),
        );
        await waitFor(() => expect(fetchTags).toHaveBeenCalledTimes(1));
        fireEvent.change(screen.getByLabelText('Tag'), {
            target: { value: 'use' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Search tags' }));

        expect(
            await screen.findByTestId('tag-analyzer-series-option-use'),
        ).toBeInTheDocument();

        await waitFor(() => expect(fetchTags).toHaveBeenCalledTimes(2));
        expect(fetchTags.mock.calls.map((call) => call[2])).toEqual([
            '',
            'use',
        ]);
        expect(
            screen.getByTestId('tag-analyzer-series-option-use'),
        ).toBeInTheDocument();
        expect(
            screen.queryByTestId('tag-analyzer-series-option-barn'),
        ).not.toBeInTheDocument();
    });

    it('reloads columns and tags when the current table is selected again', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.TAG',
        ]);
        const fetchColumns = jest
            .spyOn(tableMetadataApi, 'fetchTableColumns')
            .mockResolvedValue([
                { name: 'NAME', type: 5, flag: 0 },
                { name: 'TIME', type: 6, flag: 0x01000000 },
                { name: 'VALUE', type: 20, flag: 0 },
            ]);
        const fetchTags = jest
            .spyOn(tableMetadataApi, 'fetchTags')
            .mockResolvedValueOnce({ tags: ['TAG_OLD'], total: 1 })
            .mockResolvedValueOnce({ tags: ['TAG_NEW'], total: 1 });

        render(
            <PanelSeriesEditor
                seriesList={[]}
                rollupTableList={{}}
                lockedAxisKind="time"
                onFooterMessageChange={jest.fn()}
                onSeriesListChange={jest.fn()}
            />,
        );

        expect(
            await screen.findByTestId('tag-analyzer-series-option-TAG_OLD'),
        ).toBeInTheDocument();
        expect(fetchColumns).toHaveBeenCalledTimes(1);
        expect(fetchTags).toHaveBeenCalledTimes(1);

        fireEvent.focus(screen.getByLabelText('Table'));
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-table-option-MACHBASEDB.SYS.TAG',
            ),
        );

        expect(
            screen.queryByTestId('tag-analyzer-series-option-TAG_OLD'),
        ).not.toBeInTheDocument();
        expect(
            await screen.findByTestId('tag-analyzer-series-option-TAG_NEW'),
        ).toBeInTheDocument();
        expect(fetchColumns).toHaveBeenCalledTimes(2);
        expect(fetchTags).toHaveBeenCalledTimes(2);
    });
});
