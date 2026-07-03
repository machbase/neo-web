import type { TazVersion } from './TazVersion';
import type { PanelInfo, PanelTimeConfig } from '../domain/panel/PanelInfo';
import type { PersistedBoardTimeRange } from './TazPersistenceTypesV200';

type PersistedPanelTimeRangeV210 = PanelTimeConfig['rangeInput'] & {
    useLastViewedRange?: boolean | undefined;
    lastViewedRange?: unknown;
};

export type PersistedPanelInfoV210 = Omit<PanelInfo, 'time'> & {
    timeRange: PersistedPanelTimeRangeV210;
};

export type PersistedTazBoardInfoV210 = {
    id: string;
    type: string;
    version: TazVersion.V210;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV210[];
};