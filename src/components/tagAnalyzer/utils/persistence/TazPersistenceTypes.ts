import type { LegacyTimeValue } from '../legacy/LegacyTypes';
import type { TimeRangeConfig } from '../time/types/TimeTypes';
import type { PersistedPanelInfoV200 } from './TazPanelPersistenceTypes';

export type PersistedTazPanelInfo = PersistedPanelInfoV200 | Record<string, unknown>;

export type PersistedBoardTimeRange = TimeRangeConfig;

export type PersistedTazBoardInfo = {
    id: string;
    type: string;
    version?: string | undefined;
    panels: PersistedTazPanelInfo[];
    boardTimeRange?: PersistedBoardTimeRange | undefined;
    name?: string | undefined;
    path?: string | undefined;
    code?: unknown;
    savedCode?: string | false | undefined;
    range_bgn?: LegacyTimeValue | undefined;
    range_end?: LegacyTimeValue | undefined;
    sheet?: unknown[] | undefined;
    shell?: unknown;
    dashboard?: unknown;
    refreshKey?: unknown;
    mode?: unknown;
};

export type PersistedTazBoardInfoV200 = {
    id: string;
    type: string;
    version: '2.0.0';
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV200[];
};
