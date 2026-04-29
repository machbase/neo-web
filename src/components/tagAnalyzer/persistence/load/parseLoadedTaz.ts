import type { BoardInfo } from '../../panel/BoardTypes';
import type { PanelInfo } from '../../utils/panelModelTypes';
import type { TimeBoundary } from '../../time/TimeTypes';
import { isLegacyFlatPanelTaz, isLegacyNestedPanelTaz, parseLoadedLegacyPanelTaz } from './LegacySupport/parseLoadedLegacyPanelTaz';
import { parseStoredTimeRangeBoundary } from './LegacySupport/StoredTimeBoundaryParser';
import { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 } from './Ver200/parseLoadedPanelTazVer200';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from '../TazPersistenceTypesV200';

export const TAZ_FORMAT_VERSION = '2.0.0';

export type PersistedTazVersion = typeof TAZ_FORMAT_VERSION;

export function parseLoadedTaz(boardInfo: PersistedTazBoardInfo): BoardInfo {
    const sNormalizedBoardInfo = normalizeLoadedBoardMetadata(boardInfo);
    assertSupportedPersistedTazVersion(sNormalizedBoardInfo.version);
    const sBoardTimeRange = normalizePersistedBoardTimeRange(
        sNormalizedBoardInfo.boardTimeRange,
    );

    return {
        ...sNormalizedBoardInfo,
        name: sNormalizedBoardInfo.name ?? '',
        path: sNormalizedBoardInfo.path ?? '',
        code: sNormalizedBoardInfo.code ?? '',
        panels: parseLoadedPanels(sNormalizedBoardInfo.panels ?? []),
        savedCode: sNormalizedBoardInfo.savedCode ?? false,
        boardTimeRange: sBoardTimeRange,
    };
}

export function parseLoadedPanelTaz(panelInfo: unknown): PanelInfo {
    if (isPersistedPanelInfoV200(panelInfo)) {
        return parseLoadedPanelTazVer200(panelInfo);
    }

    if (isLegacyNestedPanelTaz(panelInfo) || isLegacyFlatPanelTaz(panelInfo)) {
        return parseLoadedLegacyPanelTaz(panelInfo);
    }

    throw new Error('Unsupported TagAnalyzer .taz panel shape.');
}

export { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 };

function parseLoadedPanels(panels: PersistedTazPanelInfo[]): PanelInfo[] {
    return panels.map((panelInfo) => parseLoadedPanelTaz(panelInfo));
}

function assertSupportedPersistedTazVersion(
    version: string | undefined,
): asserts version is PersistedTazVersion {
    if (version === TAZ_FORMAT_VERSION) {
        return;
    }

    throw new Error(`Unsupported TagAnalyzer .taz version: ${version ?? 'missing'}`);
}

function normalizeLoadedBoardMetadata(
    boardInfo: PersistedTazBoardInfo,
): PersistedTazBoardInfo {
    if (boardInfo.version && boardInfo.boardTimeRange) {
        return boardInfo;
    }

    return {
        ...boardInfo,
        version: boardInfo.version ?? TAZ_FORMAT_VERSION,
        boardTimeRange:
            boardInfo.boardTimeRange ??
            parseStoredTimeRangeBoundary(
                boardInfo.range_bgn,
                boardInfo.range_end,
            ).rangeConfig,
    };
}

function normalizePersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): PersistedBoardTimeRange {
    if (!isPersistedBoardTimeRange(boardTimeRange)) {
        throw new Error('Unsupported TagAnalyzer .taz boardTimeRange shape.');
    }

    return boardTimeRange;
}

function isPersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): boardTimeRange is PersistedBoardTimeRange {
    if (!boardTimeRange || typeof boardTimeRange !== 'object') {
        return false;
    }

    return isTimeBoundary(boardTimeRange.start) && isTimeBoundary(boardTimeRange.end);
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
