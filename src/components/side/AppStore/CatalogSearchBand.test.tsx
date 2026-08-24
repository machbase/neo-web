import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { CatalogSearchBand } from './CatalogSearchBand';

// The band is controlled, and half of its behaviour is about what happens once a
// query EXISTS — so the tests drive it through a real state holder rather than a
// frozen prop that could never become non-empty.
const Harness = ({ initial = '', onEnter }: { initial?: string; onEnter?: () => void }) => {
    const [value, setValue] = useState(initial);
    return <CatalogSearchBand pValue={value} onChange={setValue} onEnter={onEnter} />;
};

const band = () => document.querySelector('.catalog-search-band') as HTMLElement;
const isOpen = () => band().classList.contains('catalog-search-band--open');

describe('CatalogSearchBand', () => {
    test('starts as a label, not an input — that is the vertical space it exists to save', () => {
        render(<Harness />);

        expect(screen.getByText('Search')).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('hovering expands it to an input', () => {
        render(<Harness />);

        fireEvent.mouseEnter(band());

        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(isOpen()).toBe(true);
    });

    test('hovering does NOT take focus — a mouse crossing the panel must not capture the next keystroke', () => {
        render(<Harness />);

        fireEvent.mouseEnter(band());

        expect(screen.getByRole('textbox')).not.toHaveFocus();
    });

    test('clicking expands AND focuses, because clicking it is a request to type', () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole('button', { name: 'Search packages' }));

        expect(screen.getByRole('textbox')).toHaveFocus();
    });

    test('typing reports every keystroke up, so the list filters live', () => {
        const onChange = jest.fn();
        render(<CatalogSearchBand pValue="" onChange={onChange} />);
        fireEvent.mouseEnter(band());

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'opc' } });

        expect(onChange).toHaveBeenCalledWith('opc');
    });

    test('blurring an EMPTY field folds the band back up', () => {
        render(<Harness />);
        fireEvent.mouseEnter(band());

        fireEvent.blur(screen.getByRole('textbox'));

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
    });

    test('blurring with a query in it stays open — hiding the filter would leave the short list unexplained', () => {
        render(<Harness initial="opc" />);

        fireEvent.blur(screen.getByRole('textbox'));

        expect(screen.getByRole('textbox')).toHaveValue('opc');
        expect(isOpen()).toBe(true);
    });

    test('a query pins the band open before anyone hovers it', () => {
        render(<Harness initial="opc" />);

        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('the pointer leaving an empty, unfocused band folds it up', () => {
        render(<Harness />);
        fireEvent.mouseEnter(band());

        fireEvent.mouseLeave(band());

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('the pointer leaving while the field is focused leaves it open — the user is still typing', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Search packages' }));

        fireEvent.mouseLeave(band());

        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('Enter asks the panel to search now rather than waiting out the debounce', () => {
        const onEnter = jest.fn();
        render(<Harness initial="opc" onEnter={onEnter} />);

        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

        expect(onEnter).toHaveBeenCalled();
    });

    test('Escape clears the query and folds the band in one press', () => {
        render(<Harness initial="opc" />);

        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
    });
});
