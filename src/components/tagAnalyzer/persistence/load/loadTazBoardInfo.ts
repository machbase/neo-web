import { concatTagSet } from '@/utils/helpers/tags';
import { validateAndRepairTazPanel } from '@/utils/panelValidator';
import type { BoardInfo } from '../../domain/BoardDomain';
import { isPlainObject } from '../../domain/ObjectGuards';
import { isLegacyNestedPanelTaz } from './LegacySupport/legacy/parseLoadedLegacyPanelTaz';
import {
    createTazSavedCodeFromBoardInfo,
    normalizeTazBoardForSavedState,
} from '../save/SavedTazBoardSnapshot';
import { parseLoadedTaz } from './parseLoadedTaz';
import { normalizePersistedTazVersion, TazVersion } from '../TazVersion';

type LoadedTazData = Record<string, unknown> & {
    panels: unknown[];
    version?: unknown;
};

type LegacyPanelRepairResult = {
    panel: unknown;
    repaired: boolean;
    repairedKeys: string[];
    errors: string[];
    valid: boolean;
};

export function loadTazBoardInfo(
    parsedTaz: unknown,
    id: string,
    name: string,
    path: string,
): BoardInfo {
    const sLoadedTaz = cloneLoadedTazObject(parsedTaz);
    const sCompatibleTaz = applyTazCompatibility(sLoadedTaz);
    const sRuntimeBoardInfo = parseLoadedTaz(sCompatibleTaz);
    const sBoardInfo: BoardInfo = normalizeTazBoardForSavedState({
        ...sRuntimeBoardInfo,
        id,
        name,
        path,
        type: 'taz',
        code: '',
    });

    return {
        ...sBoardInfo,
        savedCode: createTazSavedCodeFromBoardInfo(sBoardInfo),
    };
}

function applyTazCompatibility(tazInfo: LoadedTazData): LoadedTazData {
    const sTazInfo = tazInfo;
    const sVersion = normalizePersistedTazVersion(sTazInfo.version);

    if (!Array.isArray(sTazInfo.panels) || sTazInfo.panels.length === 0) {
        return sTazInfo;
    }

    sTazInfo.panels = sTazInfo.panels
        .map((panel) => repairLegacyPanelIfNeeded(panel, sVersion))
        .filter((panel) => !hasValidationError(panel))
        .map(normalizeTazPanelSeriesCompatibility);

    return sTazInfo;
}

function repairLegacyPanelIfNeeded(
    panel: unknown,
    version: TazVersion,
): unknown {
    const sShouldRepairLegacyPanel =
        version === TazVersion.Legacy && !isLegacyNestedPanelTaz(panel);
    const sResult: LegacyPanelRepairResult = sShouldRepairLegacyPanel
        ? validateAndRepairTazPanel(panel)
        : createValidPanelRepairResult(panel);

    return sResult.valid ? sResult.panel : markValidationError(sResult.panel);
}

function createValidPanelRepairResult(panel: unknown): LegacyPanelRepairResult {
    return {
        panel,
        repaired: false,
        repairedKeys: [],
        errors: [],
        valid: true,
    };
}

function markValidationError(panel: unknown): Record<string, unknown> {
    return {
        ...(isPlainObject(panel) ? panel : {}),
        _validationError: true,
    };
}

function hasValidationError(panel: unknown): boolean {
    return isPlainObject(panel) && panel._validationError === true;
}

function cloneLoadedTazObject(parsedTaz: unknown): LoadedTazData {
    if (!isPlainObject(parsedTaz)) {
        throw new Error('Invalid TagAnalyzer .taz board structure.');
    }

    if (!Array.isArray(parsedTaz.panels)) {
        throw new Error('Invalid TagAnalyzer .taz board panels structure.');
    }

    return JSON.parse(JSON.stringify(parsedTaz)) as LoadedTazData;
}

function normalizeTazPanelSeriesCompatibility(panel: unknown): unknown {
    if (!isPlainObject(panel)) {
        return panel;
    }

    const sData = getRecordProperty(panel, 'data');
    const sDataTagSet = getArrayProperty(sData, 'tag_set');
    if (sData && sDataTagSet) {
        return {
            ...panel,
            highlights: normalizePanelHighlights(panel),
            data: {
                ...sData,
                tag_set: normalizeSeriesListForCompatibility(sDataTagSet),
            },
        };
    }

    const sDataSeriesList = getArrayProperty(sData, 'seriesList');
    if (sData && sDataSeriesList) {
        return {
            ...panel,
            highlights: normalizePanelHighlights(panel),
            data: {
                ...sData,
                seriesList: normalizeSeriesListForCompatibility(sDataSeriesList),
            },
        };
    }

    const sTagSet = getArrayProperty(panel, 'tag_set');
    if (sTagSet) {
        return {
            ...panel,
            tag_set: ensureColoredSeries(sTagSet),
        };
    }

    return panel;
}

function normalizePanelHighlights(panel: Record<string, unknown>): unknown[] {
    return Array.isArray(panel.highlights) ? panel.highlights : [];
}

function normalizeSeriesListForCompatibility(seriesList: unknown[]): unknown[] {
    return ensureColoredSeries(seriesList).map(ensureSeriesAnnotationShape);
}

function ensureLegacyColumnShape(series: unknown): unknown {
    if (!isPlainObject(series)) {
        return series;
    }

    const sColName = isPlainObject(series.colName) ? series.colName : undefined;

    return {
        ...series,
        colName: sColName
            ? {
                  ...sColName,
                  jsonKey: sColName.jsonKey ?? '',
              }
            : series.colName,
    };
}

function ensureSeriesAnnotationShape(series: unknown): unknown {
    const sSeries = ensureLegacyColumnShape(series);

    if (!isPlainObject(sSeries)) {
        return sSeries;
    }

    return {
        ...sSeries,
        annotations: Array.isArray(sSeries.annotations) ? sSeries.annotations : [],
    };
}

function ensureColoredSeries(seriesList: unknown[]): unknown[] {
    const sSeriesList = seriesList.map(ensureLegacyColumnShape);
    const sFirstSeries = sSeriesList[0];

    if (isPlainObject(sFirstSeries) && sFirstSeries.color) {
        return sSeriesList;
    }

    return concatTagSet([], sSeriesList) as unknown[];
}

function getRecordProperty(
    source: Record<string, unknown> | undefined,
    key: string,
): Record<string, unknown> | undefined {
    if (!source) {
        return undefined;
    }

    const sValue = source[key];

    return isPlainObject(sValue) ? sValue : undefined;
}

function getArrayProperty(
    source: Record<string, unknown> | undefined,
    key: string,
): unknown[] | undefined {
    if (!source) {
        return undefined;
    }

    const sValue = source[key];

    return Array.isArray(sValue) ? sValue : undefined;
}