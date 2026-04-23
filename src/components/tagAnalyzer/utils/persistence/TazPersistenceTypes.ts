import type { GBoardListType } from '@/recoil/recoil';
import type { LegacyTimeValue } from '../legacy/LegacyTypes';
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

export type PersistedBoardTimeRange = {
    start: LegacyTimeValue;
    end: LegacyTimeValue;
};

export type PersistedTazBoardInfo = Omit<
    GBoardListType,
    | 'code'
    | 'panels'
    | 'range_bgn'
    | 'range_end'
    | 'sheet'
    | 'shell'
    | 'savedCode'
    | 'dashboard'
    | 'refreshKey'
    | 'mode'
> & {
    code: unknown;
    panels: PersistedTazPanelInfo[];
    boardTimeRange?: PersistedBoardTimeRange | undefined;
    range_bgn?: LegacyTimeValue | undefined;
    range_end?: LegacyTimeValue | undefined;
    savedCode: string | false;
    version?: string | undefined;
};
