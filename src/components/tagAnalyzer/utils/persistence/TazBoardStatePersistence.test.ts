import {
    createTagAnalyzerBoardSourceInfoFixture,
} from '../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from './TazBoardInfoParser';
import { createPersistedTazBoardInfo } from './TazBoardStatePersistence';
import { TAZ_FORMAT_VERSION } from './TazVersion';

describe('TazBoardStatePersistence', () => {
    it('serializes one normalized board into the latest persisted taz shape', () => {
        const sBoardInfo = parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

        const sPersistedBoard = createPersistedTazBoardInfo(sBoardInfo);

        expect(sPersistedBoard).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            range_bgn: 'now-1h',
            range_end: 'now',
        });
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
