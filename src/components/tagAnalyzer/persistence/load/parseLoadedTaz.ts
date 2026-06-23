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
import {
    TAZ_FORMAT_VERSION,
    TazVersion,
    isTazVersion,
} from '../TazVersion';

export { TAZ_FORMAT_VERSION, TazVersion };

export type PersistedTazVersion = TazVersion;

type NormalizedLoadedBoardMetadata = PersistedTazBoardInfo & {
    version: TazVersion;
    boardTimeRange: PersistedBoardTimeRange;
};

export function parseLoadedTaz(boardInfo: PersistedTazBoardInfo): BoardInfo {
    const sNormalizedBoardInfo = normalizeLoadedBoardMetadata(boardInfo);
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
    version: unknown = TAZ_FORMAT_VERSION,
): PanelInfo {
    const sNormalizedVersion = normalizePersistedTazVersion(version);

    return parseLoadedPanelTazByVersion(panelInfo, sNormalizedVersion);
}

export function normalizePersistedTazVersion(version: unknown): TazVersion {
    if (version === undefined || version === null) {
        return TazVersion.Legacy;
    }

    const sVersion = String(version).trim();
    if (sVersion === '') {
        return TazVersion.Legacy;
    }

    if (isTazVersion(sVersion)) {
        return sVersion;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${formatPersistedTazVersionForError(version)}`,
    );
}

export { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 };

function parseLoadedPanels(
    panels: PersistedTazPanelInfo[],
    version: TazVersion,
): PanelInfo[] {
    return panels.map((panelInfo) => parseLoadedPanelTazByVersion(panelInfo, version));
}

function parseLoadedPanelTazByVersion(
    panelInfo: unknown,
    version: TazVersion,
): PanelInfo {
    if (version === TazVersion.Legacy) {
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

    if (version === TazVersion.V204 || version === TazVersion.V205) {
        if (isPersistedPanelInfoV204(panelInfo)) {
            return parseLoadedPanelTazVer204(panelInfo);
        }

        throw new Error(`Invalid TagAnalyzer .taz ${version} panel structure.`);
    }

    if (
        version === TazVersion.V200 ||
        version === TazVersion.V201 ||
        version === TazVersion.V202 ||
        version === TazVersion.V203
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

function normalizeLoadedBoardMetadata(
    boardInfo: PersistedTazBoardInfo,
): NormalizedLoadedBoardMetadata {
    const sVersion = normalizePersistedTazVersion(boardInfo.version);

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
    boardTimeRange: PersistedBoardTimeRange,
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