import type {
    TagSearchResultRow,
    TagSearchSourceColumns,
    TagSelectionDraftItem,
} from '../common/useTagSearchModalState';

// Used by TagSearchTestData fixtures to type tag selection draft overrides.
type TagSelectionDraftOverrides = Partial<TagSelectionDraftItem> & {
    colName?: Partial<TagSearchSourceColumns>;
};

/**
 * Builds the default source-column mapping used by tag-search tests.
 * @param aOverrides The source-column fields to override for the current fixture.
 * @returns A complete source-column fixture for modal search tests.
 */
export const createTagSearchSourceColumnsFixture = (
    aOverrides: Partial<TagSearchSourceColumns> = {},
): TagSearchSourceColumns => ({
    name: 'name_col',
    time: 'time_col',
    value: 'value_col',
    ...aOverrides,
});

/**
 * Builds a single search-result row for the tag picker.
 * @param aId The stable row id returned by the search query.
 * @param aLabel The visible tag label shown to the user.
 * @returns A tuple-shaped tag-search result row.
 */
export const createTagSearchResultRowFixture = (
    aId = 'tag-a',
    aLabel = 'Tag A',
): TagSearchResultRow => [aId, aLabel];

/**
 * Builds the default search-result list used by tag-picker tests.
 * @returns A small tag-search result set with two visible rows.
 */
export const createTagSearchResultRowsFixture = (): TagSearchResultRow[] => [
    createTagSearchResultRowFixture('tag-a', 'Tag A'),
    createTagSearchResultRowFixture('tag-b', 'Tag B'),
];

/**
 * Builds a selected-series draft fixture for modal selection tests.
 * @param aOverrides The draft fields to override for the current fixture.
 * @returns A complete selection-draft fixture with source columns.
 */
export const createTagSelectionDraftFixture = (
    aOverrides: TagSelectionDraftOverrides = {},
): TagSelectionDraftItem => {
    const sColumns = createTagSearchSourceColumnsFixture(aOverrides.colName ?? {});

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        calculationMode: 'avg',
        alias: '',
        weight: 1,
        ...aOverrides,
        colName: sColumns,
    };
};

/**
 * Builds the default selected-draft list used by selection-helper tests.
 * @returns A single-item selection-draft list.
 */
export const createTagSelectionDraftListFixture = (): TagSelectionDraftItem[] => [
    createTagSelectionDraftFixture(),
];

/**
 * Builds the shared useTagSearchModalState options used by hook tests.
 * @returns The default options for rendering the shared tag-search hook.
 */
export const createTagSearchModalStateOptionsFixture = () => ({
    tables: ['TABLE_A', 'TABLE_B'],
    initialTable: 'TABLE_A',
    maxSelectedCount: 12,
    isSameSelectedTag: (aItem: TagSelectionDraftItem, bItem: TagSelectionDraftItem) => aItem.key === bItem.key,
});
