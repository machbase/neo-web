import {
    buildCreateChartSeed,
    buildDefaultRange,
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
    getTagSelectionErrorMessage,
    mergeSelectedTagsIntoTagSet,
} from './TagSelectionHelpers';

describe('TagSelectionHelpers', () => {
    const selectedTags = [
        {
            key: 'tag-1',
            table: 'TABLE_A',
            tagName: 'temp_sensor',
            calculationMode: 'avg',
            alias: '',
            weight: 1,
            colName: { name: 'name_col', time: 'time_col', value: 'value_col' },
        },
    ] as any;

    describe('buildDefaultRange', () => {
        it('keeps a normal min/max range unchanged', () => {
            expect(buildDefaultRange(100, 200)).toEqual({ min: 100, max: 200 });
        });

        it('pads a zero-width range to keep the default visible', () => {
            expect(buildDefaultRange(100, 100)).toEqual({ min: 100, max: 110 });
        });
    });

    describe('selection helpers', () => {
        it('returns the expected validation message for empty or oversized selections', () => {
            expect(getTagSelectionErrorMessage(0, 12)).toBe('please select tag.');
            expect(getTagSelectionErrorMessage(13, 12)).toBe('The maximum number of tags in a chart is 12.');
            expect(getTagSelectionErrorMessage(5, 4)).toBe('The maximum number of tags in a chart is 4.');
            expect(getTagSelectionErrorMessage(2, 12)).toBeUndefined();
        });

        it('builds the selected-count label and warning color', () => {
            expect(buildTagSelectionCountLabel(2, 12)).toBe('Select: 2 / 12');
            expect(getTagSelectionCountColor(12, 12)).toBe('#ef6e6e');
            expect(getTagSelectionCountColor(2, 12)).toBe('inherit');
        });
    });

    describe('chart/tag-set shaping helpers', () => {
        it('builds the create-chart seed from explicit inputs', () => {
            expect(buildCreateChartSeed('Line', selectedTags, 100, 200)).toEqual({
                chartType: 'Line',
                tagSet: [
                    expect.objectContaining({
                        tagName: 'temp_sensor',
                        color: '#367FEB',
                    }),
                ],
                defaultRange: { min: 100, max: 200 },
            });
        });

        it('merges selected tags into an existing tag set', () => {
            const merged = mergeSelectedTagsIntoTagSet(
                [
                    {
                        key: 'existing-1',
                        table: 'TABLE_A',
                        tagName: 'existing_sensor',
                        calculationMode: 'avg',
                        alias: '',
                        weight: 1,
                        color: '#367FEB',
                    },
                ] as any,
                selectedTags,
            );

            expect(merged).toEqual([
                expect.objectContaining({
                    tagName: 'existing_sensor',
                    color: '#367FEB',
                }),
                expect.objectContaining({
                    tagName: 'temp_sensor',
                    table: 'TABLE_A',
                    color: '#EB5757',
                }),
            ]);
        });
    });
});
