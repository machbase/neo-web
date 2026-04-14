import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerChartRow,
    TagAnalyzerChartSeriesItem,
    TagAnalyzerDefaultRange,
    TagAnalyzerSeriesConfig,
} from '../../panel/PanelModel';
import { fromLegacyYn, toLegacyYn, type LegacyYn } from './LegacyYn';

type LegacySourceTagNameCarrier = {
    sourceTagName: string | undefined;
    tagName: string | undefined;
};

type LegacyChartPoint = {
    x: number;
    y: number;
};

export type LegacySourceTagNameInput =
    | Pick<LegacySourceTagNameCarrier, 'sourceTagName'>
    | Pick<LegacySourceTagNameCarrier, 'tagName'>
    | Partial<LegacySourceTagNameCarrier>;

export type LegacyNormalizedSourceTagName<T extends LegacySourceTagNameInput> = Omit<
    T,
    'tagName' | 'sourceTagName'
> & {
    sourceTagName: string;
};

export type LegacyTagNameItem<T extends { sourceTagName: string | undefined }> = Omit<
    T,
    'sourceTagName'
> & {
    tagName: string;
};

export type LegacyCompatibleSeriesConfig = Omit<TagAnalyzerSeriesConfig, 'sourceTagName' | 'use_y2'> & {
    sourceTagName?: string;
    tagName?: string;
    use_y2: LegacyYn;
};

export type LegacyBgnEndTimeRange = {
    bgn_min: string | number | undefined;
    bgn_max: string | number | undefined;
    end_min: string | number | undefined;
    end_max: string | number | undefined;
};

export type LegacyChartSeries = {
    data: Array<TagAnalyzerChartRow | LegacyChartPoint> | undefined;
    xData: number[] | undefined;
    yData: number[] | undefined;
};

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
    const sItem = aItem as T & LegacySourceTagNameCarrier;
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
): TagAnalyzerSeriesConfig[] {
    return normalizeSourceTagNames<LegacyCompatibleSeriesConfig>(aItems).map((aItem) => {
        const sSeriesConfig = aItem as LegacyNormalizedSourceTagName<LegacyCompatibleSeriesConfig>;
        return {
            ...sSeriesConfig,
            use_y2: fromLegacyYn(sSeriesConfig.use_y2 as LegacyYn | undefined),
        };
    }) as TagAnalyzerSeriesConfig[];
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
    aItems: TagAnalyzerSeriesConfig[],
): LegacyCompatibleSeriesConfig[] {
    return toLegacyTagNameList<TagAnalyzerSeriesConfig>(aItems).map((aItem) => {
        const sLegacySeriesConfig = aItem as LegacyTagNameItem<TagAnalyzerSeriesConfig>;
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
): TagAnalyzerBgnEndTimeRange | undefined {
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
    TagAnalyzerChartSeriesItem,
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
    aSeries: Pick<TagAnalyzerChartSeriesItem, 'data'> | LegacyChartSeries,
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

function legacyMinMaxPairToRange(
    aMin: string | number | undefined,
    aMax: string | number | undefined,
): TagAnalyzerDefaultRange | undefined {
    if (typeof aMin !== 'number' || typeof aMax !== 'number') {
        return undefined;
    }

    return {
        min: aMin,
        max: aMax,
    };
}

function legacyChartSeriesHasArrays(
    aSeries: Pick<TagAnalyzerChartSeriesItem, 'data'> | LegacyChartSeries,
): aSeries is LegacyChartSeries & { xData: number[]; yData: number[] } {
    return (
        Array.isArray((aSeries as LegacyChartSeries).xData) &&
        Array.isArray((aSeries as LegacyChartSeries).yData)
    );
}

function legacyChartSeriesToRows(aSeries: LegacyChartSeries): TagAnalyzerChartRow[] {
    return legacySeriesToChartPoints(aSeries).map((aPoint) => [aPoint.x, aPoint.y]);
}
