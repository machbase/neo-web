import { render } from '@testing-library/react';
import {
    findTagById,
    mapSelectedSeriesDraftListItems,
    mapTagSearchItemsToListItems,
} from './tagSelectionPanelHelpers';
import {
    createTagSearchItemFixture,
    createTagSearchItemsFixture,
    createTagSelectionDraftFixture,
    createTagSelectionDraftListFixture,
} from '../TestData/TagSelectionTestData';
import TagSelectionPanel from './TagSelectionPanel';
import TagSelectionModeRow from './TagSelectionModeRow';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../utils/series/SeriesSummaryUtils';

describe('TagSelectionPanel helpers', () => {
    it('maps available tag items into list items', () => {
        expect(mapTagSearchItemsToListItems(createTagSearchItemsFixture())).toEqual([
            { id: 'tag-a', label: 'Tag A', tooltip: 'Tag A' },
            { id: 'tag-b', label: 'Tag B', tooltip: 'Tag B' },
        ]);
    });

    it('finds the selected tag by list id', () => {
        const sTagList = createTagSearchItemsFixture();

        expect(findTagById(sTagList, 'tag-b')).toEqual(
            createTagSearchItemFixture('tag-b', 'Tag B'),
        );
        expect(findTagById(sTagList, 'missing-tag')).toBeUndefined();
    });

    it('matches numeric row ids after list-click coercion', () => {
        const sTagList = [
            createTagSearchItemFixture('101', 'Tag A'),
            createTagSearchItemFixture('102', 'Tag B'),
        ];

        expect(findTagById(sTagList, 102)).toEqual(
            createTagSearchItemFixture('102', 'Tag B'),
        );
        expect(findTagById(sTagList, '102')).toEqual(
            createTagSearchItemFixture('102', 'Tag B'),
        );
    });

    it('maps selected tags into draft list items', () => {
        const sSelectedDraft = createTagSelectionDraftFixture({
            key: 'selected-1',
            sourceTagName: 'Tag A',
        });

        expect(mapSelectedSeriesDraftListItems([sSelectedDraft])).toEqual([
            {
                id: 'selected-1',
                selectedSeriesDraft: sSelectedDraft,
                tooltip: 'Tag A',
            },
        ]);
    });
});

describe('TagSelectionPanel', () => {
    it('renders selected rows without nesting dropdown buttons inside list buttons', () => {
        const { container } = render(
            <TagSelectionPanel
                tableOptions={[{ label: 'TABLE_A', value: 'TABLE_A', disabled: undefined }]}
                selectedTable="TABLE_A"
                onSelectedTableChange={() => {}}
                tagTotal={2}
                tagInputValue=""
                onTagInputChange={() => {}}
                onSearch={() => {}}
                availableTags={createTagSearchItemsFixture()}
                onAvailableTagSelect={() => {}}
                selectedSeriesDrafts={createTagSelectionDraftListFixture()}
                onSelectedSeriesDraftRemove={() => {}}
                renderSelectedSeriesDraftLabel={(aItem) => (
                    <TagSelectionModeRow
                        selectedSeriesDraft={aItem}
                        options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                        onModeChange={() => {}}
                        triggerStyle={undefined}
                    />
                )}
                maxSelectedCount={12}
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
