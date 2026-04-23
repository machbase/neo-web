import { createTagAnalyzerPanelInfoFixture } from '../../../TestData/PanelTestData';
import {
    createPersistedPanelInfo,
    createPersistedSeriesInfo,
} from './TazPanelSaveMapper';

describe('TazPanelSaveMapper', () => {
    it('creates a saved series shape with explicit 2.0.4 field names', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);

        const sSaveSeriesInfo = createPersistedSeriesInfo(sPanelInfo.data.tag_set[0], 0);

        expect(sSaveSeriesInfo).toEqual(
            expect.objectContaining({
                seriesKey: 'tag-1',
                tableName: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                useSecondaryAxis: false,
                useRollupTable: false,
                annotations: [],
                sourceColumns: expect.objectContaining({
                    nameColumn: 'NAME',
                    timeColumn: 'TIME',
                    valueColumn: 'VALUE',
                }),
            }),
        );
    });

    it('persists the deterministic display color when a series has no stored color', () => {
        const sPanelInfo = createTagAnalyzerPanelInfoFixture(undefined);
        const sSeriesInfo = {
            ...sPanelInfo.data.tag_set[0],
            color: undefined,
        };

        const sSaveSeriesInfo = createPersistedSeriesInfo(sSeriesInfo, 0);

        expect(sSaveSeriesInfo.color).toBe('#367FEB');
    });

    it('creates a saved panel shape with explicit 2.0.4 field names', () => {
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
                axes: expect.objectContaining({
                    leftYAxis: expect.any(Object),
                    rightYAxis: expect.any(Object),
                }),
                useNormalizedValues: false,
                highlights: [],
            }),
        );
    });
});
