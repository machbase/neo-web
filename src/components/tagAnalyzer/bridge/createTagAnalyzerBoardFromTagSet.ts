import { getId } from '@/utils';
import { type GBoardListType } from '@/recoil/recoil';
import { type TagAnalyzerColumnInfo } from '@/utils/tagAnalyzerFields';
import {
    PANEL_TAG_LIMIT,
    type PanelSeriesDefinition,
} from '@/components/tagAnalyzer/domain/SeriesDomain';
import type { PanelInfo } from '@/components/tagAnalyzer/domain/panel/PanelConfig';
import type { TimeRangeInput } from '@/components/tagAnalyzer/domain/time/TimeTypes';
import { formatAbsoluteTimeExpression } from '@/components/tagAnalyzer/domain/time/TimeRangeInputResolver';
import { createNewPanelInfo } from '@/components/tagAnalyzer/modal/createNewPanel/CreateNewPanelInfo';
import { TAZ_FORMAT_VERSION } from '@/components/tagAnalyzer/persistence/TazVersion';
import { isPlainObject } from '@/components/tagAnalyzer/domain/ObjectGuards';

export const NEO_PACKAGE_MESSAGE_SOURCE = 'neo-package';
export const OPEN_TAG_ANALYZER_MESSAGE_TYPE = 'neo.openTagAnalyzer';
export const OPEN_TAG_ANALYZER_MESSAGE_VERSION = 1;

const MAX_TEXT_LENGTH = 256;
export const TAG_ANALYZER_BRIDGE_APP_NAME = 'neo-pkg-opcua-client';
const CALCULATION_MODE_ALIASES = new Map([
    ['avg', 'avg'],
    ['min', 'min'],
    ['max', 'max'],
    ['sum', 'sum'],
    ['cnt', 'cnt'],
    ['count', 'cnt'],
    ['last', 'last'],
    ['first', 'first'],
]);

type TagAnalyzerBridgeRange = {
    startIso?: string;
    endIso?: string;
    startEpochMs?: number;
    endEpochMs?: number;
};

type TagAnalyzerBridgeTag = {
    tagName: string;
    table: string;
    calculationMode?: string;
    alias?: string;
    weight?: number;
    colName: TagAnalyzerColumnInfo;
};

type TagAnalyzerBridgePayload = {
    title?: string;
    range?: TagAnalyzerBridgeRange;
    tags: TagAnalyzerBridgeTag[];
};

type TagAnalyzerBridgeMessage = {
    source: typeof NEO_PACKAGE_MESSAGE_SOURCE;
    type: typeof OPEN_TAG_ANALYZER_MESSAGE_TYPE;
    version: typeof OPEN_TAG_ANALYZER_MESSAGE_VERSION;
    appName?: string;
    payload: TagAnalyzerBridgePayload;
};

type BridgeResult =
    | { status: 'ignored' }
    | { status: 'error'; reason: string }
    | {
          status: 'ok';
          board: GBoardListType & {
              version: typeof TAZ_FORMAT_VERSION;
              boardTimeRange: TimeRangeInput;
              panels: PanelInfo[];
          };
      };

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(aValue: T): Result<T> => ({ ok: true, value: aValue });
const fail = (aReason: string): { ok: false; reason: string } => ({ ok: false, reason: aReason });

const optionalText = (aValue: unknown, aFallback = '') => {
    if (aValue === undefined || aValue === null) return aFallback;
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
    startMs?: number;
    endMs?: number;
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
        return ok({ min: sStartIso, max: sEndIso, startMs: sStart, endMs: sEnd });
    }

    const sStartMs = Number(aRange.startEpochMs);
    const sEndMs = Number(aRange.endEpochMs);
    if (Number.isFinite(sStartMs) || Number.isFinite(sEndMs)) {
        if (!Number.isFinite(sStartMs) || !Number.isFinite(sEndMs) || sEndMs <= sStartMs) return fail('range epoch values are invalid');
        return ok({ min: sStartMs, max: sEndMs, startMs: sStartMs, endMs: sEndMs });
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
    if (aValue.timeBaseTime !== undefined) sColumnInfo.timeBaseTime = Boolean(aValue.timeBaseTime);
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

    const sCalculationMode = CALCULATION_MODE_ALIASES.get(optionalText(aValue.calculationMode, 'avg').toLowerCase());
    if (!sCalculationMode) return fail(`tags[${aIndex}].calculationMode is invalid`);

    const sWeight = aValue.weight === undefined ? 1 : Number(aValue.weight);
    if (!Number.isFinite(sWeight)) return fail(`tags[${aIndex}].weight is invalid`);

    return ok({
        key: getId(),
        sourceTagName: sTagName.value,
        table: sTable.value,
        calculationMode: sCalculationMode,
        alias: optionalText(aValue.alias),
        color: undefined,
        weight: sWeight,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: sColName.value,
    });
};

type NormalizedPayload = Omit<TagAnalyzerBridgePayload, 'tags' | 'range'> & {
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
        title: optionalText(aPayload.title, 'TAG ANALYZER'),
        range: sRange.value,
        tags: sTags,
    });
};

const createBoardTimeRange = (range: NormalizedRange): TimeRangeInput => {
    return {
        start: formatBridgeRangeInputValue(range.min),
        end: formatBridgeRangeInputValue(range.max),
    };
};

function formatBridgeRangeInputValue(value: string | number): string {
    return typeof value === 'number'
        ? formatAbsoluteTimeExpression(value)
        : value;
}

const createPanel = (
    title: string,
    tagSet: PanelSeriesDefinition[],
): PanelInfo => {
    return createNewPanelInfo(
        tagSet,
        title,
        'Line',
    );
};

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

    const sId = getId();
    const sPanel = createPanel(
        sPayload.value.title || 'TAG ANALYZER',
        sPayload.value.tags,
    );

    return {
        status: 'ok',
        board: {
            id: sId,
            path: '/',
            type: 'taz',
            version: TAZ_FORMAT_VERSION,
            name: `${sPayload.value.title || 'TAG ANALYZER'}.taz`,
            panels: [sPanel],
            sheet: [],
            code: '',
            savedCode: false,
            range_bgn: String(sPayload.value.range.min ?? ''),
            range_end: String(sPayload.value.range.max ?? ''),
            boardTimeRange: createBoardTimeRange(sPayload.value.range),
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
