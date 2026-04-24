import type { BoardInfo } from '../../boardTypes';
import { createPersistedPanelInfo } from './TazPanelSaveMapper';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfoV200,
} from '../TazPersistenceTypes';
import { TAZ_FORMAT_VERSION } from '../versionParsing/TazVersionResolver';
import type { TimeBoundary, TimeRangeConfig } from '../../time/types/TimeTypes';

/**
 * Builds the persisted `.taz` board payload from the runtime board model.
 * Intent: Keep the latest board serializer in one general persistence file instead of the legacy folder.
 * @param {BoardInfo} aBoardInfo The runtime board model.
 * @returns {PersistedTazBoardInfoV200} The persisted `.taz` board payload.
 */
export function createPersistedTazBoardInfo(
    aBoardInfo: BoardInfo,
): PersistedTazBoardInfoV200 {
    return {
        id: aBoardInfo.id,
        type: aBoardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: clonePersistedBoardTimeRange(aBoardInfo.rangeConfig),
        panels: aBoardInfo.panels.map((aPanelInfo) => createPersistedPanelInfo(aPanelInfo)),
    };
}

/**
 * Clones the structured board time range for persistence.
 * Intent: Save the active board time config without leaking runtime object references.
 * @param {TimeRangeConfig} aRangeConfig The runtime board time range config.
 * @returns {PersistedBoardTimeRange} The cloned persisted board time range.
 */
function clonePersistedBoardTimeRange(
    aRangeConfig: TimeRangeConfig,
): PersistedBoardTimeRange {
    return {
        start: cloneTimeBoundary(aRangeConfig.start),
        end: cloneTimeBoundary(aRangeConfig.end),
    };
}

/**
 * Clones one time boundary for persisted board time.
 * Intent: Keep board time save output explicit for every boundary variant.
 * @param {TimeBoundary} aBoundary The boundary to clone.
 * @returns {TimeBoundary} The cloned boundary.
 */
function cloneTimeBoundary(aBoundary: TimeBoundary): TimeBoundary {
    switch (aBoundary.kind) {
        case 'empty':
            return { kind: 'empty' };
        case 'absolute':
            return {
                kind: 'absolute',
                timestamp: aBoundary.timestamp,
            };
        case 'relative':
            return {
                kind: 'relative',
                anchor: aBoundary.anchor,
                amount: aBoundary.amount,
                unit: aBoundary.unit,
                expression: aBoundary.expression,
            };
        case 'raw':
            return {
                kind: 'raw',
                value: aBoundary.value,
            };
    }
}
