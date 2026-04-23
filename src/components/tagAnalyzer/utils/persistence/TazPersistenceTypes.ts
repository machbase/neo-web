import type { GBoardListType } from '@/recoil/recoil';
import type { LegacyTimeValue } from '../legacy/LegacyTypes';
import type { LegacyFlatPanelInfo } from './legacy/LegacyFlatPanelTypes';
import type {
    PersistedPanelInfoV200,
    PersistedPanelInfoV201,
    PersistedPanelInfoV202,
    PersistedPanelInfoV203,
    PersistedPanelInfoV204,
} from './TazPanelPersistenceTypes';

export type PersistedTazPanelInfo =
    | LegacyFlatPanelInfo
    | PersistedPanelInfoV200
    | PersistedPanelInfoV201
    | PersistedPanelInfoV202
    | PersistedPanelInfoV203
    | PersistedPanelInfoV204
    | Record<string, unknown>;

export type PersistedTazBoardInfo = Omit<
    GBoardListType,
    'code' | 'panels' | 'range_bgn' | 'range_end' | 'savedCode'
> & {
    code: unknown;
    panels: PersistedTazPanelInfo[];
    range_bgn: LegacyTimeValue;
    range_end: LegacyTimeValue;
    savedCode: string | false;
    version?: string | undefined;
};
