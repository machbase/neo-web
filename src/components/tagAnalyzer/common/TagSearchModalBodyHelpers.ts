import type { ReactNode } from 'react';
import type { TagSearchResultRow, TagSelectionDraftItem } from './useTagSearchModalState';
import { getSourceTagName } from '../utils/legacy/LegacyConversion';

// Used by TagAnalyzer tag search flows to type tag search list item.
type TagSearchListItem = {
    id: string;
    label: ReactNode;
    tooltip: string;
};

export const mapAvailableSearchResultListItems = (
    aAvailableTagResults: TagSearchResultRow[],
): TagSearchListItem[] => {
    return aAvailableTagResults.map((aItem) => ({
        id: aItem[0],
        label: aItem[1],
        tooltip: aItem[1],
    }));
};

export const findTagNameBySearchResultId = (
    aAvailableTagResults: TagSearchResultRow[],
    aId: string | number,
): string | undefined => {
    return aAvailableTagResults.find(
        (aTagSearchResult) => String(aTagSearchResult[0]) === String(aId),
    )?.[1];
};

export const mapSelectedSeriesDraftListItems = (
    aSelectedSeriesDrafts: TagSelectionDraftItem[],
    aRenderSelectedSeriesDraftLabel: (aItem: TagSelectionDraftItem) => ReactNode,
): TagSearchListItem[] => {
    return aSelectedSeriesDrafts.map((aItem) => ({
        id: aItem.key,
        label: aRenderSelectedSeriesDraftLabel(aItem),
        tooltip: getSourceTagName(aItem),
    }));
};
