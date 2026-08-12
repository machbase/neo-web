import { asRecord, isFiniteNumber, isPlainObject } from '../objectGuards';
import {
    AUTO_VALUE_RANGE,
    clonePanelYAxis,
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    DEFAULT_RAW_NAVIGATOR_SAMPLING,
    PANEL_ECHART_TYPE_VALUES,
    type PanelAnnotation,
    type PanelAxes,
    type PanelAxisThreshold,
    type PanelDisplay,
    type PanelEChartType,
    type PanelHighlight,
    type PanelInfo,
    type PanelSampling,
    type PanelYAxis,
    type ValueRange,
} from '../panel/panelModel';
import type { BoardInfo } from '../board/boardModel';
import {
    decodePersistedTimeUnit,
    formatAbsoluteTime,
    formatNumericExpression,
    formatNumericValue,
    formatRelativeTime,
    isValidTimeExpression,
    parseAbsoluteTime,
    parseNumericExpression,
    decodeAxisRange,
    encodeAxisRange,
    type PersistedAxisRange,
} from './serializeRange';
import { TimeUnit } from '../range/intervalResolver';
import {
    type RangeExpressionInput,
    type AxisRange,
    type RangeState,
} from '../range/rangeModel';
import {
    DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    assertCompatiblePanelSeriesList,
    normalizePanelSeriesDefinitions,
    shouldUseNumericPanelRangeInput,
} from '../seriesModel';
import {
    decodePersistedPanelRangeState,
    encodePersistedPanelRangeState,
    type PersistedPanelRangeState,
} from './persistedPanelRange';

export enum TazVersion {
    Legacy = 'legacy',
    V200 = '2.0.0',
    V201 = '2.0.1',
    V202 = '2.0.2',
    V203 = '2.0.3',
    V204 = '2.0.4',
    V205 = '2.0.5',
    V210 = '2.1.0',
}

export const TAZ_FORMAT_VERSION = TazVersion.V210;

const TAZ_VERSIONS = new Set(Object.values(TazVersion));

function isTazVersion(value: unknown): value is TazVersion {
    return typeof value === 'string' && TAZ_VERSIONS.has(value as TazVersion);
}

export function normalizePersistedTazVersion(version: unknown): TazVersion {
    const sVersion = String(version ?? '').trim();
    if (sVersion === '') {
        return TazVersion.Legacy;
    }

    if (isTazVersion(sVersion)) {
        return sVersion;
    }

    throw new Error(
        `Unsupported TagAnalyzer .taz version: ${JSON.stringify(version) ?? String(version)}`,
    );
}

// Returns a user-facing warning when a board was loaded from an older .taz
// format that should be re-saved, or undefined when no warning is warranted.
export function getOutdatedTazFormatWarning(
    version: string | undefined,
    panelCount: number,
): string | undefined {
    if (version === TAZ_FORMAT_VERSION) {
        return undefined;
    }

    // A brand-new, empty board has nothing worth migrating.
    if ((version === undefined || version === TazVersion.Legacy) && panelCount === 0) {
        return undefined;
    }

    const sDisplayVersion = version ?? TazVersion.Legacy;
    return `Loaded older TAZ format (${sDisplayVersion}). Current format is ${TAZ_FORMAT_VERSION}. Save the board to update it.`;
}

export type PersistedTimedMarkupInput = {
    text: string;
    timeRange: PersistedAxisRange;
    fillColor?: string;
    textColor?: string;
    clip?: boolean;
};

export type PersistedPanelAnnotationInput = PersistedTimedMarkupInput & {
    seriesKey: string;
};

export type PersistedBoardRange = {
    start?: unknown;
    end?: unknown;
};

export type PersistedPanelSeries = {
    key: string;
    table: string;
    sourceTagName: string;
    alias: string;
    calculationMode: string;
    color?: string;
    useSecondaryAxis: boolean;
    id?: string;
    useRollupTable: boolean;
    sourceColumns: {
        name: string;
        time: string;
        value: string;
        jsonKey?: string;
        timeType?: number;
        timeBaseTime?: boolean;
    };
};

type PersistedPanelTimeRangeV210 = RangeExpressionInput & {
    useLastViewedRange?: boolean;
    lastViewedRange?: PersistedPanelRangeState;
};

type PersistedPanelInfoV210 = {
    key: string;
    title: string;
    query: {
        tagSet: PersistedPanelSeries[];
        intervalType: TimeUnit | undefined;
        count: number;
    };
    mode: {
        isRaw: boolean;
        isOrderBy: boolean;
        useNormalize: boolean;
    };
    timeRange: PersistedPanelTimeRangeV210;
    axes: PanelAxes;
    // Same shape as the runtime PanelDisplay, plus the legacy `raw` tick density
    // that older readers still expect.
    display: Omit<PanelDisplay, 'pixelsPerTick'> & {
        pixelsPerTick: PanelDisplay['pixelsPerTick'] & { raw: number };
    };
    highlights: PersistedTimedMarkupInput[];
    annotations: PersistedPanelAnnotationInput[];
};

type PersistedTazBoardInfoV210 = {
    id: string;
    type: string;
    version: TazVersion.V210;
    boardTimeRange: PersistedBoardRange;
    boardNumericRange?: PersistedBoardRange;
    panels: PersistedPanelInfoV210[];
};

const DEFAULT_PERSISTED_PANEL_ECHART_TYPE: PanelEChartType = 'Line';

function isPersistedPanelEChartType(value: unknown): value is PanelEChartType {
    return (
        typeof value === 'string' &&
        (PANEL_ECHART_TYPE_VALUES as readonly string[]).includes(value)
    );
}

export function normalizePersistedPanelChartType(
    value: unknown,
): PanelEChartType {
    return isPersistedPanelEChartType(value)
        ? value
        : DEFAULT_PERSISTED_PANEL_ECHART_TYPE;
}

function normalizePersistedValueRange(
    valueRange: unknown,
): ValueRange | undefined {
    const sValueRange = asRecord(valueRange);
    if (!sValueRange) {
        return undefined;
    }

    const sMin = sValueRange.min;
    const sMax = sValueRange.max;

    if (
        (sMin === undefined && sMax === undefined) ||
        (sMin === 0 && sMax === 0)
    ) {
        return { ...AUTO_VALUE_RANGE };
    }

    return isFiniteNumber(sMin) && isFiniteNumber(sMax) && sMin < sMax
        ? { min: sMin, max: sMax }
        : undefined;
}

export function normalizePersistedValueRangeOrAuto(
    valueRange: unknown,
): ValueRange {
    return normalizePersistedValueRange(valueRange) ?? { ...AUTO_VALUE_RANGE };
}

export function parsePersistedValueRangeOrThrow(
    valueRange: unknown,
    errorMessage: string,
): ValueRange {
    const sValueRange = normalizePersistedValueRange(valueRange);
    if (!sValueRange) {
        throw new Error(errorMessage);
    }
    return sValueRange;
}

// Board time range persists as raw expression strings (TAZ 2.1.0): { start, end }
// where each side is "now", "now-1h", "first", "first+2d", "last-2d", an
// absolute "YYYY-MM-DD HH:mm:ss", or "" (empty). Older files stored each side
// as a structured time-range object;
// those are converted to the equivalent expression string here so they still load.
export function normalizePersistedTimeRangeInput(
    rangeConfig: unknown,
): RangeExpressionInput | undefined {
    return normalizePersistedRangeInput(rangeConfig, normalizePersistedTimeExpression);
}

export function createTimeRangeInputFromStoredValues(
    startValue: string | number,
    endValue: string | number,
): RangeExpressionInput {
    return {
        start: normalizeStoredTimeRangeExpression(startValue),
        end: normalizeStoredTimeRangeExpression(endValue),
    };
}

function normalizeStoredTimeRangeExpression(value: string | number): string {
    return typeof value === 'number'
        ? formatAbsoluteTime(value)
        : value.trim();
}

function normalizePersistedTimeExpression(
    value: unknown,
): string | undefined {
    if (typeof value === 'string') {
        return value;
    }

    const sRangeValue = asRecord(value);
    if (!sRangeValue) {
        return undefined;
    }

    const sKind = sRangeValue.kind;

    if (sKind === 'empty') {
        return '';
    }

    if (sKind === 'absolute' && typeof sRangeValue.timestamp === 'number') {
        return formatAbsoluteTime(sRangeValue.timestamp);
    }

    if (sKind === 'now' || sKind === 'last') {
        return formatLegacyAnchoredExpression(sKind, sRangeValue);
    }

    if (
        sKind === 'relative' &&
        (sRangeValue.anchor === 'now' || sRangeValue.anchor === 'last')
    ) {
        return formatLegacyAnchoredExpression(sRangeValue.anchor, sRangeValue);
    }

    return undefined;
}

function formatLegacyAnchoredExpression(
    anchor: 'now' | 'last',
    rangeValue: Record<string, unknown>,
): string {
    if (typeof rangeValue.offsetMilliseconds === 'number') {
        return formatRelativeTime(
            anchor,
            Math.max(rangeValue.offsetMilliseconds, 0),
            TimeUnit.Millisecond,
        );
    }

    if (typeof rangeValue.amount === 'number') {
        const sUnit =
            typeof rangeValue.unit === 'string'
                ? decodePersistedTimeUnit(rangeValue.unit) ?? TimeUnit.Millisecond
                : TimeUnit.Millisecond;

        return formatRelativeTime(anchor, rangeValue.amount, sUnit);
    }

    return anchor;
}

// Panel ranges persist as raw expression strings ({ start, end }) interpreted by
// the panel's x-axis kind. Older files stored each side as a structured range value
// object (timestamp_*/numeric_* kinds) or a raw number; those are converted to the
// equivalent expression string here so they still load.
export function normalizePersistedPanelRangeInput(
    rangeConfig: unknown,
    isNumericAxis: boolean,
): RangeExpressionInput | undefined {
    return normalizePersistedRangeInput(
        rangeConfig,
        (value) => normalizePersistedPanelRangeValue(value, isNumericAxis),
    );
}

function normalizePersistedRangeInput(
    rangeConfig: unknown,
    normalizeEndpoint: (value: unknown) => string | undefined,
): RangeExpressionInput | undefined {
    const sRangeConfig = asRecord(rangeConfig);
    if (!sRangeConfig) {
        return undefined;
    }

    const sStart = normalizeEndpoint(sRangeConfig.start);
    const sEnd = normalizeEndpoint(sRangeConfig.end);

    return sStart === undefined || sEnd === undefined
        ? undefined
        : { start: sStart, end: sEnd };
}

function normalizePersistedPanelRangeValue(
    value: unknown,
    isNumericAxis: boolean,
): string | undefined {
    if (typeof value === 'number') {
        return isNumericAxis
            ? formatNumericValue(value)
            : formatAbsoluteTime(value);
    }

    if (typeof value === 'string') {
        return normalizePanelExpressionString(value, isNumericAxis);
    }

    const sRangeValue = asRecord(value);
    if (!sRangeValue) {
        return undefined;
    }

    return normalizeLegacyStructuredRangeValue(sRangeValue, isNumericAxis);
}

function normalizePanelExpressionString(
    value: string,
    isNumericAxis: boolean,
): string {
    const sValue = value.trim();
    if (sValue === '') {
        return '';
    }

    if (isNumericAxis) {
        const sParsed = parseNumericExpression(sValue);
        if (sParsed) {
            return formatNumericExpression(sParsed);
        }

        // A numeric panel could legacy-store an absolute datetime string.
        const sAbsolute = parseAbsoluteTime(sValue);
        return sAbsolute === undefined ? '' : formatNumericValue(sAbsolute);
    }

    return isValidTimeExpression(sValue) ? sValue : '';
}

function normalizeLegacyStructuredRangeValue(
    rangeValue: Record<string, unknown>,
    isNumericAxis: boolean,
): string {
    const sKind = rangeValue.kind;
    const sValue = typeof rangeValue.value === 'number' ? rangeValue.value : 0;

    switch (sKind) {
        case 'timestamp_empty':
        case 'numeric_empty':
            return '';
        case 'timestamp_absolute':
        case 'numeric_value':
            return isNumericAxis
                ? formatNumericValue(sValue)
                : formatAbsoluteTime(sValue);
        case 'timestamp_now':
        case 'timestamp_data_end':
            return formatRelativeTime(
                sKind === 'timestamp_now' ? 'now' : 'last',
                Math.abs(sValue),
                TimeUnit.Millisecond,
            );
        case 'numeric_data_start':
        case 'numeric_data_end':
            return formatNumericExpression({
                anchor: sKind === 'numeric_data_start'
                    ? 'data_start'
                    : 'data_end',
                offset: Math.abs(sValue),
            });
        default:
            return normalizeLegacyBoardStyleRangeValue(rangeValue, isNumericAxis);
    }
}

// Older panels could also carry a board-style range value (empty/absolute/now/last/
// relative). Reuse the board normalizer for datetime panels; map an absolute one
// to a number for numeric panels.
function normalizeLegacyBoardStyleRangeValue(
    rangeValue: Record<string, unknown>,
    isNumericAxis: boolean,
): string {
    const sExpression = normalizePersistedTimeExpression(rangeValue);
    if (sExpression === undefined || !isNumericAxis) {
        return sExpression ?? '';
    }

    const sAbsolute = parseAbsoluteTime(sExpression);
    return sAbsolute === undefined ? '' : formatNumericValue(sAbsolute);
}

function cloneTimedMarkup(
    markup: PersistedTimedMarkupInput,
    defaults: { fillColor: string; textColor: string },
    timeRange: AxisRange = {
        start: markup.timeRange.startTime,
        end: markup.timeRange.endTime,
    },
): PanelHighlight {
    return {
        text: markup.text,
        timeRange,
        fillColor: markup.fillColor ?? defaults.fillColor,
        textColor: markup.textColor ?? defaults.textColor,
    };
}

export function cloneSeriesAnnotations(
    annotations: unknown,
): Omit<PanelAnnotation, 'seriesKey'>[] {
    const sAnnotations = Array.isArray(annotations)
        ? annotations as PersistedTimedMarkupInput[]
        : [];
    return sAnnotations.map((annotation) => ({
        ...cloneTimedMarkup(annotation, {
            fillColor: DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
            textColor: DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
        }),
        clip: annotation.clip === true,
    }));
}

export function clonePanelHighlights(
    highlights: PersistedTimedMarkupInput[] | undefined,
): PanelHighlight[] {
    return (highlights ?? []).flatMap((highlight) => {
        const sTimeRange = decodeAxisRange(highlight.timeRange);
        return sTimeRange
            ? [cloneTimedMarkup(
                  highlight,
                  {
                      fillColor: DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
                      textColor: DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
                  },
                  sTimeRange,
              )]
            : [];
    });
}

export function clonePanelAnnotations(
    annotations: PersistedPanelAnnotationInput[] | undefined,
): PanelAnnotation[] {
    return (annotations ?? []).map((annotation) => ({
        ...cloneTimedMarkup(
            {
                ...annotation,
                text: annotation.text || DEFAULT_SERIES_ANNOTATION_LABEL,
            },
            {
                fillColor: DEFAULT_SERIES_ANNOTATION_FILL_COLOR,
                textColor: DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            },
        ),
        seriesKey: annotation.seriesKey,
        clip: annotation.clip === true,
    }));
}

function encodeTimedMarkup(
    markup: PanelHighlight,
): PersistedTimedMarkupInput {
    return {
        text: markup.text,
        timeRange: encodeAxisRange(markup.timeRange),
        fillColor: markup.fillColor,
        textColor: markup.textColor,
    };
}

function encodePanelAnnotation(
    annotation: PanelAnnotation,
): PersistedPanelAnnotationInput {
    return {
        ...encodeTimedMarkup(annotation),
        seriesKey: annotation.seriesKey,
        clip: annotation.clip,
    };
}

const INVALID_AXIS_RANGE_MESSAGE =
    'Invalid TagAnalyzer .taz v2.1 panel axis range structure.';

function isPersistedPanelInfoV210(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV210 {
    if (!isPlainObject(panelInfo)) return false;

    const sPanelInfo = panelInfo as Partial<PersistedPanelInfoV210>;
    return (
        typeof sPanelInfo.key === 'string' &&
        typeof sPanelInfo.title === 'string' &&
        isPlainObject(sPanelInfo.query) &&
        Array.isArray(sPanelInfo.query.tagSet) &&
        isPlainObject(sPanelInfo.mode) &&
        typeof sPanelInfo.mode.isRaw === 'boolean' &&
        typeof sPanelInfo.mode.isOrderBy === 'boolean' &&
        typeof sPanelInfo.mode.useNormalize === 'boolean' &&
        isPlainObject(sPanelInfo.timeRange) &&
        isPlainObject(sPanelInfo.axes) &&
        isPlainObject(sPanelInfo.display)
    );
}

export function parseLoadedPanelTazVer210(
    panelInfo: unknown,
): PanelInfo {
    if (!isPersistedPanelInfoV210(panelInfo)) {
        throw new Error('Invalid TagAnalyzer .taz v2.1 panel structure.');
    }

    const sTagSet = normalizePanelSeriesDefinitions(panelInfo.query.tagSet);
    if (!sTagSet) {
        throw new Error('Invalid TagAnalyzer .taz v2.1 panel series structure.');
    }
    assertCompatiblePanelSeriesList(sTagSet, 'TagAnalyzer .taz v2.1 panel');

    const sRangeInput = normalizePersistedPanelRangeInput(
        panelInfo.timeRange,
        shouldUseNumericPanelRangeInput(sTagSet),
    );
    if (!sRangeInput) {
        throw new Error('Invalid TagAnalyzer .taz v2.1 panel timeRange structure.');
    }
    const lastViewedRange: RangeState | undefined =
        decodePersistedPanelRangeState(panelInfo.timeRange.lastViewedRange);
    assertPanelMarkupList(panelInfo.highlights, false);
    assertPanelMarkupList(panelInfo.annotations, true);

    return {
        key: panelInfo.key,
        title: panelInfo.title,
        isOverlapSelected: false,
        query: {
            tagSet: sTagSet,
            intervalType: decodePersistedTimeUnit(panelInfo.query.intervalType),
        },
        mode: {
            isRaw: panelInfo.mode.isRaw,
            isOrderBy: panelInfo.mode.isOrderBy,
            useNormalize: panelInfo.mode.useNormalize,
        },
        time: {
            rangeInput: sRangeInput,
            useLastViewedRange: panelInfo.timeRange.useLastViewedRange ?? false,
            lastViewedRange,
        },
        axes: parsePersistedAxes(panelInfo.axes),
        display: parsePersistedDisplay(panelInfo.display),
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}

function parsePersistedAxes(value: unknown): PanelAxes {
    const sAxes = requireRecord(value, 'axes');
    const sXAxis = requireRecord(sAxes.x, 'axes.x');
    const sRightYAxis = requireRecord(sAxes.rightY, 'axes.rightY');

    return {
        x: {
            showTickline: requireBoolean(
                sXAxis.showTickline,
                'axes.x.showTickline',
            ),
        },
        leftY: parsePersistedYAxis(sAxes.leftY, 'axes.leftY'),
        rightY: {
            ...parsePersistedYAxis(sRightYAxis, 'axes.rightY'),
            enabled: requireBoolean(
                sRightYAxis.enabled,
                'axes.rightY.enabled',
            ),
        },
    };
}

function parsePersistedYAxis(value: unknown, path: string): PanelYAxis {
    const axis = requireRecord(value, path);
    return {
        zeroBase: requireBoolean(axis.zeroBase, `${path}.zeroBase`),
        showTickline: requireBoolean(axis.showTickline, `${path}.showTickline`),
        valueRange: parsePersistedValueRangeOrThrow(
            axis.valueRange,
            INVALID_AXIS_RANGE_MESSAGE,
        ),
        rawValueRange: parsePersistedValueRangeOrThrow(
            axis.rawValueRange,
            INVALID_AXIS_RANGE_MESSAGE,
        ),
        upperControlLimit: parseAxisThreshold(
            axis.upperControlLimit,
            `${path}.upperControlLimit`,
        ),
        lowerControlLimit: parseAxisThreshold(
            axis.lowerControlLimit,
            `${path}.lowerControlLimit`,
        ),
    };
}

function parsePersistedDisplay(value: unknown): PanelDisplay {
    const sDisplay = requireRecord(value, 'display');
    const sPixelsPerTick = requireRecord(
        sDisplay.pixelsPerTick,
        'display.pixelsPerTick',
    );

    return {
        chartType: normalizePersistedPanelChartType(sDisplay.chartType),
        showLegend: requireBoolean(sDisplay.showLegend, 'display.showLegend'),
        showPoint: requireBoolean(sDisplay.showPoint, 'display.showPoint'),
        pointRadius: optionalFiniteNumber(
            sDisplay.pointRadius,
            'display.pointRadius',
        ),
        fill: optionalFiniteNumber(sDisplay.fill, 'display.fill'),
        stroke: optionalFiniteNumber(sDisplay.stroke, 'display.stroke'),
        connectNulls: requireBoolean(
            sDisplay.connectNulls,
            'display.connectNulls',
        ),
        useZoom: requireBoolean(sDisplay.useZoom, 'display.useZoom'),
        pixelsPerTick: {
            calculated: optionalPositiveNumber(
                sPixelsPerTick.calculated,
                'display.pixelsPerTick.calculated',
            ),
            calculatedNavigator: optionalPositiveNumber(
                sPixelsPerTick.calculatedNavigator,
                'display.pixelsPerTick.calculatedNavigator',
            ),
        },
        mainChartSampling: parseSampling(
            sDisplay.mainChartSampling,
            'display.mainChartSampling',
        ),
        rawNavigatorSampling: parseSampling(
            sDisplay.rawNavigatorSampling,
            'display.rawNavigatorSampling',
            DEFAULT_RAW_NAVIGATOR_SAMPLING,
        ),
    };
}

function parseAxisThreshold(value: unknown, path: string): PanelAxisThreshold {
    const sThreshold = requireRecord(value, path);
    const sEnabled = requireBoolean(sThreshold.enabled, `${path}.enabled`);
    const sValue = optionalFiniteNumber(sThreshold.value, `${path}.value`);
    if (sEnabled && sValue === undefined) throwInvalidPanelValue(`${path}.value`);

    return { enabled: sEnabled, value: sValue };
}

function parseSampling(
    value: unknown,
    path: string,
    defaults?: PanelSampling,
): PanelSampling {
    const sSampling = value === undefined && defaults
        ? defaults
        : requireRecord(value, path);
    const sEnabled = requireBoolean(sSampling.enabled, `${path}.enabled`);
    const sSampleCount = optionalFiniteNumber(
        sSampling.sampleCount,
        `${path}.sampleCount`,
    );
    if (sEnabled && sSampleCount === undefined) {
        throwInvalidPanelValue(`${path}.sampleCount`);
    }

    return {
        enabled: sEnabled,
        sampleCount: sSampleCount ?? defaults?.sampleCount,
    };
}

function assertPanelMarkupList(value: unknown, requiresSeriesKey: boolean): void {
    if (value === undefined) return;
    if (!Array.isArray(value) || !value.every((item) => {
        if (!isPlainObject(item) || !isPlainObject(item.timeRange)) return false;

        const sHasValidTimeRange = requiresSeriesKey
            ? isFiniteNumber(item.timeRange.startTime) &&
                isFiniteNumber(item.timeRange.endTime) &&
                item.timeRange.endTime >= item.timeRange.startTime
            : decodeAxisRange(item.timeRange) !== undefined;
        return (
            typeof item.text === 'string' &&
            sHasValidTimeRange &&
            (!requiresSeriesKey || typeof item.seriesKey === 'string') &&
            (item.fillColor === undefined || typeof item.fillColor === 'string') &&
            (item.textColor === undefined || typeof item.textColor === 'string') &&
            (item.clip === undefined || typeof item.clip === 'boolean')
        );
    })) {
        throwInvalidPanelValue(requiresSeriesKey ? 'annotations' : 'highlights');
    }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
    if (!isPlainObject(value)) throwInvalidPanelValue(path);
    return value;
}

function requireBoolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') throwInvalidPanelValue(path);
    return value;
}

function optionalFiniteNumber(
    value: unknown,
    path: string,
): number | undefined {
    if (value === undefined) return undefined;
    if (!isFiniteNumber(value)) throwInvalidPanelValue(path);
    return value;
}

function optionalPositiveNumber(
    value: unknown,
    path: string,
): number | undefined {
    if (value === undefined) return undefined;
    if (!isFiniteNumber(value) || value <= 0) throwInvalidPanelValue(path);
    return value;
}

function throwInvalidPanelValue(path: string): never {
    throw new Error(`Invalid TagAnalyzer .taz v2.1 panel value: ${path}.`);
}

const LEGACY_RAW_ROW_LIMIT = 20000;
const LEGACY_RAW_PIXELS_PER_TICK = 0.1;

export function encodeTazBoard(
    boardInfo: BoardInfo,
): PersistedTazBoardInfoV210 {
    return {
        id: boardInfo.id,
        type: boardInfo.type,
        version: TAZ_FORMAT_VERSION,
        boardTimeRange: { ...boardInfo.boardTimeRange },
        boardNumericRange: { ...boardInfo.boardNumericRange },
        panels: boardInfo.panels.map(mapPanelToPersistedTaz),
    };
}

function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV210 {
    return {
        key: panelInfo.key,
        title: panelInfo.title,
        query: {
            ...panelInfo.query,
            count: LEGACY_RAW_ROW_LIMIT,
            tagSet: panelInfo.query.tagSet.map((series) => ({
                ...series,
                sourceColumns: { ...series.sourceColumns },
            })),
        },
        mode: { ...panelInfo.mode },
        timeRange: {
            ...panelInfo.time.rangeInput,
            useLastViewedRange: panelInfo.time.useLastViewedRange,
            lastViewedRange: panelInfo.time.lastViewedRange
                ? encodePersistedPanelRangeState(
                      panelInfo.time.lastViewedRange,
                  )
                : undefined,
        },
        axes: {
            x: { ...panelInfo.axes.x },
            leftY: clonePanelYAxis(panelInfo.axes.leftY),
            rightY: clonePanelYAxis(panelInfo.axes.rightY),
        },
        display: {
            ...panelInfo.display,
            pixelsPerTick: {
                ...panelInfo.display.pixelsPerTick,
                raw: LEGACY_RAW_PIXELS_PER_TICK,
            },
            mainChartSampling: { ...panelInfo.display.mainChartSampling },
            rawNavigatorSampling: { ...panelInfo.display.rawNavigatorSampling },
        },
        highlights: panelInfo.highlights.map(encodeTimedMarkup),
        annotations: panelInfo.annotations.map(encodePanelAnnotation),
    };
}
