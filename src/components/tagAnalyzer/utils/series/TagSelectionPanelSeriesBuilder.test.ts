import {
    buildCreateChartPanel,
    buildCreateChartSeed,
    buildDefaultRange,
    mergeSelectedTagsIntoTagSet,
} from './TagSelectionPanelSeriesBuilder';
import {
    createTagSelectionDraftListFixture,
    createTagSelectionSourceColumnsFixture,
} from '../../TestData/TagSelectionTestData';
import { isPersistedPanelInfoV200 } from '../persistence/versionParsing/TazPanelVersionParser';

describe('TagSelectionPanelSeriesBuilder', () => {
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
                    sourceTagName: 'temp_sensor',
                    color: undefined,
                    sourceColumns: createTagSelectionSourceColumnsFixture(),
                }),
            ],
            defaultRange: { min: 100, max: 200 },
        });
        expect(sSeed.tagSet[0]).not.toHaveProperty('colName');
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

    it('merges selected tags into an existing tag set', () => {
        const sMerged = mergeSelectedTagsIntoTagSet(
            [
                {
                    key: 'existing-1',
                    table: 'TABLE_A',
                    sourceTagName: 'existing_sensor',
                    alias: '',
                    calculationMode: 'avg',
                    color: '#367FEB',
                    useSecondaryAxis: false,
                    id: undefined,
                    useRollupTable: false,
                    sourceColumns: createTagSelectionSourceColumnsFixture(),
                    annotations: [],
                },
            ],
            createTagSelectionDraftListFixture(),
        );

        expect(sMerged).toEqual([
            expect.objectContaining({
                sourceTagName: 'existing_sensor',
                color: '#367FEB',
            }),
            expect.objectContaining({
                sourceTagName: 'temp_sensor',
                table: 'TABLE_A',
                color: undefined,
                sourceColumns: createTagSelectionSourceColumnsFixture(),
            }),
        ]);
        expect(sMerged[1]).not.toHaveProperty('colName');
    });
});
