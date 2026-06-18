import type { PanelInfo } from '../domain/PanelDomain';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV205 = PanelInfo;

export type PersistedTazBoardInfoV205 = {
    id: string;
    type: string;
    version: '2.0.5';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV205[];
};
