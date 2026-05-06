import type { BoardInfo } from '../../BoardTypes';
import type { PanelInfo } from '../../utils/panelModelTypes';
import { parsePersistedTimeRangeConfigFromBoundaryValues } from './LegacySupport/legacy/PersistedTimeBoundaryValueParser';
import { normalizePersistedTimeRangeConfig } from './normalizePersistedTimeRangeConfig';
import { isLegacyFlatPanelTaz, isLegacyNestedPanelTaz, parseLoadedLegacyPanelTaz } from './LegacySupport/legacy/parseLoadedLegacyPanelTaz';
import { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 } from './LegacySupport/2.0.0/parseLoadedPanelTazVer200';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from '../TazPersistenceTypesV200';

export const TAZ_FORMAT_VERSION = '2.0.1';
const SUPPORTED_TAZ_FORMAT_VERSIONS = ['2.0.0', TAZ_FORMAT_VERSION] as const;

export type PersistedTazVersion = (typeof SUPPORTED_TAZ_FORMAT_VERSIONS)[number];

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
    if (
        version &&
        (SUPPORTED_TAZ_FORMAT_VERSIONS as readonly string[]).includes(version)
    ) {
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
            parsePersistedTimeRangeConfigFromBoundaryValues(
                boardInfo.range_bgn ?? '',
                boardInfo.range_end ?? '',
            ),
    };
}

function normalizePersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): PersistedBoardTimeRange {
    const sNormalizedBoardTimeRange =
        normalizePersistedTimeRangeConfig(boardTimeRange);
    if (!sNormalizedBoardTimeRange) {
        throw new Error('Unsupported TagAnalyzer .taz boardTimeRange shape.');
    }

    return sNormalizedBoardTimeRange;
}

