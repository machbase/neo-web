import type { BoardInfo } from '../../boardTypes';
import { createPersistedPanelInfo } from './TazPanelSaveMapper';
import type { PersistedTazBoardInfo } from '../TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';
import { toLegacyTimeValue } from '../../legacy/LegacyTimeAdapter';

/**
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} aBoardInfo The runtime board model.
 * @returns {PersistedTazBoardInfo} The persisted `.taz` board payload.
 */
export function createPersistedTazBoardInfo(aBoardInfo: BoardInfo): PersistedTazBoardInfo {
    return {
        ...aBoardInfo,
        version: TAZ_FORMAT_VERSION,
        panels: aBoardInfo.panels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo)),
        range_bgn: toLegacyTimeValue(aBoardInfo.rangeConfig.start),
        range_end: toLegacyTimeValue(aBoardInfo.rangeConfig.end),
    };
}
