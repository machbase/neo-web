/**
 * The public board's TQL result table cell menu (F-136): the value as it is, surrounding spaces included, and a
 * cell of spaces only still opens the menu — as the cell's own copy button does.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Table } from './Table';
import { ClipboardCopy } from '../../utils/ClipboardCopy';

jest.mock('../../utils/ClipboardCopy', () => ({ ClipboardCopy: jest.fn() }));

const rightClick = (aValue: string) => {
    render(<Table headers={['V']} items={[[aValue]]} />);
    const sCell = Array.from(document.querySelectorAll('td')).find((td) => td.textContent === aValue);
    fireEvent.contextMenu(sCell!);
};

describe('public board TQL result table cell menu', () => {
    beforeEach(() => (ClipboardCopy as jest.Mock).mockClear());

    it.each(['  padded  ', '   ', 'plain'])('Copy puts %p on the clipboard', (aValue) => {
        rightClick(aValue);
        fireEvent.click(screen.getByText('Copy'));
        expect(ClipboardCopy).toHaveBeenCalledWith(aValue);
    });
    it('Show full contents shows the surrounding spaces', () => {
        rightClick('  padded  ');
        fireEvent.click(screen.getByText('Show full contents'));
        expect(document.querySelector('.show-content-modal-body span')?.textContent).toBe('  padded  ');
    });
});
