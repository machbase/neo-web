import type { TagSelectionSourceColumns } from './TagSelectionTypes';

export const EMPTY_SELECTION_ERROR = 'please select tag.';

export const TAG_SELECTION_LIMIT_COLOR = '#ef6e6e';

export const TAG_SEARCH_PAGE_LIMIT = 100;

export const EMPTY_TAG_SELECTION_COLUMNS: TagSelectionSourceColumns = {
    name: '',
    time: '',
    value: '',
    jsonKey: '',
};
