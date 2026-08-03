import { getId } from '@/utils';
import type { GBoardListType } from '@/recoil/recoil';
import type { TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import { isPlainObject } from '../objectGuards';
import {
    createDefaultTazBoard,
    createTazBoardFromTimeRange,
    type BoardInfo,
} from '../board/boardModel';
import { createNewPanelInfo } from '../panel/panelModel';
import { seriesDataApi } from '../api/seriesDataApi';
import {
    createPanelSeriesDefinition,
    normalizePanelSeriesCalculationMode,
    PANEL_TAG_LIMIT,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../seriesModel';
import { formatAbsoluteTime } from '../persistence/serializeRange';
import type { RangeExpressionInput } from '../range/rangeModel';

type DashboardTagAnalyzerSeries = {
    sourceTagName: string;
    table: string;
    alias?: string;
    sourceColumns: PanelSeriesSourceColumns;
};

type DashboardTagAnalyzerBoardOptions = {
    name: string;
    seriesList: DashboardTagAnalyzerSeries[];
    timeRange?: {
        start?: unknown;
        end?: unknown;
    } | null;
};

export function createTagAnalyzerBoardFromDashboard({
    name,
    seriesList,
    timeRange,
}: DashboardTagAnalyzerBoardOptions): BoardInfo {
    const sPanelSeriesList: PanelSeriesDefinition[] = seriesList.map(
        (series) => createPanelSeriesDefinition({
            key: getId(),
            tagName: series.sourceTagName,
            table: series.table,
            calculationMode: PanelSeriesCalculationMode.Average,
            alias: series.alias,
            columns: series.sourceColumns,
        }),
    );

    return createTazBoardFromTimeRange({
        id: getId(),
        path: '/',
        name: `${name}.taz`,
        chartTitle: name,
        seriesList: sPanelSeriesList,
        timeRange: {
            start: normalizeTagAnalyzerRangeValue(timeRange?.start),
            end: normalizeTagAnalyzerRangeValue(timeRange?.end),
        },
    });
}

type DatabaseTagAnalyzerBoardOptions = {
    tag: string;
    table: string;
    sourceColumns: PanelSeriesSourceColumns;
};

export async function createTagAnalyzerBoardFromDatabaseSeries({
    tag,
    table,
    sourceColumns,
}: DatabaseTagAnalyzerBoardOptions): Promise<BoardInfo> {
    const sFullRange = await seriesDataApi.fetchSeriesFullRange([
        {
            table,
            sourceTagName: tag,
            sourceColumns,
        },
    ]);

    return createDefaultTazBoard({
        tag,
        timeRange: sFullRange,
        table,
        sourceColumns,
    });
}

function normalizeTagAnalyzerRangeValue(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
}

const NEO_PACKAGE_MESSAGE_SOURCE = 'neo-package';
const OPEN_TAG_ANALYZER_MESSAGE_TYPE = 'neo.openTagAnalyzer';
const OPEN_TAG_ANALYZER_MESSAGE_VERSION = 1;

const MAX_TEXT_LENGTH = 256;
export const TAG_ANALYZER_BRIDGE_APP_NAME = 'neo-pkg-opcua-client';
type TagAnalyzerBridgeMessage = {
    source: typeof NEO_PACKAGE_MESSAGE_SOURCE;
    type: typeof OPEN_TAG_ANALYZER_MESSAGE_TYPE;
    version: typeof OPEN_TAG_ANALYZER_MESSAGE_VERSION;
    appName?: string;
    payload: unknown;
};

type BridgeResult =
    | { status: 'ignored' }
    | { status: 'error'; reason: string }
    | {
          status: 'ok';
          board: GBoardListType & BoardInfo;
      };

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(aValue: T): Result<T> => ({ ok: true, value: aValue });
const fail = (aReason: string): { ok: false; reason: string } => ({ ok: false, reason: aReason });

const optionalText = (aValue: unknown, aFallback = '') => {
    if (aValue === undefined || aValue === null) return aFallback;
    if (typeof aValue !== 'string' && typeof aValue !== 'number') {
        return aFallback;
    }
    const sText = String(aValue).trim();
    return sText.length > MAX_TEXT_LENGTH ? sText.slice(0, MAX_TEXT_LENGTH) : sText;
};

const requiredText = (aValue: unknown, aFieldName: string): Result<string> => {
    const sText = optionalText(aValue);
    if (!sText) return fail(`${aFieldName} is required`);
    return ok(sText);
};

type NormalizedRange = {
    min: string | number;
    max: string | number;
};

const normalizeTimeRange = (aRange: unknown): Result<NormalizedRange> => {
    if (aRange === undefined || aRange === null) return ok({ min: 'now-1h', max: 'now' });
    if (!isPlainObject(aRange)) return fail('range must be an object');

    const sStartIso = optionalText(aRange.startIso);
    const sEndIso = optionalText(aRange.endIso);
    if (sStartIso || sEndIso) {
        const sStart = Date.parse(sStartIso);
        const sEnd = Date.parse(sEndIso);
        if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) return fail('range ISO values are invalid');
        return ok({ min: sStartIso, max: sEndIso });
    }

    const sStartMs = Number(aRange.startEpochMs);
    const sEndMs = Number(aRange.endEpochMs);
    if (Number.isFinite(sStartMs) || Number.isFinite(sEndMs)) {
        if (!Number.isFinite(sStartMs) || !Number.isFinite(sEndMs) || sEndMs <= sStartMs) return fail('range epoch values are invalid');
        return ok({ min: sStartMs, max: sEndMs });
    }

    return fail('range must include startIso/endIso or startEpochMs/endEpochMs');
};

const normalizeColumnInfo = (aValue: unknown, aIndex: number): Result<TagAnalyzerColumnInfo> => {
    if (!isPlainObject(aValue)) return fail(`tags[${aIndex}].colName is required`);

    const sName = requiredText(aValue.name, `tags[${aIndex}].colName.name`);
    if (!sName.ok) return sName;
    const sTime = requiredText(aValue.time, `tags[${aIndex}].colName.time`);
    if (!sTime.ok) return sTime;
    const sValue = requiredText(aValue.value, `tags[${aIndex}].colName.value`);
    if (!sValue.ok) return sValue;

    const sColumnInfo: TagAnalyzerColumnInfo = {
        name: sName.value,
        time: sTime.value,
        value: sValue.value,
    };

    if (aValue.timeType !== undefined) {
        const sTimeType = Number(aValue.timeType);
        if (!Number.isFinite(sTimeType)) return fail(`tags[${aIndex}].colName.timeType is invalid`);
        sColumnInfo.timeType = sTimeType;
    }
    if (aValue.timeBaseTime !== undefined) {
        if (typeof aValue.timeBaseTime !== 'boolean') {
            return fail(`tags[${aIndex}].colName.timeBaseTime is invalid`);
        }
        sColumnInfo.timeBaseTime = aValue.timeBaseTime;
    }
    const sJsonKey = optionalText(aValue.jsonKey);
    if (sJsonKey) sColumnInfo.jsonKey = sJsonKey;

    return ok(sColumnInfo);
};

const normalizeTag = (aValue: unknown, aIndex: number): Result<PanelSeriesDefinition> => {
    if (!isPlainObject(aValue)) return fail(`tags[${aIndex}] must be an object`);

    const sTagName = requiredText(aValue.tagName, `tags[${aIndex}].tagName`);
    if (!sTagName.ok) return sTagName;
    const sTable = requiredText(aValue.table, `tags[${aIndex}].table`);
    if (!sTable.ok) return sTable;
    const sColName = normalizeColumnInfo(aValue.colName, aIndex);
    if (!sColName.ok) return sColName;

    const sCalculationMode = normalizePanelSeriesCalculationMode(
        optionalText(
            aValue.calculationMode,
            PanelSeriesCalculationMode.Average,
        ),
    );
    if (!sCalculationMode) return fail(`tags[${aIndex}].calculationMode is invalid`);

    try {
        return ok(createPanelSeriesDefinition({
            key: getId(),
            tagName: sTagName.value,
            table: sTable.value,
            calculationMode: sCalculationMode,
            alias: optionalText(aValue.alias),
            columns: sColName.value,
        }));
    } catch (error) {
        return fail(
            error instanceof Error
                ? error.message
                : `tags[${aIndex}] contains invalid SQL identifiers`,
        );
    }
};

type NormalizedPayload = {
    title: string;
    range: NormalizedRange;
    tags: PanelSeriesDefinition[];
};

const normalizePayload = (aPayload: unknown): Result<NormalizedPayload> => {
    if (!isPlainObject(aPayload)) return fail('payload is required');
    if (!Array.isArray(aPayload.tags)) return fail('payload.tags is required');
    if (aPayload.tags.length < 1) return fail('payload.tags must not be empty');
    if (aPayload.tags.length > PANEL_TAG_LIMIT) return fail(`payload.tags supports up to ${PANEL_TAG_LIMIT} tags`);

    const sRange = normalizeTimeRange(aPayload.range);
    if (!sRange.ok) return sRange;

    const sTags: PanelSeriesDefinition[] = [];
    for (let sIndex = 0; sIndex < aPayload.tags.length; sIndex += 1) {
        const sTag = normalizeTag(aPayload.tags[sIndex], sIndex);
        if (!sTag.ok) return sTag;
        sTags.push(sTag.value);
    }

    return ok({
        title: optionalText(aPayload.title) || 'TAG ANALYZER',
        range: sRange.value,
        tags: sTags,
    });
};

function formatBridgeRangeInputValue(value: string | number): string {
    return typeof value === 'number'
        ? formatAbsoluteTime(value)
        : value;
}

const isOpenTagAnalyzerMessage = (aData: unknown, aAppName = TAG_ANALYZER_BRIDGE_APP_NAME): aData is TagAnalyzerBridgeMessage => {
    if (!isPlainObject(aData)) return false;
    return (
        aData.source === NEO_PACKAGE_MESSAGE_SOURCE &&
        aData.type === OPEN_TAG_ANALYZER_MESSAGE_TYPE &&
        aData.version === OPEN_TAG_ANALYZER_MESSAGE_VERSION &&
        aData.appName === aAppName
    );
};

export const createTagAnalyzerBoardFromPayload = (aPayload: unknown): Exclude<BridgeResult, { status: 'ignored' }> => {
    const sPayload = normalizePayload(aPayload);
    if (!sPayload.ok) return { status: 'error', reason: sPayload.reason };
    const { title, range, tags } = sPayload.value;
    const sRangeInput: RangeExpressionInput = {
        start: formatBridgeRangeInputValue(range.min),
        end: formatBridgeRangeInputValue(range.max),
    };

    return {
        status: 'ok',
        board: {
            id: getId(),
            path: '/',
            type: 'taz',
            name: `${title}.taz`,
            panels: [createNewPanelInfo(tags, title, 'Line')],
            sheet: [],
            code: '',
            savedCode: false,
            range_bgn: String(range.min),
            range_end: String(range.max),
            boardTimeRange: sRangeInput,
            boardNumericRange: { start: '', end: '' },
            shell: { icon: 'chart-line', theme: '', id: 'TAZ' },
            dashboard: {
                timeRange: {
                    start: 'now-3h',
                    end: 'now',
                    refresh: 'Off',
                },
                panels: [],
            },
        },
    };
};

export const createTagAnalyzerBoardFromTagSet = (aData: unknown, aAppName = TAG_ANALYZER_BRIDGE_APP_NAME): BridgeResult => {
    if (!isOpenTagAnalyzerMessage(aData, aAppName)) return { status: 'ignored' };

    return createTagAnalyzerBoardFromPayload(aData.payload);
};
