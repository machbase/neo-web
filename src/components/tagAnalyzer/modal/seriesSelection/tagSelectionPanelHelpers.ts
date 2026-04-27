import { getSourceTagName } from '../../utils/legacy/LegacySeriesAdapter';
import type {
    SelectedSeriesDraftListItem,
    TagSearchItem,
    TagSearchListItem,
    TagSelectionDraftItem,
} from './TagSelectionTypes';

/**
 * Maps tag search items into list-row view models.
 * Intent: Keep the search result rendering data separate from the fetched tag data.
 * @param {TagSearchItem[]} availableTags The available tags returned from search.
 * @returns {TagSearchListItem[]} The list-row items used by the tag picker.
 */
export function mapTagSearchItemsToListItems(
    availableTags: TagSearchItem[],
): TagSearchListItem[] {
    return availableTags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));
}

/**
 * Finds a tag search item by its list id.
 * Intent: Normalize string and numeric list-click ids before resolving the selected tag.
 * @param {TagSearchItem[]} availableTags The available tags to search.
 * @param {string | number} id The list id to resolve.
 * @returns {TagSearchItem | undefined} The matching tag item when one exists.
 */
export function findTagById(
    availableTags: TagSearchItem[],
    id: string | number,
): TagSearchItem | undefined {
    return availableTags.find((tag) => tag.id === String(id));
}

/**
 * Maps selected series drafts into list-row view models.
 * Intent: Keep the selected-tag list rendering data separate from the draft objects.
 * @param {TagSelectionDraftItem[]} selectedSeriesDrafts The selected draft items to map.
 * @returns {SelectedSeriesDraftListItem[]} The list-row items used by the selected-tag list.
 */
export function mapSelectedSeriesDraftListItems(
    selectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return selectedSeriesDrafts.map((item) => ({
        id: item.key,
        selectedSeriesDraft: item,
        tooltip: getSourceTagName(item),
    }));
}
