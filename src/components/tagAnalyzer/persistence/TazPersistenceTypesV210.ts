import type { TazVersion } from './TazVersion';
import type { PanelInfo } from '../domain/PanelDomain';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV210 = PanelInfo;

export type PersistedTazBoardInfoV210 = {
    id: string;
    type: string;
    version: TazVersion.V210;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV210[];
};
