import { createTagAnalyzerPanelInfoFixture } from '../../TestData/PanelTestData';
import {
    createPanelInfoFromMapped,
    createPanelInfoMapped,
    createSavePanelInfo,
    createSaveSeriesInfo,
} from './SavePanelInfo';

describe('SavePanelInfo', () => {
    it('creates a saved series shape with an explicit annotation list', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sSaveSeriesInfo = createSaveSeriesInfo(sPanelInfo.data.tag_set[0]);

        expect(sSaveSeriesInfo).toEqual(
            expect.objectContaining({
                key: 'tag-1',
                table: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                annotations: [],
            }),
        );
    });

    it('creates a saved panel shape with panel-level highlights and series-level annotations', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sSavePanelInfo = createSavePanelInfo(sPanelInfo);

        expect(sSavePanelInfo).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    index_key: 'panel-1',
                    chart_title: 'Panel One',
                }),
                highlights: [],
                data: expect.objectContaining({
                    raw_keeper: false,
                    count: 500,
                    interval_type: 'sec',
                    tag_set: [
                        expect.objectContaining({
                            key: 'tag-1',
                            table: 'TABLE_A',
                            annotations: [],
                        }),
                    ],
                }),
            }),
        );
    });

    it('round-trips one runtime panel through the mapped save shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sMappedPanelInfo = createPanelInfoMapped(sPanelInfo);
        const sRoundTrippedPanelInfo = createPanelInfoFromMapped(sMappedPanelInfo);

        expect(sRoundTrippedPanelInfo).toEqual(sPanelInfo);
    });
});
