import type { ReactNode } from 'react';
import type { TagSearchOptionRow, TagSearchSelectionItem } from './useTagSearchModalState';

type TagSearchListItem = {
    id: string;
    label: ReactNode;
    tooltip: string;
};

export const mapAvailableTagListItems = (aTagList: TagSearchOptionRow[]): TagSearchListItem[] => {
    return aTagList.map((aItem) => ({
        id: aItem[0],
        label: aItem[1],
        tooltip: aItem[1],
    }));
};

export const findAvailableTagNameById = (
    aTagList: TagSearchOptionRow[],
    aId: string,
): string | undefined => {
    return aTagList.find((aTagItem) => aTagItem[0] === aId)?.[1];
};

export const mapSelectedTagListItems = (
    aSelectedTags: TagSearchSelectionItem[],
    aRenderSelectedTagLabel: (aItem: TagSearchSelectionItem) => ReactNode,
): TagSearchListItem[] => {
    return aSelectedTags.map((aItem) => ({
        id: aItem.key,
        label: aRenderSelectedTagLabel(aItem),
        tooltip: aItem.tagName,
    }));
};
