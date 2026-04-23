import type {
    TagSearchItem,
    TagSelectionDraftItem,
    TagSelectionSourceColumns,
    UseTagSelectionStateOptions,
} from '../common/tagSelection';

type TagSelectionDraftOverrides = Partial<TagSelectionDraftItem> & {
    sourceColumns?: Partial<TagSelectionSourceColumns> | undefined;
};

/**
 * Builds the default source-column mapping used by tag-selection tests.
 * Intent: Keep the tag-selection fixtures on a stable column layout.
 * @param {Partial<TagSelectionSourceColumns>} aOverrides The source-column fields to override for the current fixture.
 * @returns {TagSelectionSourceColumns} A complete source-column fixture for modal selection tests.
 */
export const createTagSelectionSourceColumnsFixture = (
    aOverrides: Partial<TagSelectionSourceColumns> = {},
): TagSelectionSourceColumns => ({
    name: 'name_col',
    time: 'time_col',
    value: 'value_col',
    ...aOverrides,
});

/**
 * Builds a single search-result item for the tag picker.
 * Intent: Keep tag-search tests focused on a stable item shape.
 * @param {string} aId The stable row id returned by the search query.
 * @param {string} aName The visible tag label shown to the user.
 * @returns {TagSearchItem} A normalized tag-search item.
 */
export const createTagSearchItemFixture = (
    aId = 'tag-a',
    aName = 'Tag A',
): TagSearchItem => ({
    id: aId,
    name: aName,
});

/**
 * Builds the default search-result list used by tag-picker tests.
 * Intent: Keep list-based tag-selection tests deterministic.
 * @returns {TagSearchItem[]} A small tag-search result set with two visible rows.
 */
export const createTagSearchItemsFixture = (): TagSearchItem[] => [
    createTagSearchItemFixture('tag-a', 'Tag A'),
    createTagSearchItemFixture('tag-b', 'Tag B'),
];

/**
 * Builds a selected-series draft fixture for modal selection tests.
 * Intent: Keep selected-series tests focused on a normalized draft row.
 * @param {TagSelectionDraftOverrides} aOverrides The draft fields to override for the current fixture.
 * @returns {TagSelectionDraftItem} A complete selection-draft fixture with source columns.
 */
export const createTagSelectionDraftFixture = (
    aOverrides: TagSelectionDraftOverrides = { sourceColumns: undefined },
): TagSelectionDraftItem => {
    const sColumns =
        aOverrides.sourceColumns === undefined
            ? undefined
            : createTagSelectionSourceColumnsFixture(aOverrides.sourceColumns);

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        calculationMode: 'avg',
        alias: '',
        weight: 1,
        ...aOverrides,
        sourceColumns: sColumns ?? createTagSelectionSourceColumnsFixture(),
    };
};

/**
 * Builds the default selected-draft list used by selection-helper tests.
 * Intent: Keep draft-list tests anchored to a predictable single selection.
 * @returns {TagSelectionDraftItem[]} A single-item selection-draft list.
 */
export const createTagSelectionDraftListFixture = (): TagSelectionDraftItem[] => [
    createTagSelectionDraftFixture(undefined),
];

/**
 * Builds the shared useTagSelectionState options used by hook tests.
 * Intent: Keep the hook tests on a consistent, reusable option bundle.
 * @returns {UseTagSelectionStateOptions} The default options for rendering the shared tag-selection hook.
 */
export const createTagSelectionStateOptionsFixture = (): UseTagSelectionStateOptions => ({
    tables: ['TABLE_A', 'TABLE_B'],
    initialTable: 'TABLE_A',
    maxSelectedCount: 12,
    isSameSelectedTag: (aItem, bItem) => aItem.key === bItem.key,
});
