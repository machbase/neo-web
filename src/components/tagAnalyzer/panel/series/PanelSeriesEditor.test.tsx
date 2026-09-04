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

    it('selects database and table while displaying the table owner', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.ATABLE',
            'FACTORY_A.USER_A.ATABLE',
            'FACTORY_A.USER_B.ATABLE',
        ]);
        const fetchColumns = jest
            .spyOn(tableMetadataApi, 'fetchTableColumns')
            .mockResolvedValue([]);

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

        expect(user).toHaveAttribute('readonly');
        expect(within(sourceFields).getByLabelText('Time')).toBeInTheDocument();
        expect(within(sourceFields).getByLabelText('Value')).toBeInTheDocument();
        await waitFor(() => expect(database).toHaveValue('MACHBASEDB'));
        await waitFor(() => expect(table).toHaveValue('ATABLE'));
        expect(user).toHaveValue('SYS');

        fireEvent.focus(database);
        fireEvent.change(database, { target: { value: 'FACTORY_A' } });
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-database-option-FACTORY_A',
            ),
        );
        await waitFor(() => expect(table).toHaveValue(''));
        expect(user).toHaveValue('');
        expect(user).toHaveAttribute('placeholder', 'Select a table');

        fireEvent.focus(table);
        expect(
            await screen.findByTestId(
                'tag-analyzer-table-option-FACTORY_A.USER_A.ATABLE',
            ),
        ).toHaveTextContent('USER_A.ATABLE');
        fireEvent.click(
            screen.getByTestId(
                'tag-analyzer-table-option-FACTORY_A.USER_B.ATABLE',
            ),
        );

        await waitFor(() => expect(user).toHaveValue('USER_B'));
        expect(table).toHaveValue('USER_B.ATABLE');
        expect(fetchColumns).toHaveBeenLastCalledWith(
            'FACTORY_A.USER_B.ATABLE',
        );
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
        await waitFor(() => expect(table).toHaveValue(''));
        expect(user).toHaveValue('SYS');

        fireEvent.focus(table);
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-table-option-EEEEE.SYS.ATABLE',
            ),
        );

        await waitFor(() => expect(table).toHaveValue('ATABLE'));
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

    it('keeps tag results when the current table is selected again', async () => {
        jest.spyOn(tableMetadataApi, 'fetchTableNames').mockResolvedValue([
            'MACHBASEDB.SYS.TAG',
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
            await screen.findByTestId('tag-analyzer-series-option-TAG_A'),
        ).toBeInTheDocument();

        fireEvent.focus(screen.getByLabelText('Table'));
        fireEvent.click(
            await screen.findByTestId(
                'tag-analyzer-table-option-MACHBASEDB.SYS.TAG',
            ),
        );

        expect(
            screen.getByTestId('tag-analyzer-series-option-TAG_A'),
        ).toBeInTheDocument();
    });
});
