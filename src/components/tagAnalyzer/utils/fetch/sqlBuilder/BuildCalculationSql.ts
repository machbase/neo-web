import type { SeriesFetchColumnMap } from '../FetchTypes';
import {
    buildAggregateOuterSql,
    buildAggregateSubSql,
    buildAverageOuterSql,
    buildAverageSubSql,
    buildCountOuterSql,
    buildCountSubSql,
    buildFirstLastOuterSql,
    buildFirstLastSubSql,
    buildNonRollupScaledTimeGroupKeySql,
    buildNonRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlInfo,
    buildRollupTimeGroupKeySqlPart,
    buildSourceWhereSqlPart,
    buildTruncatedTimeGroupKeySqlPart,
} from './parts/BuildSqlParts';
import { shouldUseExtendedFirstLastRollup } from './parts/CalculationRollupEligibility';
import type { TimeRangeNs } from '../../time/types/TimeTypes';

/**
 * Builds aggregate calculation SQL.
 * Intent: Build one aggregate-family calculation query without deciding which family the caller needs.
 * @param {string} sourceTableName - The prepared source table name.
 * @param {string} tagNameList - The tag name filter to read.
 * @param {TimeRangeNs} fetchTimeRange - The requested nanosecond fetch range.
 * @param {string} calculationMode - The aggregate function name to apply.
 * @param {number} requestedRowCount - The maximum row count to request.
 * @param {string} intervalUnit - The interval unit for bucketed calculations.
 * @param {number} intervalSize - The interval size for bucketed calculations.
 * @param {boolean} useRollup - Whether the request should use rollup-aware SQL rules.
 * @param {SeriesFetchColumnMap} sourceColumnMap - The column mapping for the source table.
 * @returns {string} The SQL for the aggregate calculation fetch.
 */
export function buildAggregateCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const calculationTimeGroupKeySqlInfo = useRollup
        ? buildRollupTimeGroupKeySqlInfo(intervalUnit, intervalSize)
        : buildNonRollupTimeGroupKeySqlInfo(intervalUnit);
    const sourceWhereSql = buildCalculationSourceWhereSql(
        sourceColumnMap.name,
        tagNameList,
        sourceColumnMap.time,
        fetchTimeRange,
    );
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        )
        : buildTruncatedTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        );
    const subSql = buildAggregateSubSql(
        calculationMode,
        sourceTableName,
        sourceColumnMap.value,
        sourceWhereSql,
        timeGroupKeySql,
    );

    return buildAggregateOuterSql(
        calculationMode,
        subSql,
        calculationTimeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

/**
 * Builds average calculation SQL.
 * Intent: Build one average-family calculation query without deciding which family the caller needs.
 * @returns {string} The SQL for the average calculation fetch.
 */
export function buildAverageCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const calculationTimeGroupKeySqlInfo = useRollup
        ? buildRollupTimeGroupKeySqlInfo(intervalUnit, intervalSize)
        : buildNonRollupTimeGroupKeySqlInfo(intervalUnit);

    const sourceWhereSql = buildCalculationSourceWhereSql(
        sourceColumnMap.name,
        tagNameList,
        sourceColumnMap.time,
        fetchTimeRange,
    );
    
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        )
        : buildNonRollupScaledTimeGroupKeySql(
            sourceColumnMap.time,
            intervalSize,
            calculationTimeGroupKeySqlInfo.nonRollupBucketIntervalSeconds,
        );
    const subSql = buildAverageSubSql(
        sourceTableName,
        sourceColumnMap.value,
        sourceWhereSql,
        timeGroupKeySql,
    );

    return buildAverageOuterSql(
        subSql,
        calculationTimeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

/**
 * Builds count calculation SQL.
 * Intent: Build one count-family calculation query without deciding which family the caller needs.
 * @returns {string} The SQL for the count calculation fetch.
 */
export function buildCountCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    const calculationTimeGroupKeySqlInfo = useRollup
        ? buildRollupTimeGroupKeySqlInfo(intervalUnit, intervalSize)
        : buildNonRollupTimeGroupKeySqlInfo(intervalUnit);
    const sourceWhereSql = buildCalculationSourceWhereSql(
        sourceColumnMap.name,
        tagNameList,
        sourceColumnMap.time,
        fetchTimeRange,
    );
    const timeGroupKeySql = useRollup
        ? buildRollupTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        )
        : buildNonRollupScaledTimeGroupKeySql(
            sourceColumnMap.time,
            intervalSize,
            calculationTimeGroupKeySqlInfo.nonRollupBucketIntervalSeconds,
        );
    const subSql = buildCountSubSql(
        sourceTableName,
        sourceColumnMap.value,
        sourceWhereSql,
        timeGroupKeySql,
    );

    return buildCountOuterSql(
        subSql,
        calculationTimeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

/**
 * Builds first/last calculation SQL.
 * Intent: Build one first/last-family calculation query without deciding which family the caller needs.
 * @param {string} calculationMode - The first/last function name to apply.
 * @param {string[]} rollupTableList - The rollup metadata available to the SQL helpers.
 * @returns {string} The SQL for the first/last calculation fetch.
 */
export function buildFirstLastCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupTableList: string[],
): string {
    const calculationTimeGroupKeySqlInfo = useRollup
        ? buildRollupTimeGroupKeySqlInfo(intervalUnit, intervalSize)
        : buildNonRollupTimeGroupKeySqlInfo(intervalUnit);
    const sourceWhereSql = buildCalculationSourceWhereSql(
        sourceColumnMap.name,
        tagNameList,
        sourceColumnMap.time,
        fetchTimeRange,
    );
    const shouldUseRollupTimeGroupKey = useRollup
        && shouldUseExtendedFirstLastRollup(
            rollupTableList,
            sourceTableName,
            intervalUnit,
            intervalSize,
        );
    const timeGroupKeySql = shouldUseRollupTimeGroupKey
        ? buildRollupTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        )
        : buildTruncatedTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        );
    const subSql = buildFirstLastSubSql(
        calculationMode,
        sourceTableName,
        sourceColumnMap.value,
        sourceWhereSql,
        timeGroupKeySql,
    );

    return buildFirstLastOuterSql(
        calculationMode,
        subSql,
        calculationTimeGroupKeySqlInfo.outerTimeExpressionSql,
        requestedRowCount,
    );
}

function buildCalculationSourceWhereSql(
    tagNameColumn: string,
    tagNameList: string,
    timeColumnName: string,
    fetchTimeRange: TimeRangeNs,
): string {
    return buildSourceWhereSqlPart(
        tagNameColumn,
        tagNameList,
        timeColumnName,
        fetchTimeRange.startTime,
        fetchTimeRange.endTime,
    );
}
