import {
    findTagNameBySearchResultId,
    mapAvailableSearchResultListItems,
    mapSelectedSeriesDraftListItems,
} from './TagSearchModalBodyHelpers';
import {
    createTagSearchResultRowsFixture,
    createTagSelectionDraftFixture,
} from '../TestData/TagSearchTestData';

describe('TagSearchModalBody helpers', () => {
    it('maps available tag rows into list items', () => {
        expect(mapAvailableSearchResultListItems(createTagSearchResultRowsFixture() as any)).toEqual([
            { id: 'tag-a', label: 'Tag A', tooltip: 'Tag A' },
            { id: 'tag-b', label: 'Tag B', tooltip: 'Tag B' },
        ]);
    });

    it('finds the selected tag name by list id', () => {
        const sTagList = createTagSearchResultRowsFixture();

        expect(findTagNameBySearchResultId(sTagList as any, 'tag-b')).toBe('Tag B');
        expect(findTagNameBySearchResultId(sTagList as any, 'missing-tag')).toBeUndefined();
    });

    it('maps selected tags through the provided render function', () => {
        expect(
            mapSelectedSeriesDraftListItems(
                [
                    createTagSelectionDraftFixture({
                        key: 'selected-1',
                        sourceTagName: 'Tag A',
                    }),
                ] as any,
                (aItem) => `label:${aItem.sourceTagName}`,
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
