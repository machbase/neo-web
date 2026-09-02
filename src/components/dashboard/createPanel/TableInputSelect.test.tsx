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
