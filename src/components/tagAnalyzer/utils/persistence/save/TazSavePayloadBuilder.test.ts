import { createTagAnalyzerBoardSourceInfoFixture } from '../../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from '../versionParsing/TazBoardVersionParser';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';
import {
    createTazSavePayloadFromBoardInfo,
} from './TazSavePayloadBuilder';

describe('TazSavePayloadBuilder', () => {
    const createRuntimeBoardInfo = () =>
        parseReceivedBoardInfo(
            createTagAnalyzerBoardSourceInfoFixture({
                id: 'runtime-board-id',
                name: 'runtime-board.taz',
                path: '/runtime/',
                type: 'taz',
            }),
        );

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
        expect(sSavePayload.panels).toEqual([
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
                highlights: [],
            }),
        ]);
    });
});
