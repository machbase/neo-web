import type {
    TagSearchItem,
    TagSelectionDraftItem,
    TagSelectionSourceColumns,
    UseTagSelectionStateOptions,
} from '../modal/seriesSelection/TagSelectionTypes';

type TagSelectionDraftOverrides = Partial<TagSelectionDraftItem> & {
    sourceColumns?: Partial<TagSelectionSourceColumns> | undefined;
};
export const createTagSelectionSourceColumnsFixture = (
    overrides: Partial<TagSelectionSourceColumns> = {},
): TagSelectionSourceColumns => ({
    name: 'name_col',
    time: 'time_col',
    value: 'value_col',
    ...overrides,
});
export const createTagSearchItemFixture = (
    id = 'tag-a',
    name = 'Tag A',
): TagSearchItem => ({
    id: id,
    name: name,
});
export const createTagSearchItemsFixture = (): TagSearchItem[] => [
    createTagSearchItemFixture('tag-a', 'Tag A'),
    createTagSearchItemFixture('tag-b', 'Tag B'),
];
export const createTagSelectionDraftFixture = (
    overrides: TagSelectionDraftOverrides = { sourceColumns: undefined },
): TagSelectionDraftItem => {
    const sColumns =
        overrides.sourceColumns === undefined
            ? undefined
            : createTagSelectionSourceColumnsFixture(overrides.sourceColumns);

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        calculationMode: 'avg',
        alias: '',
        weight: 1,
        ...overrides,
        sourceColumns: sColumns ?? createTagSelectionSourceColumnsFixture(),
    };
};
export const createTagSelectionDraftListFixture = (): TagSelectionDraftItem[] => [
    createTagSelectionDraftFixture(undefined),
];
export const createTagSelectionStateOptionsFixture = (): UseTagSelectionStateOptions => ({
    tables: ['TABLE_A', 'TABLE_B'],
    initialTable: 'TABLE_A',
    maxSelectedCount: 12,
    isSameSelectedTag: (item, bItem) => item.key === bItem.key,
});
