import type {
    SelectedSeriesDraftListItem,
    TagSearchItem,
    TagSearchListItem,
    TagSelectionDraftItem,
} from './TagSelectionTypes';
export function mapTagSearchItemsToListItems(
    availableTags: TagSearchItem[],
): TagSearchListItem[] {
    return availableTags.map((item) => ({
        id: item.id,
        label: item.name,
        tooltip: item.name,
    }));
}
export function findTagById(
    availableTags: TagSearchItem[],
    id: string | number,
): TagSearchItem | undefined {
    return availableTags.find((tag) => tag.id === String(id));
}
export function mapSelectedSeriesDraftListItems(
    selectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return selectedSeriesDrafts.map((item) => ({
        id: item.key,
        selectedSeriesDraft: item,
        tooltip: item.sourceTagName,
    }));
}
