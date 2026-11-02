/**
 * "Show full contents" on a SQL result cell (#1553).
 *
 * A cell holding JSON opens in an indented JSON view. A cell holding JSON nested too deeply to print
 * back used to throw while rendering and take the result area down with it; it now opens as the
 * cell's own text, with the JSON view button disabled.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RESULT from './result';

const openCell = (aCellText: string) => {
    render(
        <RESULT pDisplay="" pSqlResponseData={{ columns: ['J'], rows: [[aCellText]], types: ['string'] }} pShowRowNumber={false} onMoreResult={jest.fn()} />
    );
    const sCell = Array.from(document.querySelectorAll('td')).find((td) => td.textContent?.trim() === aCellText);
    fireEvent.contextMenu(sCell!);
    fireEvent.click(screen.getByText('Show full contents'));
};

describe('SQL result "Show full contents"', () => {
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
