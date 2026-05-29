import type { PanelInfo } from '../domain/PanelDomain';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV204 = PanelInfo;

export type PersistedTazBoardInfoV204 = {
    id: string;
    type: string;
    version: '2.0.4';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV204[];
};
