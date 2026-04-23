import {
    buildCreateChartSeed,
    buildDefaultRange,
    mergeSelectedTagsIntoTagSet,
} from './TagSelectionChartSetup';
import {
    createTagSelectionDraftListFixture,
    createTagSelectionSourceColumnsFixture,
} from '../../TestData/TagSelectionTestData';

describe('TagSelectionChartSetup', () => {
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
                    color: '#367FEB',
                    sourceColumns: createTagSelectionSourceColumnsFixture(),
                }),
            ],
            defaultRange: { min: 100, max: 200 },
        });
        expect(sSeed.tagSet[0]).not.toHaveProperty('colName');
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
                color: '#EB5757',
                sourceColumns: createTagSelectionSourceColumnsFixture(),
            }),
        ]);
        expect(sMerged[1]).not.toHaveProperty('colName');
    });
});
