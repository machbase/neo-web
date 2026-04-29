import {
    buildCreateChartPanel,
    buildCreateChartSeed,
    buildDefaultRange,
} from './CreateChartPanelBuilder';
import {
    createTagSelectionDraftListFixture,
    createTagSelectionSourceColumnsFixture,
} from '../../TestData/TagSelectionTestData';
import { isPersistedPanelInfoV200 } from '../../persistence/load/parseLoadedTaz';

describe('CreateChartPanelBuilder', () => {
    it('keeps a normal min/max range unchanged', () => {
        expect(buildDefaultRange(100, 200)).toEqual({ min: 100, max: 200 });
    });

    it('pads a zero-width range to keep the default visible', () => {
        expect(buildDefaultRange(100, 100)).toEqual({ min: 100, max: 110 });
    });

    it('builds the create-chart seed from explicit inputs', () => {
        const sSeed = buildCreateChartSeed(
            'Line',
            createTagSelectionDraftListFixture(),
            100,
            200,
        );

        expect(sSeed).toEqual({
            chartType: 'Line',
            tagSet: [
                expect.objectContaining({
                    key: 'tag-1',
                    sourceTagName: 'temp_sensor',
                    alias: '',
                    calculationMode: 'avg',
                    color: undefined,
                    useSecondaryAxis: false,
                    useRollupTable: false,
                    annotations: [],
                    sourceColumns: createTagSelectionSourceColumnsFixture(),
                }),
            ],
            defaultRange: { min: 100, max: 200 },
        });
        expect(sSeed.tagSet[0]).not.toHaveProperty('colName');
        expect(sSeed.tagSet[0]).not.toHaveProperty('use_y2');
        expect(sSeed.tagSet[0]).not.toHaveProperty('min');
        expect(sSeed.tagSet[0]).not.toHaveProperty('max');
    });

    it('builds the current persisted panel shape for new charts', () => {
        const sPanel = buildCreateChartPanel(
            'Zone',
            createTagSelectionDraftListFixture(),
            100,
            200,
        );

        expect(isPersistedPanelInfoV200(sPanel)).toBe(true);
        expect(sPanel).toEqual(
            expect.objectContaining({
                meta: expect.objectContaining({
                    chartTitle: 'New chart',
                }),
                data: expect.objectContaining({
                    intervalType: '',
                    rowLimit: -1,
                    seriesList: [
                        expect.objectContaining({
                            sourceTagName: 'temp_sensor',
                            sourceColumns: expect.objectContaining({
                                nameColumn: 'name_col',
                                timeColumn: 'time_col',
                                valueColumn: 'value_col',
                            }),
                        }),
                    ],
                }),
                toolbar: expect.objectContaining({
                    isRaw: false,
                }),
                time: {
                    rangeConfig: {
                        start: { kind: 'absolute', timestamp: 100 },
                        end: { kind: 'absolute', timestamp: 200 },
                    },
                },
                display: expect.objectContaining({
                    chartType: 'Zone',
                    showPoints: false,
                    fill: 0.15,
                    stroke: 1,
                }),
            }),
        );
    });
});
