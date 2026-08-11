import { render, screen, fireEvent, within } from '@testing-library/react';
import CommonTable from './CommonTable';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

jest.mock('@/utils/ClipboardCopy', () => ({ ClipboardCopy: jest.fn() }));

describe('CommonTable row action visibility', () => {
    test('keeps edit and delete buttons when row action is hidden in editable table', () => {
        render(
            <CommonTable
                {...({
                    data: { columns: ['NAME'], rows: [['TAG_01']] },
                    editable: true,
                    hideRowAction: true,
                    onRowAction: jest.fn(),
                    onRowDelete: jest.fn(),
                    onSave: jest.fn(),
                } as any)}
            />
        );

        expect(screen.getAllByRole('button')).toHaveLength(2);
    });
});

describe('CommonTable column alignment by declared type', () => {
    const renderTable = () =>
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['NAME', 'TIME', 'BIN'],
                        types: ['string', 'datetime', 'binary'],
                        rows: [['b64', '2026-05-08 12:43:24', '0x6162636465']],
                    },
                } as any)}
            />
        );

    test('does not apply numeric-cell class to td of binary type column even when value parses as number', () => {
        renderTable();
        const binCell = screen.getByText('0x6162636465').closest('td');
        expect(binCell).not.toBeNull();
        expect(binCell?.className ?? '').not.toMatch(/numeric-cell/);
    });

    test('does not apply numeric-header class to th of binary type column', () => {
        renderTable();
        const binHeader = screen.getByText('BIN').closest('th');
        expect(binHeader).not.toBeNull();
        expect(binHeader?.className ?? '').not.toMatch(/numeric-header/);
    });

    test('keeps string column left-aligned (no numeric-cell)', () => {
        renderTable();
        const stringCell = screen.getByText('b64').closest('td');
        expect(stringCell?.className ?? '').not.toMatch(/numeric-cell/);
    });

    test('keeps datetime column left-aligned (no numeric-cell)', () => {
        renderTable();
        const datetimeCell = screen.getByText('2026-05-08 12:43:24').closest('td');
        expect(datetimeCell?.className ?? '').not.toMatch(/numeric-cell/);
    });

    test('matches size-qualified binary type such as "binary(32)"', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['BIN'],
                        types: ['binary(32)'],
                        rows: [['6162636465']],
                    },
                } as any)}
            />
        );
        const binCell = screen.getByText('6162636465').closest('td');
        const binHeader = screen.getByText('BIN').closest('th');
        expect(binCell?.className ?? '').not.toMatch(/numeric-cell/);
        expect(binHeader?.className ?? '').not.toMatch(/numeric-header/);
    });

    test('matches uppercase BINARY type', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['BIN'],
                        types: ['BINARY'],
                        rows: [['6162636465']],
                    },
                } as any)}
            />
        );
        const binCell = screen.getByText('6162636465').closest('td');
        expect(binCell?.className ?? '').not.toMatch(/numeric-cell/);
    });

    test('keeps string column left-aligned even when value parses as number (TO_HEX result)', () => {
        // Reproduces the SELECT TO_HEX(BIN) AS BIN ... case: declared type
        // comes back as 'string' but the value is a hex digit run that
        // isNumericValue would happily accept.
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['BIN'],
                        types: ['string'],
                        rows: [['6162636465']],
                    },
                } as any)}
            />
        );
        const cell = screen.getByText('6162636465').closest('td');
        const header = screen.getByText('BIN').closest('th');
        expect(cell?.className ?? '').not.toMatch(/numeric-cell/);
        expect(header?.className ?? '').not.toMatch(/numeric-header/);
    });

    test('right-aligns when declared type is a numeric type name (double)', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['VAL'],
                        types: ['double'],
                        rows: [[3.14]],
                    },
                } as any)}
            />
        );
        const cell = screen.getByText('3.14').closest('td');
        const header = screen.getByText('VAL').closest('th');
        expect(cell?.className ?? '').toMatch(/numeric-cell/);
        expect(header?.className ?? '').toMatch(/numeric-header/);
    });

    test('right-aligns when declared type is a numeric type code (8 = INTEGER)', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['N'],
                        types: [8],
                        rows: [[42]],
                    },
                } as any)}
            />
        );
        const cell = screen.getByText('42').closest('td');
        expect(cell?.className ?? '').toMatch(/numeric-cell/);
    });

    test('left-aligns when declared type is a non-numeric type code (5 = VARCHAR)', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['S'],
                        types: [5],
                        rows: [['12345']],
                    },
                } as any)}
            />
        );
        const cell = screen.getByText('12345').closest('td');
        expect(cell?.className ?? '').not.toMatch(/numeric-cell/);
    });
});

describe('CommonTable renderer cell alignment by declared type', () => {
    test('applies numeric-cell to renderer td when declared type is numeric (Rollup GAP case)', () => {
        // Reproduces the Rollup GAP misalignment: a custom renderer outputs
        // a formatted number, but the underlying column type is LONG so the
        // td should still get numeric-cell so header/cell alignment matches.
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['GAP'],
                        types: ['long'],
                        rows: [['{"sum":0,"arr":[]}']],
                    },
                    cellRenderers: [
                        {
                            column: 'GAP',
                            render: () => <span data-testid="gap-render">0</span>,
                        },
                    ],
                } as any)}
            />
        );
        const cell = screen.getByTestId('gap-render').closest('td');
        const header = screen.getByText('GAP').closest('th');
        expect(cell?.className ?? '').toMatch(/numeric-cell/);
        expect(header?.className ?? '').toMatch(/numeric-header/);
    });

    test('does NOT apply numeric-cell to renderer td when declared type is non-numeric', () => {
        render(
            <CommonTable
                {...({
                    data: {
                        columns: ['ROLLUP'],
                        types: ['varchar'],
                        rows: [['_HOME_ROLLUP_HOUR']],
                    },
                    cellRenderers: [
                        {
                            column: 'ROLLUP',
                            render: () => <span data-testid="rollup-render">_HOME_ROLLUP_HOUR</span>,
                        },
                    ],
                } as any)}
            />
        );
        const cell = screen.getByTestId('rollup-render').closest('td');
        expect(cell?.className ?? '').not.toMatch(/numeric-cell/);
    });
});

describe('CommonTable numeric alignment regression', () => {
    test('applies numeric-cell class when types is not provided and value is numeric', () => {
        render(
            <CommonTable
                {...({
                    data: { columns: ['N'], rows: [[123]] },
                } as any)}
            />
        );
        const numericCell = screen.getByText('123').closest('td');
        expect(numericCell).not.toBeNull();
        expect(numericCell?.className ?? '').toMatch(/numeric-cell/);
    });
});

describe('CommonTable copyableColumns opt-in cell copy', () => {
    beforeEach(() => {
        (ClipboardCopy as jest.Mock).mockClear();
    });

    const renderTable = (extraProps: Record<string, unknown> = {}) =>
        render(
            <CommonTable
                {...({
                    data: { columns: ['NAME', 'TYPE'], rows: [['TAG_01', 'VARCHAR']] },
                    ...extraProps,
                } as any)}
            />
        );

    test('renders a copy button only on cells of the named column (NAME), not other columns (TYPE)', () => {
        renderTable({ copyableColumns: ['NAME'] });

        const nameCell = screen.getByText('TAG_01').closest('td');
        const typeCell = screen.getByText('VARCHAR').closest('td');
        expect(nameCell).not.toBeNull();
        expect(typeCell).not.toBeNull();
        expect(within(nameCell as HTMLElement).queryByRole('button')).not.toBeNull();
        expect(within(typeCell as HTMLElement).queryByRole('button')).toBeNull();
    });

    test('copies the cell value via ClipboardCopy when the NAME copy button is clicked', () => {
        renderTable({ copyableColumns: ['NAME'] });

        const nameCell = screen.getByText('TAG_01').closest('td');
        const copyButton = within(nameCell as HTMLElement).getByRole('button');
        fireEvent.click(copyButton);

        expect(ClipboardCopy).toHaveBeenCalledTimes(1);
        expect(ClipboardCopy).toHaveBeenCalledWith('TAG_01');
    });

    test('renders no copy buttons when copyableColumns is omitted (regression)', () => {
        renderTable();

        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(ClipboardCopy).not.toHaveBeenCalled();
    });
});

describe('CommonTable NULL cells', () => {
    beforeEach(() => {
        (ClipboardCopy as jest.Mock).mockClear();
    });

    // `''` is a real empty value and `null` is a SQL NULL; the shell prints only the
    // latter as NULL, so the two must not collapse into the same blank cell.
    const renderTable = (extraProps: Record<string, unknown> = {}) =>
        render(
            <CommonTable
                {...({
                    data: { columns: ['NAME', 'VALUE', 'NOTE'], rows: [['TAG_01', null, '']] },
                    ...extraProps,
                } as any)}
            />
        );

    test('renders NULL for a null cell and leaves an empty-string cell blank', () => {
        renderTable();

        const cells = screen.getByText('TAG_01').closest('tr')?.querySelectorAll('td');
        expect(cells).toHaveLength(3);
        expect((cells as NodeListOf<HTMLTableCellElement>)[1].textContent).toBe('NULL');
        expect((cells as NodeListOf<HTMLTableCellElement>)[2].textContent).toBe('');
    });

    // A NULL has nothing to copy, but it does draw text — so the slot the button
    // would occupy has to stay held open or NULL falls out of line with the rest
    // of a right-aligned column.
    test('replaces the copy button on a NULL cell with a spacer of the same width', () => {
        const { container } = renderTable({ showCopyButton: true });

        const cells = screen.getByText('TAG_01').closest('tr')?.querySelectorAll('td') as NodeListOf<HTMLTableCellElement>;
        expect(within(cells[1]).queryByRole('button')).toBeNull();
        expect(cells[1].querySelector('[class*="copy-cell-spacer"]')).not.toBeNull();
        expect(container.querySelectorAll('[class*="copy-cell-spacer"]')).toHaveLength(1);
    });

    test('leaves an empty-string cell with neither a copy button nor a spacer (regression)', () => {
        renderTable({ showCopyButton: true });

        const cells = screen.getByText('TAG_01').closest('tr')?.querySelectorAll('td') as NodeListOf<HTMLTableCellElement>;
        expect(within(cells[2]).queryByRole('button')).toBeNull();
        expect(cells[2].querySelector('[class*="copy-cell-spacer"]')).toBeNull();
    });

    // CommonTable renders cells from three separate branches; the scroll/editable
    // one is a different code path from the plain body the tests above exercise.
    test('renders NULL in the scroll/editable body as well', () => {
        render(
            <CommonTable
                {...({
                    data: { columns: ['NAME', 'VALUE'], rows: [['TAG_01', null]] },
                    editable: true,
                    onSave: jest.fn(),
                } as any)}
            />
        );

        expect(screen.getByText('NULL')).not.toBeNull();
    });
});
