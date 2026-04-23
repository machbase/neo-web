import type { BoardInfo } from '../../boardTypes';
import { createPersistedPanelInfo } from './TazPanelSaveMapper';
import type { PersistedTazBoardInfo } from '../TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';
import { toLegacyTimeValue } from '../../legacy/LegacyTimeAdapter';
import type { LegacyTimeValue } from '../../legacy/LegacyTypes';

type BoardInfoWithLegacyRootRange = BoardInfo & {
    range_bgn?: LegacyTimeValue | undefined;
    range_end?: LegacyTimeValue | undefined;
};

/**
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} aBoardInfo The runtime board model.
 * @returns {PersistedTazBoardInfo} The persisted `.taz` board payload.
 */
export function createPersistedTazBoardInfo(aBoardInfo: BoardInfo): PersistedTazBoardInfo {
    const {
        range,
        rangeConfig,
        sheet,
        shell,
        dashboard,
        refreshKey,
        mode,
        range_bgn: sLegacyRangeStart,
        range_end: sLegacyRangeEnd,
        ...sBoardInfo
    } = aBoardInfo as BoardInfoWithLegacyRootRange;
    void range;
    void sheet;
    void shell;
    void dashboard;
    void refreshKey;
    void mode;
    void sLegacyRangeStart;
    void sLegacyRangeEnd;

    return {
        ...sBoardInfo,
        version: TAZ_FORMAT_VERSION,
        panels: aBoardInfo.panels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo)),
        boardTimeRange: {
            start: toLegacyTimeValue(rangeConfig.start),
            end: toLegacyTimeValue(rangeConfig.end),
        },
    };
}
