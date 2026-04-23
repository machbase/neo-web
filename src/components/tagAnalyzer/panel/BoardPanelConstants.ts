import type {
    BoardPanelContextMenuState,
    HighlightRenameState,
} from './BoardPanelTypes';

export const INITIAL_CONTEXT_MENU_STATE: BoardPanelContextMenuState = {
    isOpen: false,
    position: { x: 0, y: 0 },
};

export const INITIAL_HIGHLIGHT_RENAME_STATE: HighlightRenameState = {
    isOpen: false,
    highlightIndex: undefined,
    position: { x: 0, y: 0 },
    labelText: '',
};

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';
