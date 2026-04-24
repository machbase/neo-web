import type { LegacyTimeValue } from '../legacy/LegacyTypes';
import type { TimeRangeConfig } from '../time/types/TimeTypes';
import type { LegacyFlatPanelInfo } from './legacy/LegacyFlatPanelTypes';
import type {
    PersistedPanelInfoV200,
    PersistedPanelInfoV201,
    PersistedPanelInfoV202,
    PersistedPanelInfoV203,
    PersistedPanelInfoV204,
    PersistedPanelInfoV205,
} from './TazPanelPersistenceTypes';

export type PersistedTazPanelInfo =
    | LegacyFlatPanelInfo
    | PersistedPanelInfoV200
    | PersistedPanelInfoV201
    | PersistedPanelInfoV202
    | PersistedPanelInfoV203
    | PersistedPanelInfoV204
    | PersistedPanelInfoV205
    | Record<string, unknown>;

export type PersistedLegacyBoardTimeRange = {
    start: LegacyTimeValue;
    end: LegacyTimeValue;
};

export type PersistedBoardTimeRange = TimeRangeConfig;

export type PersistedReceivedBoardTimeRange =
    | PersistedBoardTimeRange
    | PersistedLegacyBoardTimeRange;

export type PersistedTazBoardInfo = {
    id: string;
    type: string;
    name?: string | undefined;
    panels: PersistedTazPanelInfo[];
    path?: string | undefined;
    code?: unknown;
    boardTimeRange?: PersistedReceivedBoardTimeRange | undefined;
    range_bgn?: LegacyTimeValue | undefined;
    range_end?: LegacyTimeValue | undefined;
    sheet?: unknown[] | undefined;
    shell?: unknown;
    savedCode?: string | false | undefined;
    dashboard?: unknown;
    refreshKey?: unknown;
    mode?: unknown;
    version?: string | undefined;
};

export type PersistedTazBoardInfoV206 = {
    id: string;
    type: string;
    name: string;
    version: string;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV205[];
};

export type PersistedTazBoardInfoV207 = {
    id: string;
    type: string;
    version: string;
    boardTimeRange: PersistedBoardTimeRange;
    panels: PersistedPanelInfoV205[];
};
