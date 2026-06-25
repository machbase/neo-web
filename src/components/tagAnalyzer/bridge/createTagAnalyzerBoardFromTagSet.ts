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

const isRecord = (aValue: unknown): aValue is Record<string, unknown> => {
    return typeof aValue === 'object' && aValue !== null && !Array.isArray(aValue);
};

const optionalText = (aValue: unknown, aFallback = '') => {
    if (aValue === undefined || aValue === null) return aFallback;
    const sText = String(aValue).trim();
    return sText.length > MAX_TEXT_LENGTH ? sText.slice(0, MAX_TEXT_LENGTH) : sText;
};

const requiredText = (aValue: unknown, aFieldName: string): { ok: true; value: string } | { ok: false; reason: string } => {
    const sText = optionalText(aValue);
    if (!sText) return { ok: false, reason: `${aFieldName} is required` };
    return { ok: true, value: sText };
};

type NormalizedRange = {
    min: string | number;
    max: string | number;
    startMs?: number;
    endMs?: number;
};

const normalizeTimeRange = (aRange: unknown): { ok: true; value: NormalizedRange } | { ok: false; reason: string } => {
    if (aRange === undefined || aRange === null) return { ok: true, value: { min: 'now-1h', max: 'now' } };
    if (!isRecord(aRange)) return { ok: false, reason: 'range must be an object' };

    const sStartIso = optionalText(aRange.startIso);
    const sEndIso = optionalText(aRange.endIso);
    if (sStartIso || sEndIso) {
        const sStart = Date.parse(sStartIso);
        const sEnd = Date.parse(sEndIso);
        if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) return { ok: false, reason: 'range ISO values are invalid' };
        return { ok: true, value: { min: sStartIso, max: sEndIso, startMs: sStart, endMs: sEnd } };
    }

    const sStartMs = Number(aRange.startEpochMs);
    const sEndMs = Number(aRange.endEpochMs);
    if (Number.isFinite(sStartMs) || Number.isFinite(sEndMs)) {
        if (!Number.isFinite(sStartMs) || !Number.isFinite(sEndMs) || sEndMs <= sStartMs) return { ok: false, reason: 'range epoch values are invalid' };
        return { ok: true, value: { min: sStartMs, max: sEndMs, startMs: sStartMs, endMs: sEndMs } };
    }

    return { ok: false, reason: 'range must include startIso/endIso or startEpochMs/endEpochMs' };
};

const normalizeColumnInfo = (aValue: unknown, aIndex: number): { ok: true; value: TagAnalyzerColumnInfo } | { ok: false; reason: string } => {
    if (!isRecord(aValue)) return { ok: false, reason: `tags[${aIndex}].colName is required` };

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
        if (!Number.isFinite(sTimeType)) return { ok: false, reason: `tags[${aIndex}].colName.timeType is invalid` };
        sColumnInfo.timeType = sTimeType;
    }
    if (aValue.timeBaseTime !== undefined) sColumnInfo.timeBaseTime = Boolean(aValue.timeBaseTime);
    const sJsonKey = optionalText(aValue.jsonKey);
    if (sJsonKey) sColumnInfo.jsonKey = sJsonKey;

    return { ok: true, value: sColumnInfo };
};

const normalizeTag = (aValue: unknown, aIndex: number): { ok: true; value: PanelSeriesDefinition } | { ok: false; reason: string } => {
    if (!isRecord(aValue)) return { ok: false, reason: `tags[${aIndex}] must be an object` };

    const sTagName = requiredText(aValue.tagName, `tags[${aIndex}].tagName`);
    if (!sTagName.ok) return sTagName;
    const sTable = requiredText(aValue.table, `tags[${aIndex}].table`);
    if (!sTable.ok) return sTable;
    const sColName = normalizeColumnInfo(aValue.colName, aIndex);
    if (!sColName.ok) return sColName;

    const sCalculationMode = CALCULATION_MODE_ALIASES.get(optionalText(aValue.calculationMode, 'avg').toLowerCase());
    if (!sCalculationMode) return { ok: false, reason: `tags[${aIndex}].calculationMode is invalid` };

    const sWeight = aValue.weight === undefined ? 1 : Number(aValue.weight);
    if (!Number.isFinite(sWeight)) return { ok: false, reason: `tags[${aIndex}].weight is invalid` };

    return {
        ok: true,
        value: {
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
        },
    };
};

const normalizePayload = (aPayload: unknown): { ok: true; value: Omit<TagAnalyzerBridgePayload, 'tags' | 'range'> & { range: NormalizedRange; tags: PanelSeriesDefinition[] } } | { ok: false; reason: string } => {
    if (!isRecord(aPayload)) return { ok: false, reason: 'payload is required' };
    if (!Array.isArray(aPayload.tags)) return { ok: false, reason: 'payload.tags is required' };
    if (aPayload.tags.length < 1) return { ok: false, reason: 'payload.tags must not be empty' };
    if (aPayload.tags.length > PANEL_TAG_LIMIT) return { ok: false, reason: `payload.tags supports up to ${PANEL_TAG_LIMIT} tags` };

    const sRange = normalizeTimeRange(aPayload.range);
    if (!sRange.ok) return sRange;

    const sTags: PanelSeriesDefinition[] = [];
    for (let sIndex = 0; sIndex < aPayload.tags.length; sIndex += 1) {
        const sTag = normalizeTag(aPayload.tags[sIndex], sIndex);
        if (!sTag.ok) return sTag;
        sTags.push(sTag.value);
    }

    return {
        ok: true,
        value: {
            title: optionalText(aPayload.title, 'TAG ANALYZER'),
            range: sRange.value,
            tags: sTags,
        },
    };
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

export const isOpenTagAnalyzerMessage = (aData: unknown, aAppName = TAG_ANALYZER_BRIDGE_APP_NAME): aData is TagAnalyzerBridgeMessage => {
    if (!isRecord(aData)) return false;
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
