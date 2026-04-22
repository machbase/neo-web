import type { GBoardListType } from '@/recoil/recoil';
import type { LegacyTimeValue } from '../legacy/LegacyTypes';
import type { LegacyFlatPanelInfo } from './legacy/LegacyFlatPanelTypes';
import type {
    PersistedPanelInfoV200,
    PersistedPanelInfoV201,
    PersistedPanelInfoV202,
    PersistedPanelInfoV203,
} from './TazPanelInfoMapper';

export type PersistedTazPanelInfo =
    | LegacyFlatPanelInfo
    | PersistedPanelInfoV200
    | PersistedPanelInfoV201
    | PersistedPanelInfoV202
    | PersistedPanelInfoV203
    | Record<string, unknown>;

export type PersistedTazBoardInfo = Omit<
    GBoardListType,
    'panels' | 'range_bgn' | 'range_end'
> & {
    panels: PersistedTazPanelInfo[];
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
    version?: string | undefined;
};
