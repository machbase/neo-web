import type { TazVersion } from './TazVersion';
import type { PanelInfo } from '../domain/PanelDomain';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV205 = PanelInfo;

export type PersistedTazBoardInfoV205 = {
    id: string;
    type: string;
    version: TazVersion.V205;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV205[];
};
