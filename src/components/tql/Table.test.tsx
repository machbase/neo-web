/**
 * "Show full contents" on a TQL result table cell (#1553).
 *
 * A cell holding JSON opens in an indented JSON view. A cell holding JSON nested too deeply to print
 * back used to throw while rendering and take the result area down with it; it now opens as the
 * cell's own text, with the JSON view button disabled.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Table } from './Table';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

jest.mock('@/utils/ClipboardCopy', () => ({ ClipboardCopy: jest.fn() }));

const openCell = (aCellText: string) => {
    render(<Table headers={['J']} items={[[aCellText]]} />);
    const sCell = Array.from(document.querySelectorAll('td')).find((td) => td.textContent?.trim() === aCellText);
    fireEvent.contextMenu(sCell!);
    fireEvent.click(screen.getByText('Show full contents'));
};

describe('TQL result table "Show full contents"', () => {
    it('opens a JSON cell in the indented JSON view', () => {
        openCell('{"a":[1]}');
        expect(screen.getByRole('button', { name: 'JSON format' })).toBeEnabled();
        expect(document.querySelector('pre')?.textContent).toBe(JSON.stringify({ a: [1] }, null, 4));
    });

    it('opens a JSON cell nested too deeply to print as the cell text, its JSON view disabled', () => {
        const sDeep = '['.repeat(8000) + ']'.repeat(8000);
        openCell(sDeep);
        expect(screen.getByText('Show content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'JSON format' })).toBeDisabled();
        expect(document.querySelector('pre')).toBeNull();
        expect(screen.getAllByText(sDeep).length).toBeGreaterThan(0);
    });
});

// F-136: the menu read the cell's text trimmed — '  padded  ' copied as 'padded', and a cell of spaces had no menu.
describe('TQL result table cell menu keeps the value as it is', () => {
    const rightClick = (aValue: string) => {
        render(<Table headers={['V']} items={[[aValue]]} />);
        const sCell = Array.from(document.querySelectorAll('td')).find((td) => td.textContent === aValue);
        fireEvent.contextMenu(sCell!);
    };
    beforeEach(() => (ClipboardCopy as jest.Mock).mockClear());

    it.each(['  padded  ', '   ', 'plain'])('Copy puts %p on the clipboard', (aValue) => {
        rightClick(aValue);
        fireEvent.click(screen.getByTestId('copy'));
        expect(ClipboardCopy).toHaveBeenCalledWith(aValue);
    });
    it('Show full contents shows the surrounding spaces', () => {
        rightClick('  padded  ');
        fireEvent.click(screen.getByText('Show full contents'));
        expect(screen.getByTestId('content').textContent).toBe('  padded  ');
    });
});
