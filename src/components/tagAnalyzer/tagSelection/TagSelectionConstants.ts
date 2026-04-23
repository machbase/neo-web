import type { CSSProperties } from 'react';
import type { TagSelectionSourceColumns } from './TagSelectionTypes';

export const DEFAULT_TRIGGER_STYLE: CSSProperties = {
    width: '100%',
};

export const MODE_TRIGGER_WRAPPER_STYLE: CSSProperties = {
    width: '80px',
    flexShrink: 0,
};

export const DEFAULT_LABEL_STYLE: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

export const SELECTED_SERIES_LIST_STYLE: CSSProperties = {
    maxHeight: '200px',
};

export const SELECTED_SERIES_ITEM_STYLE: CSSProperties = {
    height: 'auto',
};

export const EMPTY_SELECTION_ERROR = 'please select tag.';

export const TAG_SELECTION_LIMIT_COLOR = '#ef6e6e';

export const TAG_SEARCH_PAGE_LIMIT = 10;

export const EMPTY_TAG_SELECTION_COLUMNS: TagSelectionSourceColumns = {
    name: '',
    time: '',
    value: '',
};
