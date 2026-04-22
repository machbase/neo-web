import { createTagAnalyzerPanelInfoFixture } from '../../TestData/PanelTestData';
import {
    createPanelInfoFromPersistedV200,
    createPanelInfoFromPersistedV201,
    createPersistedPanelInfo,
    createPersistedSeriesInfo,
} from './TazPanelInfoMapper';

describe('TazPanelInfoMapper', () => {
    it('creates a saved series shape with explicit 2.0.1 field names', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sSaveSeriesInfo = createPersistedSeriesInfo(sPanelInfo.data.tag_set[0]);

        expect(sSaveSeriesInfo).toEqual(
            expect.objectContaining({
                seriesKey: 'tag-1',
                tableName: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                useSecondaryAxis: false,
                useRollupTable: false,
                annotations: [],
                columnNames: expect.objectContaining({
                    nameColumn: 'NAME',
                    timeColumn: 'TIME',
                    valueColumn: 'VALUE',
                }),
            }),
        );
    });

    it('creates a saved panel shape with explicit 2.0.1 field names', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sSavePanelInfo = createPersistedPanelInfo(sPanelInfo);

        expect(sSavePanelInfo).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    panelKey: 'panel-1',
                    chartTitle: 'Panel One',
                }),
                data: expect.objectContaining({
                    useRawData: false,
                    rowLimit: 500,
                    intervalType: 'sec',
                    seriesList: [
                        expect.objectContaining({
                            seriesKey: 'tag-1',
                            tableName: 'TABLE_A',
                            annotations: [],
                        }),
                    ],
                }),
                time: expect.objectContaining({
                    rangeConfig: expect.objectContaining({
                        start: expect.any(Object),
                        end: expect.any(Object),
                    }),
                    useSavedTimeRange: false,
                }),
                useNormalizedValues: false,
                highlights: [],
            }),
        );
    });

    it('loads a persisted 2.0.0 panel into the runtime panel shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sLoadedPanelInfo = createPanelInfoFromPersistedV200({
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
            highlights: sPanelInfo.highlights,
        });

        expect(sLoadedPanelInfo).toEqual(sPanelInfo);
    });

    it('round-trips one runtime panel through the persisted 2.0.1 shape', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sPersistedPanelInfo = createPersistedPanelInfo(sPanelInfo);
        const sRoundTrippedPanelInfo = createPanelInfoFromPersistedV201(sPersistedPanelInfo);

        expect(sRoundTrippedPanelInfo).toEqual(sPanelInfo);
    });
});
