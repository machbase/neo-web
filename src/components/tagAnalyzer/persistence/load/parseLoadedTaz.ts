import type { BoardInfo } from '../../domain/BoardDomain';
import type { PanelInfo } from '../../domain/PanelDomain';
import { ensureUniquePanelIndexKeys } from '../../domain/PanelIdentity';
import { normalizePersistedTimeRangeConfig } from './normalizePersistedTimeRangeConfig';
import { isLegacyFlatPanelTaz, isLegacyNestedPanelTaz, parseLoadedLegacyPanelTaz } from './LegacySupport/legacy/parseLoadedLegacyPanelTaz';
import { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 } from './LegacySupport/2.0.0/parseLoadedPanelTazVer200';
import { isPersistedPanelInfoV204, parseLoadedPanelTazVer204 } from './parseLoadedPanelTazVer204';
import { isPersistedPanelInfoV210, parseLoadedPanelTazVer210 } from './parseLoadedPanelTazVer210';
import type {
    PersistedBoardTimeRange,
    PersistedTazBoardInfo,
    PersistedTazPanelInfo,
} from '../TazPersistenceTypesV200';
import type { TimeRangeConfig } from '../../domain/time/model/TimeTypes';
import { parseTimeRangeConfigFromBoundaryValues } from '../../domain/time/boundary/TimeBoundaryInput';

export const TAZ_FORMAT_VERSION = '2.1.0';
const SUPPORTED_TAZ_FORMAT_VERSIONS = [
    '2.0.0',
    '2.0.1',
    '2.0.2',
    '2.0.3',
    '2.0.4',
    '2.0.5',
    TAZ_FORMAT_VERSION,
] as const;

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
        panels: ensureUniquePanelIndexKeys(
            parseLoadedPanels(
                sNormalizedBoardInfo.panels ?? [],
                sNormalizedBoardInfo.version,
            ),
        ),
        savedCode: sNormalizedBoardInfo.savedCode ?? false,
        boardTimeRange: sBoardTimeRange,
    };
}

export function parseLoadedPanelTaz(
    panelInfo: unknown,
    version: string | undefined = TAZ_FORMAT_VERSION,
): PanelInfo {
    const sNormalizedVersion = normalizePersistedTazVersion(version);
    assertSupportedPersistedTazVersion(sNormalizedVersion);

    return parseLoadedPanelTazByVersion(panelInfo, sNormalizedVersion);
}

export function normalizePersistedTazVersion(version: unknown): string | undefined {
    if (version === undefined || version === null) {
        return undefined;
    }

    const sVersion = String(version).trim();

    return sVersion === '' ? undefined : sVersion;
}

export { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 };

function parseLoadedPanels(
    panels: PersistedTazPanelInfo[],
    version: PersistedTazVersion | undefined,
): PanelInfo[] {
    return panels.map((panelInfo) => parseLoadedPanelTazByVersion(panelInfo, version));
}

function parseLoadedPanelTazByVersion(
    panelInfo: unknown,
    version: PersistedTazVersion | undefined,
): PanelInfo {
    if (version === undefined) {
        if (isLegacyNestedPanelTaz(panelInfo) || isLegacyFlatPanelTaz(panelInfo)) {
            return parseLoadedLegacyPanelTaz(panelInfo);
        }

        throw new Error('Invalid TagAnalyzer legacy .taz panel structure.');
    }

    if (version === TAZ_FORMAT_VERSION) {
        if (isPersistedPanelInfoV210(panelInfo)) {
            return parseLoadedPanelTazVer210(panelInfo);
        }

        throw new Error('Invalid TagAnalyzer .taz v2.1 panel structure.');
    }

    if (version === '2.0.4' || version === '2.0.5') {
        if (isPersistedPanelInfoV204(panelInfo)) {
            return parseLoadedPanelTazVer204(panelInfo);
        }

        throw new Error(`Invalid TagAnalyzer .taz ${version} panel structure.`);
    }

    if (
        version === '2.0.0' ||
        version === '2.0.1' ||
        version === '2.0.2' ||
        version === '2.0.3'
    ) {
        if (isPersistedPanelInfoV200(panelInfo)) {
            return parseLoadedPanelTazVer200(panelInfo);
        }

        throw new Error(`Invalid TagAnalyzer .taz ${version} panel structure.`);
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${formatPersistedTazVersionForError(version)}`,
    );
}

function assertSupportedPersistedTazVersion(
    version: string | undefined,
): asserts version is PersistedTazVersion | undefined {
    if (version === undefined) {
        return;
    }

    if ((SUPPORTED_TAZ_FORMAT_VERSIONS as readonly string[]).includes(version)) {
        return;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${formatPersistedTazVersionForError(version)}`,
    );
}

function normalizeLoadedBoardMetadata(
    boardInfo: PersistedTazBoardInfo,
): PersistedTazBoardInfo {
    const sVersion = normalizePersistedTazVersion(boardInfo.version);

    if (sVersion && boardInfo.boardTimeRange) {
        return {
            ...boardInfo,
            version: sVersion,
        };
    }

    return {
        ...boardInfo,
        version: sVersion,
        boardTimeRange:
            boardInfo.boardTimeRange ??
            parseTimeRangeConfigFromBoundaryValues(
                boardInfo.range_bgn ?? '',
                boardInfo.range_end ?? '',
            ),
    };
}

function normalizePersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange | undefined,
): TimeRangeConfig {
    const sNormalizedBoardTimeRange =
        normalizePersistedTimeRangeConfig(boardTimeRange);
    if (!sNormalizedBoardTimeRange) {
        throw new Error('Invalid TagAnalyzer .taz boardTimeRange structure.');
    }

    return sNormalizedBoardTimeRange;
}

function formatPersistedTazVersionForError(version: unknown): string {
    return JSON.stringify(version) ?? String(version);
}
