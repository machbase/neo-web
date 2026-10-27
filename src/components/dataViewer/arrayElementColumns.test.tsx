// issue #1570 F-131 — two selected elements drew a 560px table (TIME 220 + 170 each) into a 461px
// grid, so the second element's column sat outside it. The element columns now share the grid.
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArrayElementDetailModal, { arrayColumnWidth } from './ArrayElementDetailModal';
import { queryTagArrayElementData } from './dataViewerApi';

jest.mock('./TagEChart', () => ({ __esModule: true, default: () => <div data-testid="chart" /> }));
jest.mock('./dataViewerApi', () => ({
    __esModule: true,
    queryTagArrayElementData: jest.fn(),
    queryTagArrayBoundaryRange: jest.fn(async () => ({})),
}));

describe('arrayColumnWidth', () => {
    it.each([
        [461, 1, 170],
        [461, 2, 120],
        [461, 3, 96],
        [900, 2, 170],
        [0, 2, 170],
    ])('grid %ipx, %i elements → %ipx', (aGrid, aCount, aWidth) => {
        expect(arrayColumnWidth(aGrid, aCount)).toBe(aWidth);
    });
});

describe('ArrayElementDetailModal grid', () => {
    const sClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() {
                return (this as HTMLElement).classList?.contains('array-detail-grid') ? 461 : 0;
            },
        });
    });
    afterAll(() => {
        if (sClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', sClientWidth);
    });

    it('fits two elements inside a 461px grid', async () => {
        (queryTagArrayElementData as jest.Mock).mockResolvedValue({
            rows: [
                { base: '1700000000000000000', values: [1.5, 2.5] },
                { base: '1700000001000000000', values: [3.5, 4.5] },
            ],
            hasMore: false,
        });
        render(
            <ArrayElementDetailModal
                dbName="MACHBASEDB" userName="SYS" tableName="F_DB_ARR" tagName="a1" indexes={[0, 1]}
                metadata={{ dimension: 8, elementType: 'DOUBLE' } as any}
                tagColumn="NAME" timeColumn="TIME" valueColumn="VALUE" baseKind="time"
                formatBase={(v) => String(v)} timeFormat="ns" timeZone="UTC"
                onBack={jest.fn()} onClose={jest.fn()} onOpenTagAnalyzer={jest.fn()}
            />
        );
        await waitFor(() => expect(screen.getByText('VALUE[1]')).toBeInTheDocument());
        const sTable = screen.getByText('VALUE[1]').closest('table') as HTMLTableElement;
        await waitFor(() => expect(parseInt(sTable.style.width, 10)).toBeLessThanOrEqual(461));
        const sCols = Array.from(sTable.querySelectorAll('col')).map((c) => parseInt((c as HTMLElement).style.width, 10));
        expect(sCols).toEqual([220, 120, 120]);
    });
});
