import type { BoardInfo } from '../../boardTypes';
import type { PanelInfo } from '../../panelModelTypes';
import type { ResolvedTimeBounds, TimeBoundary } from '../../time/types/TimeTypes';
import { normalizeTimeRangeConfig } from '../../time/TimeBoundaryParsing';
import { normalizeStoredTimeRangeBoundary } from '../../time/StoredTimeRangeAdapter';
import {
    createPanelInfoFromPersistedV200,
    isPersistedPanelInfoV200,
} from './TazPanelVersionParser';
import type { PersistedPanelInfoV200 } from '../TazPanelPersistenceTypes';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
} from '../TazPersistenceTypes';
import { resolvePersistedTazVersion, TAZ_FORMAT_VERSION } from './TazVersionResolver';

/**
 * Parses received board data into the runtime board model.
 * Intent: Normalize the only supported `.taz` input shape before the UI uses it.
 * @param {PersistedTazBoardInfo} boardInfo The received board data from Recoil or a `.taz` file.
 * @returns {BoardInfo} The runtime board model used internally by TagAnalyzer.
 */
export function parseReceivedBoardInfo(boardInfo: PersistedTazBoardInfo): BoardInfo {
    const sNormalizedBoardInfo = normalizeCurrentBoardInput(boardInfo);
    resolvePersistedTazVersion(sNormalizedBoardInfo.version);
    const sBoardTime = normalizePersistedBoardTime(sNormalizedBoardInfo.boardTimeRange);

    return {
        ...sNormalizedBoardInfo,
        name: sNormalizedBoardInfo.name ?? '',
        path: sNormalizedBoardInfo.path ?? '',
        code: sNormalizedBoardInfo.code ?? '',
        panels: (sNormalizedBoardInfo.panels ?? []).map((panelInfo) =>
            parseReceivedPanelInfo(panelInfo),
        ),
        savedCode: sNormalizedBoardInfo.savedCode ?? false,
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

/**
 * Parses one received panel into the runtime panel model.
 * Intent: Keep `.taz` panel validation isolated at the persistence boundary.
 * @param {unknown} panelInfo The received panel value.
 * @returns {PanelInfo} The runtime panel model.
 */
export function parseReceivedPanelInfo(panelInfo: unknown): PanelInfo {
    if (!isPersistedPanelInfoV200(panelInfo)) {
        throw new Error('Unsupported TagAnalyzer .taz panel shape.');
    }

    return createPanelInfoFromPersistedV200(normalizePersistedPanelInfoV200(panelInfo));
}

function normalizePersistedPanelInfoV200(
    panelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            seriesList: (panelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV200,
            ),
            rowLimit: panelInfo.data.rowLimit ?? -1,
        },
        toolbar: {
            isRaw: panelInfo.toolbar?.isRaw ?? false,
        },
        highlights: panelInfo.highlights ?? [],
    };
}

function normalizePersistedSeriesInfoV200(
    seriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
): PersistedPanelInfoV200['data']['seriesList'][number] {
    return {
        ...seriesInfo,
        annotations: seriesInfo.annotations ?? [],
    };
}

function normalizeCurrentBoardInput(
    boardInfo: PersistedTazBoardInfo,
): PersistedTazBoardInfo {
    if (boardInfo.version) {
        return boardInfo;
    }

    if (canTreatBoardAsCurrentFormat(boardInfo)) {
        return {
            ...boardInfo,
            version: TAZ_FORMAT_VERSION,
            boardTimeRange:
                boardInfo.boardTimeRange ??
                normalizeStoredTimeRangeBoundary(
                    boardInfo.range_bgn,
                    boardInfo.range_end,
                ).rangeConfig,
        };
    }

    throw new Error('Unsupported TagAnalyzer .taz version: missing');
}

function canTreatBoardAsCurrentFormat(boardInfo: PersistedTazBoardInfo): boolean {
    if (!Array.isArray(boardInfo.panels)) {
        return false;
    }

    if (boardInfo.panels.length === 0) {
        return true;
    }

    return boardInfo.panels.every((panelInfo) => isPersistedPanelInfoV200(panelInfo));
}

function normalizePersistedBoardTime(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): ResolvedTimeBounds {
    if (!isPersistedBoardTimeRange(boardTimeRange)) {
        throw new Error('Unsupported TagAnalyzer .taz boardTimeRange shape.');
    }

    return normalizeTimeRangeConfig(boardTimeRange);
}

function isPersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): boardTimeRange is PersistedBoardTimeRange {
    if (!boardTimeRange || typeof boardTimeRange !== 'object') {
        return false;
    }

    return (
        isTimeBoundary(boardTimeRange.start) &&
        isTimeBoundary(boardTimeRange.end)
    );
}

function isTimeBoundary(boundary: unknown): boundary is TimeBoundary {
    if (!boundary || typeof boundary !== 'object') {
        return false;
    }

    const sBoundary = boundary as Record<string, unknown>;

    return (
        isEmptyBoundary(sBoundary) ||
        isAbsoluteBoundary(sBoundary) ||
        isRelativeBoundary(sBoundary) ||
        isRawBoundary(sBoundary)
    );
}

function isEmptyBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'empty';
}

function isAbsoluteBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'absolute' && typeof boundary.timestamp === 'number';
}

function isRelativeBoundary(boundary: Record<string, unknown>): boolean {
    return (
        boundary.kind === 'relative' &&
        (boundary.anchor === 'now' || boundary.anchor === 'last') &&
        typeof boundary.amount === 'number' &&
        typeof boundary.expression === 'string' &&
        (boundary.unit === undefined || typeof boundary.unit === 'string')
    );
}

function isRawBoundary(boundary: Record<string, unknown>): boolean {
    return boundary.kind === 'raw' && typeof boundary.value === 'string';
}
