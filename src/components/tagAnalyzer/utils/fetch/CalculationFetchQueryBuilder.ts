import {
    convertToNewRollupSyntax,
    isRollupExt,
} from '@/utils';
import { getInterval } from '@/utils/DashboardQueryParser';
import type { SeriesFetchColumnMap } from './FetchContracts';
import { convertTimeRangeMsToTimeRangeNs } from './FetchTimeBoundsNormalizer';
import { getCalculationTableName } from './FetchTableNameResolver';
import type { UnixMilliseconds } from '../time/timeTypes';

type CalculationTimeBucketContext = {
    outerTimeExpression: string;
    nonRollupIntervalSeconds: number;
};

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
export function buildCalculationMainQuery(
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
    const sTableName = getCalculationTableName(aTableName);
    const { startTime: sStartTime, endTime: sEndTime } = convertTimeRangeMsToTimeRangeNs({
        startTime: aStartTime,
        endTime: aEndTime,
    });
    const sTagNameColumn = aColumnMap.name;
    const sTimeSourceColumn = aColumnMap.time;
    const sValueSourceColumn = aColumnMap.value;
    const sFilterClause = buildCalculationFilterClause(
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
    } = resolveCalculationTimeBucketContext(aUseRollup, aIntervalUnit, aIntervalSize);

    if (
        aCalculationMode === 'sum' ||
        aCalculationMode === 'min' ||
        aCalculationMode === 'max'
    ) {
        const sTimeBucket = buildTruncatedCalculationTimeBucket(
            aUseRollup,
            sTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );

        return buildAggregateCalculationQuery(
            aCalculationMode,
            sValueSourceColumn,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'avg') {
        return buildAverageCalculationQuery(
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
        const sTimeBucket = buildScaledCalculationTimeBucket(
            aUseRollup,
            sTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
        );

        return buildCountCalculationQuery(
            sValueSourceColumn,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'first' || aCalculationMode === 'last') {
        const sTimeBucket = buildFirstLastCalculationTimeBucket(
            aUseRollup,
            aRollupTableList,
            sTableName,
            aIntervalUnit,
            aIntervalSize,
            sTimeSourceColumn,
        );

        return buildFirstLastCalculationQuery(
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

function resolveCalculationTimeBucketContext(
    aUseRollup: boolean,
    aIntervalUnit: string,
    aIntervalSize: number,
): CalculationTimeBucketContext {
    if (aUseRollup && aIntervalUnit === 'day' && aIntervalSize > 1) {
        const sRollupWindow = aIntervalSize * 60 * 60 * 24 * 1000000000;

        return {
            outerTimeExpression: `to_char(mTime / ${sRollupWindow}  * ${sRollupWindow})`,
            nonRollupIntervalSeconds: 1,
        };
    }

    if (aUseRollup) {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 1,
        };
    }

    if (aIntervalUnit === 'min') {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 60,
        };
    }

    if (aIntervalUnit === 'hour') {
        return {
            outerTimeExpression: 'mTime',
            nonRollupIntervalSeconds: 3600,
        };
    }

    return {
        outerTimeExpression: 'mTime',
        nonRollupIntervalSeconds: 1,
    };
}

function buildTruncatedCalculationTimeBucket(
    aUseRollup: boolean,
    aTimeSourceColumn: string,
    aIntervalUnit: string,
    aIntervalSize: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeSourceColumn}, ${aIntervalSize})`;
}

function buildScaledCalculationTimeBucket(
    aUseRollup: boolean,
    aTimeSourceColumn: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    const sBucketSize = `${aIntervalSize} * ${aBucketIntervalSeconds} * 1000000000`;
    return `${aTimeSourceColumn} / (${sBucketSize}) * (${sBucketSize})`;
}

function buildCalculationFilterClause(
    aSourceTableName: string,
    aTagNameColumn: string,
    aTagNameList: string,
    aTimeSourceColumn: string,
    aStartTime: number,
    aEndTime: number,
): string {
    return `from ${aSourceTableName} where ${aTagNameColumn} in ('${aTagNameList}') and ${aTimeSourceColumn} between ${aStartTime} and ${aEndTime}`;
}

function buildAggregateCalculationQuery(
    aCalculationMode: string,
    aValueSourceColumn: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, ${aCalculationMode}(${aValueSourceColumn}) as mValue ${aSourceFilterClause} group by mTime`;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}

function buildAverageCalculationQuery(
    aUseRollup: boolean,
    aTimeSourceColumn: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
    aValueSourceColumn: string,
    aSourceFilterClause: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sTimeBucketExpression = buildScaledCalculationTimeBucket(
        aUseRollup,
        aTimeSourceColumn,
        aIntervalUnit,
        aIntervalSize,
        aBucketIntervalSeconds,
    );
    const sSubQuery = `select ${sTimeBucketExpression} as mTime, sum(${aValueSourceColumn}) as SUMMVAL, count(${aValueSourceColumn}) as CNTMVAL ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

function buildCountCalculationQuery(
    aValueSourceColumn: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, count(${aValueSourceColumn}) as mValue ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

function buildFirstLastCalculationTimeBucket(
    aUseRollup: boolean,
    aRollupTableList: string[],
    aTableName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aTimeSourceColumn: string,
): string {
    const sIsExtRollup = isRollupExt(
        aRollupTableList,
        aTableName,
        getInterval(aIntervalUnit, aIntervalSize),
    );

    if (aUseRollup && sIsExtRollup) {
        return convertToNewRollupSyntax(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeSourceColumn}, ${aIntervalSize})`;
}

function buildFirstLastCalculationQuery(
    aCalculationMode: string,
    aValueSourceColumn: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime,  ${aCalculationMode}(time, ${aValueSourceColumn}) as mValue ${aSourceFilterClause} Group by mtime order by mtime `;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mTime, mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}
