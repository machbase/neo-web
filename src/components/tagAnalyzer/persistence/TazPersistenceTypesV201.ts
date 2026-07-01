import type {
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
