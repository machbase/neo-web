import {
    buildCreateChartSeed,
    buildDefaultRange,
    mergeSelectedTagsIntoTagSet,
} from './TagSelectionChartSetup';
import {
    createTagSelectionDraftFixture,
    createTagSelectionDraftListFixture,
} from '../../TestData/TagSelectionTestData';

describe('TagSelectionChartSetup', () => {
    it('keeps a normal min/max range unchanged', () => {
        expect(buildDefaultRange(100, 200)).toEqual({ min: 100, max: 200 });
    });

    it('pads a zero-width range to keep the default visible', () => {
        expect(buildDefaultRange(100, 100)).toEqual({ min: 100, max: 110 });
    });

    it('builds the create-chart seed from explicit inputs', () => {
        expect(
            buildCreateChartSeed('Line', createTagSelectionDraftListFixture(), 100, 200),
        ).toEqual({
            chartType: 'Line',
            tagSet: [
                expect.objectContaining({
                    sourceTagName: 'temp_sensor',
                    color: '#367FEB',
                }),
            ],
            defaultRange: { min: 100, max: 200 },
        });
    });

    it('merges selected tags into an existing tag set', () => {
        const sMerged = mergeSelectedTagsIntoTagSet(
            [
                createTagSelectionDraftFixture({
                    key: 'existing-1',
                    sourceTagName: 'existing_sensor',
                    color: '#367FEB',
                    colName: undefined,
                }),
            ] as any,
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
            }),
        ]);
    });
});
