import type { BoardInfo } from '../../domain/BoardDomain';
import type { PanelInfo } from '../../domain/panel/PanelConfig';
import { isPlainObject } from '../../domain/ObjectGuards';
import { ensureUniquePanelIndexKeys } from '../../domain/panel/PanelIdentity';
import {
    createTimeRangeInputFromStoredValues,
    normalizePersistedTimeRangeInput,
} from './normalizePersistedTimeRangeInput';
import { isLegacyFlatPanelTaz, isLegacyNestedPanelTaz, parseLoadedLegacyPanelTaz } from './LegacySupport/legacy/parseLoadedLegacyPanelTaz';
import { isPersistedPanelInfoV200, parseLoadedPanelTazVer200 } from './LegacySupport/2.0.0/parseLoadedPanelTazVer200';
import { isPersistedPanelInfoV204, parseLoadedPanelTazVer204 } from './parseLoadedPanelTazVer204';
import { isPersistedPanelInfoV210, parseLoadedPanelTazVer210 } from './parseLoadedPanelTazVer210';
import type { PersistedBoardTimeRange } from '../TazPersistenceTypesV200';
import type { TimeRangeInput } from '../../domain/time/TimeTypes';
import {
    TAZ_FORMAT_VERSION,
    TazVersion,
    normalizePersistedTazVersion,
} from '../TazVersion';

type LoadedTazBoardData = Record<string, unknown> & {
    panels: unknown[];
    version?: unknown;
    boardTimeRange?: PersistedBoardTimeRange;
    range_bgn?: unknown;
    range_end?: unknown;
};

type NormalizedLoadedBoardMetadata = LoadedTazBoardData & {
    version: TazVersion;
    boardTimeRange: PersistedBoardTimeRange;
};

export function parseLoadedTaz(boardInfo: unknown): BoardInfo {
    const sBoardInfo = assertLoadedTazBoardData(boardInfo);
    const sNormalizedBoardInfo = normalizeLoadedBoardMetadata(sBoardInfo);
    const sBoardTimeRange = normalizePersistedBoardTimeRange(
        sNormalizedBoardInfo.boardTimeRange,
    );

    return {
        ...sNormalizedBoardInfo,
        id: normalizeLoadedString(sNormalizedBoardInfo.id),
        type: normalizeLoadedString(sNormalizedBoardInfo.type, 'taz'),
        name: normalizeLoadedString(sNormalizedBoardInfo.name),
        path: normalizeLoadedString(sNormalizedBoardInfo.path),
        code: sNormalizedBoardInfo.code ?? '',
        panels: ensureUniquePanelIndexKeys(
            parseLoadedPanels(
                sNormalizedBoardInfo.panels,
                sNormalizedBoardInfo.version,
            ),
        ),
        savedCode: normalizeLoadedSavedCode(sNormalizedBoardInfo.savedCode),
        boardTimeRange: sBoardTimeRange,
    };
}

function assertLoadedTazBoardData(boardInfo: unknown): LoadedTazBoardData {
    if (!isPlainObject(boardInfo)) {
        throw new Error('Invalid TagAnalyzer .taz board structure.');
    }

    if (!Array.isArray(boardInfo.panels)) {
        throw new Error('Invalid TagAnalyzer .taz board panels structure.');
    }

    return boardInfo as LoadedTazBoardData;
}

function parseLoadedPanels(
    panels: unknown[],
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

    throw new Error(`Unsupported TagAnalyzer .taz version: ${version}`);
}

function normalizeLoadedBoardMetadata(
    boardInfo: LoadedTazBoardData,
): NormalizedLoadedBoardMetadata {
    const sVersion = normalizePersistedTazVersion(boardInfo.version);

    return {
        ...boardInfo,
        version: sVersion,
        boardTimeRange:
            boardInfo.boardTimeRange ??
            createTimeRangeInputFromStoredValues(
                normalizeStoredTimeRangeValue(boardInfo.range_bgn),
                normalizeStoredTimeRangeValue(boardInfo.range_end),
            ),
    };
}

function normalizeLoadedString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function normalizeLoadedSavedCode(value: unknown): string | false {
    if (typeof value === 'string' || value === false) {
        return value;
    }

    return false;
}

function normalizeStoredTimeRangeValue(value: unknown): string | number {
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }

    return '';
}

function normalizePersistedBoardTimeRange(
    boardTimeRange: PersistedBoardTimeRange,
): TimeRangeInput {
    const sNormalizedBoardTimeRange =
        normalizePersistedTimeRangeInput(boardTimeRange);
    if (!sNormalizedBoardTimeRange) {
        throw new Error('Invalid TagAnalyzer .taz boardTimeRange structure.');
    }

    return sNormalizedBoardTimeRange;
}
