import type { PanelTime } from '../utils/panelModelTypes';
import type { TimeRangeConfig, ResolvedTimeRangeMs } from '../time/TimeTypes';
import { EMPTY_TIME_RANGE } from '../time/TimeConstants';
import { convertTimeRangeConfigToResolvedTimeRangeMs } from '../time/TimeBoundaryConverters';

/**
 * Resolves the active range from the panel first, then the board.
 * Intent: Keep the shared panel-or-board fallback order in one explicit helper.
 * @param {Pick<PanelTime, 'rangeConfig'>} panelTime - The raw panel time payload.
 * @param {TimeRangeConfig | undefined} boardTime - The current board time payload.
 * @returns {ResolvedTimeRangeMs} The resolved active range.
 */
export function resolvePanelOrBoardTimeRange(
    panelTime: Pick<PanelTime, 'rangeConfig'>,
    boardTime: TimeRangeConfig | undefined,
): ResolvedTimeRangeMs {
    const sPanelRangeConfig = panelTime.rangeConfig;
    if (
        sPanelRangeConfig.start.kind !== 'empty' &&
        sPanelRangeConfig.end.kind !== 'empty' &&
        sPanelRangeConfig.start.kind !== 'last' &&
        sPanelRangeConfig.end.kind !== 'last'
    ) {
        return convertTimeRangeConfigToResolvedTimeRangeMs(sPanelRangeConfig);
    }

    if (
        boardTime &&
        boardTime.start.kind !== 'empty' &&
        boardTime.end.kind !== 'empty' &&
        boardTime.start.kind !== 'last' &&
        boardTime.end.kind !== 'last'
    ) {
        return convertTimeRangeConfigToResolvedTimeRangeMs(boardTime);
    }

    return EMPTY_TIME_RANGE;
}

