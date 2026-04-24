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
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            boardTimeRange: {
                start: {
                    kind: 'relative',
                    anchor: 'now',
                    amount: 1,
                    unit: 'h',
                    expression: 'now-1h',
                },
                end: {
                    kind: 'relative',
                    anchor: 'now',
                    amount: 0,
                    unit: undefined,
                    expression: 'now',
                },
            },
        });
        expect(Object.keys(sSavePayload).slice(0, 4)).toEqual([
            'id',
            'type',
            'version',
            'boardTimeRange',
        ]);
        expect(sSavePayload).not.toHaveProperty('name');
        expect(sSavePayload).not.toHaveProperty('path');
        expect(sSavePayload).not.toHaveProperty('code');
        expect(sSavePayload).not.toHaveProperty('savedCode');
        expect(sSavePayload).not.toHaveProperty('range');
        expect(sSavePayload).not.toHaveProperty('rangeConfig');
        expect(sSavePayload).not.toHaveProperty('range_bgn');
        expect(sSavePayload).not.toHaveProperty('range_end');
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
