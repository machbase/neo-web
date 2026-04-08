import {
    findAvailableTagNameById,
    mapAvailableTagListItems,
    mapSelectedTagListItems,
} from './TagSearchModalBodyHelpers';

describe('TagSearchModalBody helpers', () => {
    const tagList = [
        ['tag-a', 'Tag A'],
        ['tag-b', 'Tag B'],
    ] as const;

    it('maps available tag rows into list items', () => {
        expect(mapAvailableTagListItems(tagList as any)).toEqual([
            { id: 'tag-a', label: 'Tag A', tooltip: 'Tag A' },
            { id: 'tag-b', label: 'Tag B', tooltip: 'Tag B' },
        ]);
    });

    it('finds the selected tag name by list id', () => {
        expect(findAvailableTagNameById(tagList as any, 'tag-b')).toBe('Tag B');
        expect(findAvailableTagNameById(tagList as any, 'missing-tag')).toBeUndefined();
    });

    it('maps selected tags through the provided render function', () => {
        expect(
            mapSelectedTagListItems(
                [
                    {
                        key: 'selected-1',
                        tagName: 'Tag A',
                    },
                ] as any,
                (aItem) => `label:${aItem.tagName}`,
            ),
        ).toEqual([
            {
                id: 'selected-1',
                label: 'label:Tag A',
                tooltip: 'Tag A',
            },
        ]);
    });
});
