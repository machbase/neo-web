import { render } from '@testing-library/react';
import {
    findTagNameBySearchResultId,
    mapAvailableSearchResultListItems,
    mapSelectedSeriesDraftListItems,
} from './TagSearchModalBody';
import {
    createTagSearchResultRowsFixture,
    createTagSelectionDraftListFixture,
    createTagSelectionDraftFixture,
} from '../TestData/TagSearchTestData';
import TagSearchModalBody from './TagSearchModalBody';
import TagSelectionModeRow from './TagSelectionModeRow';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from './TagAnalyzerUtils';

describe('TagSearchModalBody helpers', () => {
    it('maps available tag rows into list items', () => {
        expect(
            mapAvailableSearchResultListItems(createTagSearchResultRowsFixture() as any),
        ).toEqual([
            { id: 'tag-a', label: 'Tag A', tooltip: 'Tag A' },
            { id: 'tag-b', label: 'Tag B', tooltip: 'Tag B' },
        ]);
    });

    it('finds the selected tag name by list id', () => {
        const sTagList = createTagSearchResultRowsFixture();

        expect(findTagNameBySearchResultId(sTagList as any, 'tag-b')).toBe('Tag B');
        expect(findTagNameBySearchResultId(sTagList as any, 'missing-tag')).toBeUndefined();
    });

    it('matches numeric row ids after list-click coercion', () => {
        const sTagList = [
            [101, 'Tag A'],
            [102, 'Tag B'],
        ] as any;

        expect(findTagNameBySearchResultId(sTagList, 102)).toBe('Tag B');
        expect(findTagNameBySearchResultId(sTagList, '102')).toBe('Tag B');
    });

    it('maps selected tags into draft list items', () => {
        const sSelectedDraft = createTagSelectionDraftFixture({
            key: 'selected-1',
            sourceTagName: 'Tag A',
            colName: undefined,
        }) as any;

        expect(
            mapSelectedSeriesDraftListItems([sSelectedDraft]),
        ).toEqual([
            {
                id: 'selected-1',
                selectedSeriesDraft: sSelectedDraft,
                tooltip: 'Tag A',
            },
        ]);
    });
});

describe('TagSearchModalBody', () => {
    it('renders selected rows without nesting dropdown buttons inside list buttons', () => {
        const { container } = render(
            <TagSearchModalBody
                tableOptions={[{ label: 'TABLE_A', value: 'TABLE_A', disabled: undefined }]}
                selectedTable="TABLE_A"
                onSelectedTableChange={() => {}}
                tagTotal={2}
                tagInputValue=""
                onTagInputChange={() => {}}
                onSearch={() => {}}
                availableTagResults={createTagSearchResultRowsFixture() as any}
                onAvailableTagSelect={() => {}}
                selectedSeriesDrafts={createTagSelectionDraftListFixture() as any}
                onSelectedSeriesDraftRemove={() => {}}
                renderSelectedSeriesDraftLabel={(aItem) => (
                    <TagSelectionModeRow
                        selectedSeriesDraft={aItem}
                        options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                        onModeChange={() => {}}
                        triggerStyle={undefined}
                    />
                )}
                selectedCountText={undefined}
                paginationProp={{
                    maxPageNum: 1,
                    tagPagination: 1,
                    onPageChange: () => {},
                    keepPageNum: 1,
                    onPageInputChange: () => {},
                }}
            />,
        );

        expect(container.querySelector('button button')).toBeNull();
    });
});
