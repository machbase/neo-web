import type { BoardInfo } from '../../boardTypes';
import type { PanelInfo } from '../../panelModelTypes';
import type { ResolvedTimeBounds, TimeBoundary } from '../../time/types/TimeTypes';
import { normalizeTimeRangeConfig } from '../../time/TimeBoundaryParsing';
import { normalizeLegacyTimeRangeBoundary } from '../../legacy/LegacyTimeAdapter';
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
 * @param {PersistedTazBoardInfo} aBoardInfo The received board data from Recoil or a `.taz` file.
 * @returns {BoardInfo} The runtime board model used internally by TagAnalyzer.
 */
export function parseReceivedBoardInfo(aBoardInfo: PersistedTazBoardInfo): BoardInfo {
    const sNormalizedBoardInfo = normalizeCurrentBoardInput(aBoardInfo);
    resolvePersistedTazVersion(sNormalizedBoardInfo.version);
    const sBoardTime = normalizePersistedBoardTime(sNormalizedBoardInfo.boardTimeRange);

    return {
        ...sNormalizedBoardInfo,
        name: sNormalizedBoardInfo.name ?? '',
        path: sNormalizedBoardInfo.path ?? '',
        code: sNormalizedBoardInfo.code ?? '',
        panels: (sNormalizedBoardInfo.panels ?? []).map((aPanelInfo) =>
            parseReceivedPanelInfo(aPanelInfo),
        ),
        savedCode: sNormalizedBoardInfo.savedCode ?? false,
        range: sBoardTime.range,
        rangeConfig: sBoardTime.rangeConfig,
    };
}

/**
 * Parses one received panel into the runtime panel model.
 * Intent: Keep `.taz` panel validation isolated at the persistence boundary.
 * @param {unknown} aPanelInfo The received panel value.
 * @returns {PanelInfo} The runtime panel model.
 */
export function parseReceivedPanelInfo(aPanelInfo: unknown): PanelInfo {
    if (!isPersistedPanelInfoV200(aPanelInfo)) {
        throw new Error('Unsupported TagAnalyzer .taz panel shape.');
    }

    return createPanelInfoFromPersistedV200(normalizePersistedPanelInfoV200(aPanelInfo));
}

function normalizePersistedPanelInfoV200(
    aPanelInfo: PersistedPanelInfoV200,
): PersistedPanelInfoV200 {
    return {
        ...aPanelInfo,
        data: {
            ...aPanelInfo.data,
            seriesList: (aPanelInfo.data.seriesList ?? []).map(
                normalizePersistedSeriesInfoV200,
            ),
            rowLimit: aPanelInfo.data.rowLimit ?? -1,
        },
        toolbar: {
            isRaw: aPanelInfo.toolbar?.isRaw ?? false,
        },
        highlights: aPanelInfo.highlights ?? [],
    };
}

function normalizePersistedSeriesInfoV200(
    aSeriesInfo: PersistedPanelInfoV200['data']['seriesList'][number],
): PersistedPanelInfoV200['data']['seriesList'][number] {
    return {
        ...aSeriesInfo,
        annotations: aSeriesInfo.annotations ?? [],
    };
}

function normalizeCurrentBoardInput(
    aBoardInfo: PersistedTazBoardInfo,
): PersistedTazBoardInfo {
    if (aBoardInfo.version) {
        return aBoardInfo;
    }

    if (canTreatBoardAsCurrentFormat(aBoardInfo)) {
        return {
            ...aBoardInfo,
            version: TAZ_FORMAT_VERSION,
            boardTimeRange:
                aBoardInfo.boardTimeRange ??
                normalizeLegacyTimeRangeBoundary(
                    aBoardInfo.range_bgn,
                    aBoardInfo.range_end,
                ).rangeConfig,
        };
    }

    throw new Error('Unsupported TagAnalyzer .taz version: missing');
}

function canTreatBoardAsCurrentFormat(aBoardInfo: PersistedTazBoardInfo): boolean {
    if (!Array.isArray(aBoardInfo.panels)) {
        return false;
    }

    if (aBoardInfo.panels.length === 0) {
        return true;
    }

    return aBoardInfo.panels.every((aPanelInfo) => isPersistedPanelInfoV200(aPanelInfo));
}

function normalizePersistedBoardTime(
    aBoardTimeRange: PersistedBoardTimeRange | undefined,
): ResolvedTimeBounds {
    if (!isPersistedBoardTimeRange(aBoardTimeRange)) {
        throw new Error('Unsupported TagAnalyzer .taz boardTimeRange shape.');
    }

    return normalizeTimeRangeConfig(aBoardTimeRange);
}

function isPersistedBoardTimeRange(
    aBoardTimeRange: PersistedBoardTimeRange | undefined,
): aBoardTimeRange is PersistedBoardTimeRange {
    if (!aBoardTimeRange || typeof aBoardTimeRange !== 'object') {
        return false;
    }

    return (
        isTimeBoundary(aBoardTimeRange.start) &&
        isTimeBoundary(aBoardTimeRange.end)
    );
}

function isTimeBoundary(aBoundary: unknown): aBoundary is TimeBoundary {
    if (!aBoundary || typeof aBoundary !== 'object') {
        return false;
    }

    const sBoundary = aBoundary as Record<string, unknown>;

    return (
        isEmptyBoundary(sBoundary) ||
        isAbsoluteBoundary(sBoundary) ||
        isRelativeBoundary(sBoundary) ||
        isRawBoundary(sBoundary)
    );
}

function isEmptyBoundary(aBoundary: Record<string, unknown>): boolean {
    return aBoundary.kind === 'empty';
}

function isAbsoluteBoundary(aBoundary: Record<string, unknown>): boolean {
    return aBoundary.kind === 'absolute' && typeof aBoundary.timestamp === 'number';
}

function isRelativeBoundary(aBoundary: Record<string, unknown>): boolean {
    return (
        aBoundary.kind === 'relative' &&
        (aBoundary.anchor === 'now' || aBoundary.anchor === 'last') &&
        typeof aBoundary.amount === 'number' &&
        typeof aBoundary.expression === 'string' &&
        (aBoundary.unit === undefined || typeof aBoundary.unit === 'string')
    );
}

function isRawBoundary(aBoundary: Record<string, unknown>): boolean {
    return aBoundary.kind === 'raw' && typeof aBoundary.value === 'string';
}
