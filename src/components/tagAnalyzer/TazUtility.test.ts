import { createDefaultTazBoard } from './TazUtility';

describe('createDefaultTazBoard', () => {
    it('keeps numeric basetime source metadata and numeric panel range', () => {
        const board = createDefaultTazBoard({
            tag: 'tag_a',
            time: { min: 10, max: 20 },
            table: 'tag_table',
            sourceColumns: {
                name: 'NAME',
                time: 'ODOMETER_M',
                value: 'VALUE',
                timeType: 20,
                timeBaseTime: true,
            },
        });

        expect(board.boardTimeRange).toEqual({ start: '', end: '' });
        expect(board.panels[0].time.rangeInput).toEqual({ start: '10', end: '20' });
        expect(board.panels[0].query.tagSet[0].sourceColumns).toEqual(
            expect.objectContaining({
                time: 'ODOMETER_M',
                timeType: 20,
                timeBaseTime: true,
            }),
        );
    });
});
