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
