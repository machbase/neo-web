import type {
    PersistedBoardTimeRange,
    PersistedPanelInfoV200,
} from './TazPersistenceTypesV200';

export type PersistedPanelInfoV201 = PersistedPanelInfoV200;

export type PersistedTazBoardInfoV201 = {
    id: string;
    type: string;
    version: '2.0.1';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV201[];
};
