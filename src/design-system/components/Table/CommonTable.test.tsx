import { render, screen } from '@testing-library/react';
import CommonTable from './CommonTable';

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
