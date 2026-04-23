import { createTagAnalyzerBoardSourceInfoFixture } from '../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from './TazBoardInfoParser';
import { TAZ_FORMAT_VERSION } from './TazVersion';
import {
    createSaveTazBoardInfo,
    createTazSavePayloadFromBoardInfo,
} from './TazFilePersistence';

describe('TazFilePersistence', () => {
    const createRuntimeBoardInfo = () =>
        parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

    it('creates a saved taz board shape directly from runtime BoardInfo', () => {
        const sBoardInfo = createRuntimeBoardInfo();

        const sSaveBoardInfo = createSaveTazBoardInfo(sBoardInfo);

        expect(sSaveBoardInfo).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            range_bgn: 'now-1h',
            range_end: 'now',
        });
        expect(sSaveBoardInfo.panels).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
                highlights: [],
            }),
        ]);
    });

    it('creates a taz save payload directly from runtime BoardInfo without transient fields', () => {
        const sBoardInfo = createRuntimeBoardInfo();

        const sSavePayload = createTazSavePayloadFromBoardInfo(sBoardInfo);

        expect(sSavePayload).toMatchObject({
            id: 'runtime-board-id',
            name: 'runtime-board.taz',
            path: '/runtime/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            code: '',
            savedCode: '',
            range_bgn: 'now-1h',
            range_end: 'now',
        });
    });
});
