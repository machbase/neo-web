import type { TazVersion } from './TazVersion';
import type { PanelConfig, PanelTimeConfig } from '../domain/panel/PanelConfig';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

export type PersistedPanelTimeRangeV210 = PanelTimeConfig['rangeInput'] & {
    useLastViewedRange?: boolean | undefined;
    lastViewedRange?: unknown;
};

export type PersistedPanelInfoV210 = Omit<PanelConfig, 'time'> & {
    timeRange: PersistedPanelTimeRangeV210;
};

export type PersistedTazBoardInfoV210 = {
    id: string;
    type: string;
    version: TazVersion.V210;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV210[];
};