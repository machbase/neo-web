import type { PanelInfo } from '../domain/PanelDomain';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV210 = PanelInfo;

export type PersistedTazBoardInfoV210 = {
    id: string;
    type: string;
    version: '2.1.0';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV210[];
};
