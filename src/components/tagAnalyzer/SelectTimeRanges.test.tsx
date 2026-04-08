import { buildQuickSelectRows } from './SelectTimeRangesHelpers';

describe('SelectTimeRanges helpers', () => {
    it('builds keyed quick-select rows from the time-range groups', () => {
        expect(
            buildQuickSelectRows([
                [
                    { key: 1, name: '1h', value: ['now-1h', 'now'] },
                    { key: 2, name: '6h', value: ['now-6h', 'now'] },
                ],
                [{ key: 3, name: '1d', value: ['now-1d', 'now'] }],
            ]),
        ).toEqual([
            {
                key: 0,
                items: [
                    { key: 1, name: '1h', value: ['now-1h', 'now'] },
                    { key: 2, name: '6h', value: ['now-6h', 'now'] },
                ],
            },
            {
                key: 1,
                items: [{ key: 3, name: '1d', value: ['now-1d', 'now'] }],
            },
        ]);
    });
});
