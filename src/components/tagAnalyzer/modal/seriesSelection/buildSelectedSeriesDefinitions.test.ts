import { mergeSelectedTagsIntoTagSet } from './buildSelectedSeriesDefinitions';
import {
    createTagSelectionDraftListFixture,
    createTagSelectionSourceColumnsFixture,
} from '../../TestData/TagSelectionTestData';

describe('buildSelectedSeriesDefinitions', () => {
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
                key: 'tag-1',
                sourceTagName: 'temp_sensor',
                table: 'TABLE_A',
                alias: '',
                calculationMode: 'avg',
                color: undefined,
                useSecondaryAxis: false,
                useRollupTable: false,
                annotations: [],
                sourceColumns: createTagSelectionSourceColumnsFixture(),
            }),
        ]);
        expect(sMerged[1]).not.toHaveProperty('colName');
        expect(sMerged[1]).not.toHaveProperty('use_y2');
        expect(sMerged[1]).not.toHaveProperty('min');
        expect(sMerged[1]).not.toHaveProperty('max');
    });
});
