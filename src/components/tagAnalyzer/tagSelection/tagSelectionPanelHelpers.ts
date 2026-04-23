import { getSourceTagName } from '../utils/legacy/LegacySeriesAdapter';
import type {
    SelectedSeriesDraftListItem,
    TagSearchItem,
    TagSearchListItem,
    TagSelectionDraftItem,
} from './TagSelectionTypes';

/**
 * Maps tag search items into list-row view models.
 * Intent: Keep the search result rendering data separate from the fetched tag data.
 * @param {TagSearchItem[]} aAvailableTags The available tags returned from search.
 * @returns {TagSearchListItem[]} The list-row items used by the tag picker.
 */
export function mapTagSearchItemsToListItems(
    aAvailableTags: TagSearchItem[],
): TagSearchListItem[] {
    return aAvailableTags.map((aItem) => ({
        id: aItem.id,
        label: aItem.name,
        tooltip: aItem.name,
    }));
}

/**
 * Finds a tag search item by its list id.
 * Intent: Normalize string and numeric list-click ids before resolving the selected tag.
 * @param {TagSearchItem[]} aAvailableTags The available tags to search.
 * @param {string | number} aId The list id to resolve.
 * @returns {TagSearchItem | undefined} The matching tag item when one exists.
 */
export function findTagById(
    aAvailableTags: TagSearchItem[],
    aId: string | number,
): TagSearchItem | undefined {
    return aAvailableTags.find((aTag) => aTag.id === String(aId));
}

/**
 * Maps selected series drafts into list-row view models.
 * Intent: Keep the selected-tag list rendering data separate from the draft objects.
 * @param {TagSelectionDraftItem[]} aSelectedSeriesDrafts The selected draft items to map.
 * @returns {SelectedSeriesDraftListItem[]} The list-row items used by the selected-tag list.
 */
export function mapSelectedSeriesDraftListItems(
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return aSelectedSeriesDrafts.map((aItem) => ({
        id: aItem.key,
        selectedSeriesDraft: aItem,
        tooltip: getSourceTagName(aItem),
    }));
}
