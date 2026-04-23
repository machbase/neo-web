import {
    createTagAnalyzerBoardSourceInfoFixture,
} from '../../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from '../versionParsing/TazBoardVersionParser';
import { createPersistedTazBoardInfo } from './TazBoardSaveMapper';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';

describe('TazBoardSaveMapper', () => {
    it('serializes one normalized board into the latest persisted taz shape', () => {
        const sBoardInfo = parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

        const sPersistedBoard = createPersistedTazBoardInfo({
            ...sBoardInfo,
            sheet: [{ id: 'worksheet-data' }],
            shell: { id: 'TAZ' },
            dashboard: { panels: [] },
            refreshKey: 'runtime-refresh-key',
            mode: 'runtime-mode',
        });

        expect(sPersistedBoard).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            boardTimeRange: {
                start: 'now-1h',
                end: 'now',
            },
        });
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
