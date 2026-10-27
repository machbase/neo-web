import { fireEvent, render, screen, within } from '@testing-library/react';
import { HierarchicalCombobox, type HierarchicalComboboxCategory } from './index';

const UNITS: HierarchicalComboboxCategory[] = [
    {
        id: 'temperature',
        label: 'Temperature',
        items: [
            { id: 'celsius', label: 'Celsius (°C)' },
            { id: 'fahrenheit', label: 'Fahrenheit (°F)' },
        ],
    },
];

const Unit = ({ pValue, pOnChange = () => {} }: { pValue: string; pOnChange?: (aValue: string) => void }) => (
    <HierarchicalCombobox.Root label="Unit" value={pValue} categories={UNITS} onChange={pOnChange}>
        <HierarchicalCombobox.Input />
        <HierarchicalCombobox.Menu>
            <HierarchicalCombobox.List emptyMessage="No units available" />
        </HierarchicalCombobox.Menu>
    </HierarchicalCombobox.Root>
);

const field = () => screen.getByRole('textbox');
const hoverField = () => fireEvent.mouseEnter(field().parentElement as HTMLElement);
const checkedItems = () => document.querySelectorAll('[class*="hierarchical-combobox__item--selected"]');

// F-61: a new panel's chart type change resets the tooltip unit to '' in the panel; the field kept
// showing the old unit (text, check mark, clear button) though '' was what got saved.
describe('HierarchicalCombobox follows the value it is given (F-61)', () => {
    it('empties the field when the parent resets the value to ""', () => {
        const { rerender } = render(<Unit pValue="celsius" />);
        expect(field()).toHaveValue('Celsius (°C)');

        rerender(<Unit pValue="" />);
        expect(field()).toHaveValue('');
        hoverField();
        expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
        fireEvent.focus(field());
        expect(checkedItems()).toHaveLength(0);
    });

    it('shows and checks a different unit the parent switches to', () => {
        const { rerender } = render(<Unit pValue="celsius" />);

        rerender(<Unit pValue="fahrenheit" />);
        expect(field()).toHaveValue('Fahrenheit (°F)');
        fireEvent.focus(field());
        expect(checkedItems()).toHaveLength(1);
        expect(within(checkedItems()[0] as HTMLElement).getByText('Fahrenheit (°F)')).toBeInTheDocument();
    });

    it('still shows what the user picks', () => {
        const onChange = jest.fn();
        render(<Unit pValue="" pOnChange={onChange} />);

        fireEvent.focus(field());
        fireEvent.click(screen.getByText('Temperature'));
        fireEvent.click(screen.getByText('Celsius (°C)'));
        expect(onChange).toHaveBeenCalledWith('celsius', 'Celsius (°C)');
        expect(field()).toHaveValue('Celsius (°C)');
        hoverField();
        expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    });
});
