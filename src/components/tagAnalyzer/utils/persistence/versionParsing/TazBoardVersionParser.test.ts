import { createTagAnalyzerBoardSourceInfoFixture, createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import { parseReceivedBoardInfo } from './TazBoardVersionParser';
import { createPersistedPanelInfo } from '../save/TazPanelSaveMapper';

describe('TazBoardVersionParser', () => {
    it('parses a legacy board into the runtime board model', () => {
        const sLegacyBoardInfo = createTagAnalyzerBoardSourceInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo(sLegacyBoardInfo);

        expect(sParsedBoardInfo.panels[0]).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    index_key: 'panel-1',
                    chart_title: 'Panel One',
                }),
                highlights: [],
            }),
        );
        expect(sParsedBoardInfo.panels[0].data.tag_set[0].annotations).toEqual([]);
    });

    it('parses a 2.0.0 board into the runtime board model', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo({
            ...createTagAnalyzerBoardSourceInfoFixture({
                panels: [
                    {
                        meta: {
                            index_key: sPanelInfo.meta.index_key,
                            chart_title: sPanelInfo.meta.chart_title,
                        },
                        data: {
                            tag_set: sPanelInfo.data.tag_set,
                            raw_keeper: sPanelInfo.data.raw_keeper,
                            count: sPanelInfo.data.count,
                            interval_type: sPanelInfo.data.interval_type,
                        },
                        time: sPanelInfo.time,
                        axes: sPanelInfo.axes,
                        display: sPanelInfo.display,
                        use_normalize: sPanelInfo.use_normalize,
                    },
                ],
                version: '2.0.0',
            }),
        });

        expect(sParsedBoardInfo.panels[0]).toEqual(sPanelInfo);
    });

    it('parses a 2.0.1 board into the runtime board model', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sParsedBoardInfo = parseReceivedBoardInfo({
            ...createTagAnalyzerBoardSourceInfoFixture({
                panels: [createPersistedPanelInfo(sPanelInfo)],
                version: '2.0.1',
            }),
        });

        expect(sParsedBoardInfo.panels[0]).toEqual(sPanelInfo);
    });
});
