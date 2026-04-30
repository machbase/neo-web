import {
    createTagAnalyzerBoardSourceInfoFixture,
} from '../../TestData/PanelTestData';
import { parseLoadedTaz, TAZ_FORMAT_VERSION } from '../load/parseLoadedTaz';
import { mapBoardToPersistedTaz } from './mapBoardToPersistedTaz';

describe('mapBoardToPersistedTaz', () => {
    it('serializes one normalized board into the latest persisted taz shape', () => {
        const sBoardInfo = parseLoadedTaz(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

        const sPersistedBoard = mapBoardToPersistedTaz({
            ...sBoardInfo,
            sheet: [{ id: 'worksheet-data' }],
            shell: { id: 'TAZ' },
            dashboard: { panels: [] },
            refreshKey: 'runtime-refresh-key',
            mode: 'runtime-mode',
        } as any);

        expect(sPersistedBoard).toMatchObject({
            id: 'runtime-board-id',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            boardTimeRange: {
                start: {
                    kind: 'now',
                    amount: 1,
                    unit: 'hour',
                },
                end: {
                    kind: 'now',
                    amount: 0,
                    unit: 'millisecond',
                },
            },
        });
        expect(Object.keys(sPersistedBoard).slice(0, 4)).toEqual([
            'id',
            'type',
            'version',
            'boardTimeRange',
        ]);
        expect(sPersistedBoard).not.toHaveProperty('name');
        expect(sPersistedBoard).not.toHaveProperty('path');
        expect(sPersistedBoard).not.toHaveProperty('code');
        expect(sPersistedBoard).not.toHaveProperty('savedCode');
        expect(sPersistedBoard).not.toHaveProperty('range_bgn');
        expect(sPersistedBoard).not.toHaveProperty('range_end');
        expect(sPersistedBoard).not.toHaveProperty('sheet');
        expect(sPersistedBoard).not.toHaveProperty('shell');
        expect(sPersistedBoard).not.toHaveProperty('dashboard');
        expect(sPersistedBoard).not.toHaveProperty('refreshKey');
        expect(sPersistedBoard).not.toHaveProperty('mode');
        expect(sPersistedBoard.panels).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
            }),
        ]);
    });
});
