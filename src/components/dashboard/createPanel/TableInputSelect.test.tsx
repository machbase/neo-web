import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableInputSelect, tableSelectOptionOf } from './TableInputSelect';

const OPTIONS = [tableSelectOptionOf('MACHBASEDB.SYS.STOCK_HISTORY'), tableSelectOptionOf('FACTORY_A.SYS.STOCK_HISTORY')];

const renderField = (aValue: string, aHandlers: { onInputChange?: jest.Mock; onSelectChange?: jest.Mock } = {}) => {
    const sOnInputChange = aHandlers.onInputChange ?? jest.fn();
    const sOnSelectChange = aHandlers.onSelectChange ?? jest.fn();
    render(<TableInputSelect label="Table" options={OPTIONS} value={aValue} onInputChange={sOnInputChange} onSelectChange={sOnSelectChange} />);
    return { input: screen.getByRole('combobox') as HTMLInputElement, sOnInputChange, sOnSelectChange };
};

describe('TableInputSelect', () => {
    test('collapses a qualified name to the table name plus a database · owner line', () => {
        const { input } = renderField('MACHBASEDB.SYS.STOCK_HISTORY');

        expect(input).toHaveValue('STOCK_HISTORY');
        // Under the label, where it costs the field no height.
        expect(screen.getByText('Table').closest('label')).toHaveTextContent('MACHBASEDB · SYS');
        // The whole name stays one hover away even while collapsed.
        expect(input).toHaveAttribute('title', 'MACHBASEDB.SYS.STOCK_HISTORY');
    });

    test('expands to the full name on focus so an edit does not drop the database and owner', () => {
        const { input } = renderField('MACHBASEDB.SYS.STOCK_HISTORY');

        fireEvent.focus(input);
        expect(input).toHaveValue('MACHBASEDB.SYS.STOCK_HISTORY');

        fireEvent.blur(input);
        expect(input).toHaveValue('STOCK_HISTORY');
    });

    test('reports typed text verbatim, which is how a variable table is entered', () => {
        const sOnInputChange = jest.fn();
        const { input } = renderField('MACHBASEDB.SYS.STOCK_HISTORY', { onInputChange: sOnInputChange });

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '{{table}}' } });

        expect(sOnInputChange).toHaveBeenCalledWith('{{table}}');
    });

    test('leaves a value that matches no table alone, with no description line', () => {
        renderField('{{table}}');

        expect(screen.getByRole('combobox')).toHaveValue('{{table}}');
        expect(screen.getByText('Table').closest('label')).not.toHaveTextContent('MACHBASEDB');
    });

    test('tells same-named tables from different databases apart and selects by qualified name', () => {
        const sOnSelectChange = jest.fn();
        renderField('MACHBASEDB.SYS.STOCK_HISTORY', { onSelectChange: sOnSelectChange });

        fireEvent.click(screen.getByRole('button', { name: 'Toggle options' }));

        const sOptions = screen.getAllByRole('option');
        expect(sOptions).toHaveLength(2);
        expect(sOptions[0]).toHaveTextContent('STOCK_HISTORY');
        expect(sOptions[0]).toHaveTextContent('MACHBASEDB · SYS');
        expect(sOptions[1]).toHaveTextContent('FACTORY_A · SYS');

        fireEvent.click(sOptions[1]);
        expect(sOnSelectChange).toHaveBeenCalledWith('FACTORY_A.SYS.STOCK_HISTORY');
    });
});

describe('table type chip', () => {
    // The colours are DB Explorer's, so a table reads the same in the dropdown as in the tree.
    test.each([
        ['tag', 'TAG', 'rgb(92, 163, 220)'],
        ['log', 'LOG', 'rgb(252, 121, 118)'],
        ['view', 'VIEW', '#9C8FFF'],
        ['transaction', 'TRANSACTION', 'rgb(157, 196, 133)'],
    ])('%s carries its own chip', (aType, aLabel, aColor) => {
        expect(tableSelectOptionOf('MACHBASEDB.SYS.T', aType).badge).toEqual({ label: aLabel, color: aColor });
    });

    test('a name with no known type gets no chip rather than a meaningless one', () => {
        expect(tableSelectOptionOf('MACHBASEDB.SYS.T').badge).toBeUndefined();
        expect(tableSelectOptionOf('MACHBASEDB.SYS.T', '').badge).toBeUndefined();
    });

    test('the chip is rendered beside the option name', () => {
        render(
            <TableInputSelect
                label="Table"
                options={[tableSelectOptionOf('MACHBASEDB.SYS.ORDERS', 'transaction')]}
                value=""
                onInputChange={jest.fn()}
                onSelectChange={jest.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('option')).toHaveTextContent('ORDERS');
        expect(screen.getByText('TRANSACTION')).toBeInTheDocument();
    });
});

describe('searching the table list', () => {
    const MANY = [
        tableSelectOptionOf('MACHBASEDB.SYS.DEMO_TAG', 'tag'),
        tableSelectOptionOf('FACTORY_A.SYS.DEMO_TAG', 'tag'),
        tableSelectOptionOf('MACHBASEDB.SYS.ORDERS', 'transaction'),
    ];
    const openMenu = () => {
        render(<TableInputSelect label="Table" options={MANY} value="" onInputChange={jest.fn()} onSelectChange={jest.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        return screen.getByPlaceholderText('Search tables...');
    };

    test('the list starts whole', () => {
        openMenu();
        expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    test('typing narrows it by table name', () => {
        fireEvent.change(openMenu(), { target: { value: 'orders' } });

        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('ORDERS');
    });

    // The name is split across two lines, so the database has to be searchable or it is untypeable.
    test('and by the database it lives in', () => {
        fireEvent.change(openMenu(), { target: { value: 'factory_a' } });

        expect(screen.getAllByRole('option')).toHaveLength(1);
        expect(screen.getByText('FACTORY_A · SYS')).toBeInTheDocument();
    });

    test('a query that matches nothing says so instead of showing an empty menu', () => {
        fireEvent.change(openMenu(), { target: { value: 'zzzz' } });

        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.getByText('No match')).toBeInTheDocument();
    });

    test('the query does not survive the menu closing', () => {
        const search = openMenu();
        fireEvent.change(search, { target: { value: 'orders' } });
        expect(screen.getAllByRole('option')).toHaveLength(1);

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByPlaceholderText('Search tables...')).toHaveValue('');
        expect(screen.getAllByRole('option')).toHaveLength(3);
    });
});
