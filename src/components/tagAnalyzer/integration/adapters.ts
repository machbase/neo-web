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
    hasMixedXAxisValueKinds,
    isNumericBaseTimeSourceColumns,
    MIXED_X_AXIS_KIND_WARNING,
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

/**
 * A window, tagged with which axis it measures.
 *
 * The tag is not decoration. A numeric window is a run of ordinary finite numbers, and so is a
 * millisecond window: `0 ~ 1000` satisfies every check either branch could make. Without a
 * discriminator the only way to tell them apart is to guess from the field names the sender
 * happened to use, and a wrong guess does not fail — it opens a distance board showing the first
 * second of 1970. Carrying the kind lets the board build cross-check it against the columns.
 *
 * `absent` is a third answer, distinct from an invalid window: the sender said nothing about a
 * range, and the default that fills in depends on the axis, which is not known here.
 */
type NormalizedRange =
    | { kind: 'absent' }
    | { kind: 'time'; min: string | number; max: string | number }
    | { kind: 'numeric'; min: number; max: number };

const normalizeRange = (aRange: unknown): Result<NormalizedRange> => {
    if (aRange === undefined || aRange === null) return ok({ kind: 'absent' });
    if (!isPlainObject(aRange)) return fail('range must be an object');

    // Checked before the time vocabularies: a numeric sender states `startValue`/`endValue` and
    // nothing else, so reaching a date parse with those in hand means the branch order is wrong.
    if (aRange.startValue !== undefined || aRange.endValue !== undefined) {
        const sStartValue = Number(aRange.startValue);
        const sEndValue = Number(aRange.endValue);
        if (!Number.isFinite(sStartValue) || !Number.isFinite(sEndValue) || sEndValue <= sStartValue) {
            return fail('range numeric values are invalid');
        }
        return ok({ kind: 'numeric', min: sStartValue, max: sEndValue });
    }

    const sStartIso = optionalText(aRange.startIso);
    const sEndIso = optionalText(aRange.endIso);
    if (sStartIso || sEndIso) {
        const sStart = Date.parse(sStartIso);
        const sEnd = Date.parse(sEndIso);
        if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) return fail('range ISO values are invalid');
        return ok({ kind: 'time', min: sStartIso, max: sEndIso });
    }

    const sStartMs = Number(aRange.startEpochMs);
    const sEndMs = Number(aRange.endEpochMs);
    if (Number.isFinite(sStartMs) || Number.isFinite(sEndMs)) {
        if (!Number.isFinite(sStartMs) || !Number.isFinite(sEndMs) || sEndMs <= sStartMs) return fail('range epoch values are invalid');
        return ok({ kind: 'time', min: sStartMs, max: sEndMs });
    }

    return fail('range must include startIso/endIso, startEpochMs/endEpochMs, or startValue/endValue');
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
    isNumericBase: boolean;
};

const normalizePayload = (aPayload: unknown): Result<NormalizedPayload> => {
    if (!isPlainObject(aPayload)) return fail('payload is required');
    if (!Array.isArray(aPayload.tags)) return fail('payload.tags is required');
    if (aPayload.tags.length < 1) return fail('payload.tags must not be empty');
    if (aPayload.tags.length > PANEL_TAG_LIMIT) return fail(`payload.tags supports up to ${PANEL_TAG_LIMIT} tags`);

    const sRange = normalizeRange(aPayload.range);
    if (!sRange.ok) return sRange;

    const sTags: PanelSeriesDefinition[] = [];
    for (let sIndex = 0; sIndex < aPayload.tags.length; sIndex += 1) {
        const sTag = normalizeTag(aPayload.tags[sIndex], sIndex);
        if (!sTag.ok) return sTag;
        sTags.push(sTag.value);
    }

    // One chart, one x-axis. A payload naming both a datetime base and a numeric one describes a
    // board that cannot be drawn, and the board already refuses this combination once it is open —
    // refusing it at the door names the sender instead of the board.
    if (hasMixedXAxisValueKinds(sTags)) return fail(MIXED_X_AXIS_KIND_WARNING);

    // The columns are the authority on which axis this board has: the payload states the base
    // column's own type, and every other reader in Tag Analyzer derives the axis from exactly this
    // predicate. The range only gets to agree or be rejected.
    const sIsNumericBase = isNumericBaseTimeSourceColumns(sTags[0].sourceColumns);

    // The check the 1970 board was missing. Both windows are finite numbers, so neither side can
    // catch this alone — only holding the range and the columns together can.
    if (sIsNumericBase && sRange.value.kind === 'time') {
        return fail('range must be numeric when the base column is not a datetime column');
    }
    if (!sIsNumericBase && sRange.value.kind === 'numeric') {
        return fail('range must be a time range when the base column is a datetime column');
    }

    return ok({
        title: optionalText(aPayload.title) || 'TAG ANALYZER',
        range: sRange.value,
        tags: sTags,
        isNumericBase: sIsNumericBase,
    });
};

function formatBridgeRangeInputValue(value: string | number): string {
    return typeof value === 'number'
        ? formatAbsoluteTime(value)
        : value;
}

const EMPTY_BRIDGE_RANGE: RangeExpressionInput = { start: '', end: '' };

/**
 * The window as the board's range input.
 *
 * The `absent` defaults differ per axis and that asymmetry is real, not an oversight: `now-1h ~ now`
 * is the sensible opening window for a time board, and there is no numeric equivalent — a distance
 * axis has no "now" to count back from, and inventing `0 ~ 1` would be a claim about the data. A
 * numeric board with no stated window opens blank and waits, exactly as `createDefaultTazBoard`
 * leaves it when the range it was handed is not usable.
 */
function resolveBridgeRangeInput(range: NormalizedRange, isNumericBase: boolean): RangeExpressionInput {
    if (range.kind === 'absent') {
        return isNumericBase ? EMPTY_BRIDGE_RANGE : { start: 'now-1h', end: 'now' };
    }
    if (range.kind === 'numeric') {
        return { start: formatNumericValue(range.min), end: formatNumericValue(range.max) };
    }
    return {
        start: formatBridgeRangeInputValue(range.min),
        end: formatBridgeRangeInputValue(range.max),
    };
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
    const { title, range, tags, isNumericBase } = sPayload.value;
    // Which axis holds the window, and how its ends are written. `formatNumericValue` for a numeric
    // base and `formatAbsoluteTimeExpression` for a datetime one — the same pairing
    // `createDefaultTazBoard` makes, because a board opened through this bridge and a board opened
    // from the setup dialog have to be the same board.
    const sRangeInput: RangeExpressionInput = resolveBridgeRangeInput(range, isNumericBase);

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
            range_bgn: sRangeInput.start,
            range_end: sRangeInput.end,
            // Exactly one of these carries the window; the idle axis is blank rather than stale, so
            // a later axis switch cannot resurrect a window that was never valid for it.
            boardTimeRange: isNumericBase ? EMPTY_BRIDGE_RANGE : sRangeInput,
            boardNumericRange: isNumericBase ? sRangeInput : EMPTY_BRIDGE_RANGE,
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
