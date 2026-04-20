import type { ReactNode } from 'react';
import type {
    TagSearchResultRow,
    TagSelectionDraftItem,
} from '../tagSearch/TagSearchTypes';
import { getSourceTagName } from '../utils/legacy/LegacyUtils';

type TagSearchListItem = {
    id: string | number;
    label: ReactNode;
    tooltip: string;
};

export type SelectedSeriesDraftListItem = {
    id: string;
    selectedSeriesDraft: TagSelectionDraftItem;
    tooltip: string;
};

export function mapAvailableSearchResultListItems(
    aAvailableTagResults: TagSearchResultRow[],
): TagSearchListItem[] {
    return aAvailableTagResults.map((aItem) => ({
        id: aItem[0],
        label: aItem[1],
        tooltip: aItem[1],
    }));
}

export function findTagNameBySearchResultId(
    aAvailableTagResults: TagSearchResultRow[],
    aId: string | number,
): string | undefined {
    return aAvailableTagResults.find(
        (aTagSearchResult) => String(aTagSearchResult[0]) === String(aId),
    )?.[1];
}

export function mapSelectedSeriesDraftListItems(
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
): SelectedSeriesDraftListItem[] {
    return aSelectedSeriesDrafts.map((aItem) => ({
        id: aItem.key,
        selectedSeriesDraft: aItem,
        tooltip: getSourceTagName(aItem),
    }));
}
