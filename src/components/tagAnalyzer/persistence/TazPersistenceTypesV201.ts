import type {
    PersistedBoardTimeRange,
    PersistedPanelHighlightV200,
    PersistedPanelInfoV200,
} from './TazPersistenceTypesV200';

export type PersistedPanelHighlightV201 = PersistedPanelHighlightV200 & {
    fillColor?: string | undefined;
    textColor?: string | undefined;
};

export type PersistedPanelInfoV201 = Omit<PersistedPanelInfoV200, 'highlights'> & {
    highlights?: PersistedPanelHighlightV201[] | undefined;
};

export type PersistedTazBoardInfoV201 = {
    id: string;
    type: string;
    version: '2.0.1';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV201[];
};
