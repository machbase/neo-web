import type { SeriesFetchColumnMap } from '../FetchTypes';
import {
    buildAggregateCalculatedSeriesSqlQuery,
    buildAverageCalculatedSeriesSqlQuery,
    buildCalculatedSeriesSourceFilterClause,
    buildCountCalculatedSeriesSqlQuery,
    buildFirstLastCalculatedSeriesSqlQuery,
    buildFirstLastCalculatedSeriesTimeBucketExpression,
    buildScaledCalculatedSeriesTimeBucketExpression,
    buildTruncatedCalculatedSeriesTimeBucketExpression,
    resolveCalculatedSeriesTimeBucketContext,
} from './queryBuildingHelper/CalculatedSeriesFetchSqlQueryHelper';
import { resolveCalculatedSeriesTableName } from './queryBuildingHelper/CalculatedSeriesTableNameResolver';
import { convertTimeRangeMsToTimeRangeNs } from './queryBuildingHelper/FetchTimeRangeUnitConverter';
import type { UnixMilliseconds } from '../../time/types/TimeTypes';

/**
 * Builds the calculated-series SQL query body.
 * Intent: Route every calculated fetch mode through the correct SQL builder from one decision point.
 * @param {string} aTableName - The source table name.
 * @param {string} aTagNameList - The tag name filter to query.
 * @param {number} aStartTime - The requested start timestamp.
 * @param {number} aEndTime - The requested end timestamp.
 * @param {string} aCalculationMode - The calculation mode to apply.
 * @param {number} aRowCount - The maximum row count to request.
 * @param {string} aIntervalUnit - The interval unit for bucketed calculations.
 * @param {number} aIntervalSize - The interval size for bucketed calculations.
 * @param {boolean} aUseRollup - Whether the request should use rollup-aware query rules.
 * @param {SeriesFetchColumnMap} aColumnMap - The column mapping for the source table.
 * @param {string[]} aRollupTableList - The rollup metadata available to the query builder.
 * @returns {string} The SQL query body for the calculated fetch.
 */
export function buildCalculatedSeriesFetchSqlQuery(
    aTableName: string,
    aTagNameList: string,
    aStartTime: UnixMilliseconds,
    aEndTime: UnixMilliseconds,
    aCalculationMode: string,
    aRowCount: number,
    aIntervalUnit: string,
    aIntervalSize: number,
    aUseRollup: boolean,
    aColumnMap: SeriesFetchColumnMap,
    aRollupTableList: string[],
): string {
    const sTableName = resolveCalculatedSeriesTableName(aTableName);
    const { startTime: sStartTime, endTime: sEndTime } = convertTimeRangeMsToTimeRangeNs({
        startTime: aStartTime,
        endTime: aEndTime,
    });
    const sTagNameColumn = aColumnMap.name;
    const sTimeSourceColumn = aColumnMap.time;
    const sValueSourceColumn = aColumnMap.value;
    const sFilterClause = buildCalculatedSeriesSourceFilterClause(
        sTableName,
        sTagNameColumn,
        aTagNameList,
        sTimeSourceColumn,
        sStartTime,
        sEndTime,
    );
    const {
        outerTimeExpression: sOuterTimeExpression,
        nonRollupIntervalSeconds: sNonRollupIntervalSeconds,
    } = resolveCalculatedSeriesTimeBucketContext(aUseRollup, aIntervalUnit, aIntervalSize);

    if (
        aCalculationMode === 'sum' ||
        aCalculationMode === 'min' ||
        aCalculationMode === 'max'
    ) {
        const sTimeBucket = buildTruncatedCalculatedSeriesTimeBucketExpression(
            aUseRollup,
            sTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );

        return buildAggregateCalculatedSeriesSqlQuery(
            aCalculationMode,
            sValueSourceColumn,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'avg') {
        return buildAverageCalculatedSeriesSqlQuery(
            aUseRollup,
            sTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
            sValueSourceColumn,
            sFilterClause,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'cnt') {
        const sTimeBucket = buildScaledCalculatedSeriesTimeBucketExpression(
            aUseRollup,
            sTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
        );

        return buildCountCalculatedSeriesSqlQuery(
            sValueSourceColumn,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'first' || aCalculationMode === 'last') {
        const sTimeBucket = buildFirstLastCalculatedSeriesTimeBucketExpression(
            aUseRollup,
            aRollupTableList,
            sTableName,
            aIntervalUnit,
            aIntervalSize,
            sTimeSourceColumn,
        );

        return buildFirstLastCalculatedSeriesSqlQuery(
            aCalculationMode,
            sValueSourceColumn,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    return '';
}
