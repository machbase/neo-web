import type {
    BgnEndTimeRange,
    ChartRow,
    ChartSeriesItem,
    ValueRange,
    SeriesConfig,
    TimeRangeConfig,
    TimeRange,
} from '../../common/modelTypes';
import {
    normalizeTimeRangeConfig,
    parseLegacyTimeRangeConfig,
    toLegacyTimeRangeInput as toLegacyTimeRangeInputFromConfig,
} from '../TagAnalyzerTimeRangeConfig';
import type {
    LegacyBgnEndTimeRange,
    LegacyChartPoint,
    LegacyChartSeries,
    LegacyCompatibleSeriesConfig,
    LegacyNormalizedSourceTagName,
    LegacySourceTagNameInput,
    LegacyTagNameItem,
    LegacyTimeRangeInput,
    LegacyTimeValue,
    LegacyYn,
} from './LegacyTypes';

type LegacyBoundaryRange = ValueRange | TimeRange;

/**
 * Converts a legacy Y/N flag into the boolean form used inside TagAnalyzer.
 * @param aValue The legacy Y/N value from a flat or external payload.
 * @returns The normalized boolean value.
 */
export function fromLegacyYn(aValue: LegacyYn | undefined): boolean {
    return aValue === 'Y';
}

/**
 * Converts an internal boolean flag back into the legacy Y/N representation.
 * @param aValue The internal boolean value.
 * @returns The legacy Y/N value.
 */
export function toLegacyYn(aValue: boolean): LegacyYn {
    return aValue ? 'Y' : 'N';
}

/**
 * Resolves the canonical source-series identifier while still accepting legacy tagName payloads.
 * @param aItem The draft or saved series config carrying a source tag name.
 * @returns The normalized source tag name.
 */
export function getSourceTagName(aItem: LegacySourceTagNameInput): string {
    if ('sourceTagName' in aItem && aItem.sourceTagName) {
        return aItem.sourceTagName;
    }

    if ('tagName' in aItem && aItem.tagName) {
        return aItem.tagName;
    }

    return '';
}

/**
 * Normalizes one draft or series config to the sourceTagName-only internal shape.
 * @param aItem The item to normalize.
 * @returns The normalized item with a required sourceTagName and no legacy tagName field.
 */
export function withNormalizedSourceTagName<T extends LegacySourceTagNameInput>(
    aItem: T,
): LegacyNormalizedSourceTagName<T> {
    const sItem = aItem as T & {
        sourceTagName: string | undefined;
        tagName: string | undefined;
    };
    const { tagName, sourceTagName, ...sRest } = sItem;

    return {
        ...sRest,
        sourceTagName: sourceTagName || tagName || '',
    } as LegacyNormalizedSourceTagName<T>;
}

/**
 * Normalizes a list of drafts or series configs to the sourceTagName-only internal shape.
 * @param aItems The items to normalize.
 * @returns The normalized items with required sourceTagName values.
 */
export function normalizeSourceTagNames<T extends LegacySourceTagNameInput>(
    aItems: T[],
): Array<LegacyNormalizedSourceTagName<T>> {
    return aItems.map((aItem) => withNormalizedSourceTagName(aItem));
}

/**
 * Normalizes flat panel-series configs into TagAnalyzer's required internal config shape.
 * @param aItems The legacy-compatible series configs from storage or external input.
 * @returns The normalized TagAnalyzer series configs.
 */
export function normalizeLegacySeriesConfigs(
    aItems: LegacyCompatibleSeriesConfig[],
): SeriesConfig[] {
    return normalizeSourceTagNames<LegacyCompatibleSeriesConfig>(aItems).map((aItem) => {
        const sSeriesConfig = aItem as LegacyNormalizedSourceTagName<LegacyCompatibleSeriesConfig>;
        return {
            ...sSeriesConfig,
            use_y2: fromLegacyYn(sSeriesConfig.use_y2 as LegacyYn | undefined),
        };
    }) as SeriesConfig[];
}

/**
 * Recreates the legacy tagName field only when leaving the normalized TagAnalyzer domain.
 * @param aItem The normalized TagAnalyzer item to translate for a legacy boundary.
 * @returns The translated item with the legacy tagName restored.
 */
export function toLegacyTagNameItem<T extends { sourceTagName: string | undefined }>(
    aItem: T,
): LegacyTagNameItem<T> {
    const { sourceTagName, ...sRest } = aItem;

    return {
        ...sRest,
        tagName: sourceTagName || '',
    } as LegacyTagNameItem<T>;
}

/**
 * Recreates legacy tagName fields for a list of items at a legacy utility boundary.
 * @param aItems The normalized TagAnalyzer items to translate.
 * @returns The translated items with legacy tagName values restored.
 */
export function toLegacyTagNameList<T extends { sourceTagName: string | undefined }>(
    aItems: T[],
): Array<LegacyTagNameItem<T>> {
    return aItems.map((aItem) => toLegacyTagNameItem(aItem));
}

/**
 * Converts normalized TagAnalyzer series configs back to the legacy flat-storage shape.
 * @param aItems The normalized TagAnalyzer series configs.
 * @returns The legacy-compatible series configs used at external boundaries.
 */
export function toLegacySeriesConfigs(
    aItems: SeriesConfig[],
): LegacyCompatibleSeriesConfig[] {
    return toLegacyTagNameList<SeriesConfig>(aItems).map((aItem) => {
        const sLegacySeriesConfig = aItem as LegacyTagNameItem<SeriesConfig>;
        return {
            ...sLegacySeriesConfig,
            use_y2: toLegacyYn(sLegacySeriesConfig.use_y2 as boolean),
        };
    }) as LegacyCompatibleSeriesConfig[];
}

/**
 * Converts the shared flat min/max payload into TagAnalyzer's nested range shape.
 * @param aTimeRange The legacy min/max payload returned by the shared helper.
 * @returns The normalized nested begin/end range payload, or `undefined` when the legacy helper does not yield numeric bounds.
 */
export function normalizeLegacyBgnEndTimeRange(
    aTimeRange: LegacyBgnEndTimeRange | undefined,
): BgnEndTimeRange | undefined {
    if (!aTimeRange) {
        return undefined;
    }

    const sBgnRange = legacyMinMaxPairToRange(aTimeRange.bgn_min, aTimeRange.bgn_max);
    const sEndRange = legacyMinMaxPairToRange(aTimeRange.end_min, aTimeRange.end_max);
    if (!sBgnRange || !sEndRange) {
        return undefined;
    }

    return {
        bgn: sBgnRange,
        end: sEndRange,
    };
}

/**
 * Converts legacy split-array chart data into TagAnalyzer's tuple-based chart series shape.
 * @param aSeries The legacy chart series payload.
 * @returns The normalized chart series data used internally by TagAnalyzer.
 */
export function normalizeLegacyChartSeries(aSeries: LegacyChartSeries): Pick<
    ChartSeriesItem,
    'data'
> {
    return {
        data: legacyChartSeriesToRows(aSeries),
    };
}

/**
 * Normalizes either tuple-based or split x/y legacy series data into point objects.
 * @param aSeries The series source in either tuple or split-array form.
 * @returns The normalized chart points used by legacy adapters.
 */
export function legacySeriesToChartPoints(
    aSeries: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): LegacyChartPoint[] {
    const sData = aSeries.data;

    if (Array.isArray(sData) && sData.length > 0) {
        return sData.map((aItem) => {
            if (Array.isArray(aItem)) {
                return {
                    x: aItem[0],
                    y: aItem[1],
                };
            }

            return aItem;
        });
    }

    if (legacyChartSeriesHasArrays(aSeries)) {
        return aSeries.xData.map((aX, aIndex) => ({
            x: aX,
            y: aSeries.yData[aIndex],
        }));
    }

    return [];
}

/**
 * Converts one legacy start/end pair into the strict numeric range used by TagAnalyzer,
 * while preserving the original legacy expression only when it is still needed.
 */
export function normalizeLegacyTimeRangeBoundary(
    aStartValue: LegacyTimeValue | undefined,
    aEndValue: LegacyTimeValue | undefined,
): {
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
} {
    return normalizeTimeRangeConfig(parseLegacyTimeRangeConfig(aStartValue, aEndValue));
}

/**
 * Converts one strict numeric range plus optional legacy expression back into the
 * boundary input shape expected by legacy helpers.
 */
export function toLegacyTimeRangeInput(
    aRange: LegacyBoundaryRange,
    aRangeConfig: TimeRangeConfig | undefined,
): LegacyTimeRangeInput {
    return toLegacyTimeRangeInputFromConfig(aRange, aRangeConfig);
}

function legacyMinMaxPairToRange(
    aMin: string | number | undefined,
    aMax: string | number | undefined,
): ValueRange | undefined {
    if (typeof aMin !== 'number' || typeof aMax !== 'number') {
        return undefined;
    }

    return {
        min: aMin,
        max: aMax,
    };
}

function legacyChartSeriesHasArrays(
    aSeries: Pick<ChartSeriesItem, 'data'> | LegacyChartSeries,
): aSeries is LegacyChartSeries & { xData: number[]; yData: number[] } {
    return (
        Array.isArray((aSeries as LegacyChartSeries).xData) &&
        Array.isArray((aSeries as LegacyChartSeries).yData)
    );
}

function legacyChartSeriesToRows(aSeries: LegacyChartSeries): ChartRow[] {
    return legacySeriesToChartPoints(aSeries).map((aPoint) => [aPoint.x, aPoint.y]);
}
