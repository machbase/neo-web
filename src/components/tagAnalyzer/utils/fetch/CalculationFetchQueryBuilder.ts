import {
    convertToNewRollupSyntax,
    isRollupExt,
} from '@/utils';
import { getInterval } from '@/utils/DashboardQueryParser';
import type { SeriesFetchColumnMap } from './FetchContracts';
import { resolveFetchTimeBounds } from './FetchTimeBoundsNormalizer';
import { getCalculationTableName } from './FetchTableNameResolver';

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
    aStartTime: number,
    aEndTime: number,
    aCalculationMode: string,
    aRowCount: number,
    aIntervalUnit: string,
    aIntervalSize: number,
    aUseRollup: boolean,
    aColumnMap: SeriesFetchColumnMap,
    aRollupTableList: string[],
): string {
    const sTableName = getCalculationTableName(aTableName);
    const { startTime: sStartTime, endTime: sEndTime } = resolveFetchTimeBounds(
        aStartTime,
        aEndTime,
    );
    const sTagNameColumn = aColumnMap.name;
    const sTimeColumnName = aColumnMap.time;
    const sValueColumnName = aColumnMap.value;
    const sFilterClause = buildCalculationFilterClause(
        sTableName,
        sTagNameColumn,
        aTagNameList,
        sTimeColumnName,
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
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );

        return buildAggregateCalculationQuery(
            aCalculationMode,
            sValueColumnName,
            sFilterClause,
            sTimeBucket,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'avg') {
        return buildAverageCalculationQuery(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
            sValueColumnName,
            sFilterClause,
            sOuterTimeExpression,
            aRowCount,
        );
    }

    if (aCalculationMode === 'cnt') {
        const sTimeBucket = buildScaledCalculationTimeBucket(
            aUseRollup,
            sTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
            sNonRollupIntervalSeconds,
        );

        return buildCountCalculationQuery(
            sValueColumnName,
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
            sTimeColumnName,
        );

        return buildFirstLastCalculationQuery(
            aCalculationMode,
            sValueColumnName,
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
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeColumnName}, ${aIntervalSize})`;
}

function buildScaledCalculationTimeBucket(
    aUseRollup: boolean,
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
): string {
    if (aUseRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    const sBucketSize = `${aIntervalSize} * ${aBucketIntervalSeconds} * 1000000000`;
    return `${aTimeColumnName} / (${sBucketSize}) * (${sBucketSize})`;
}

function buildCalculationFilterClause(
    aSourceTableName: string,
    aTagNameColumn: string,
    aTagNameList: string,
    aTimeColumnName: string,
    aStartTime: number,
    aEndTime: number,
): string {
    return `from ${aSourceTableName} where ${aTagNameColumn} in ('${aTagNameList}') and ${aTimeColumnName} between ${aStartTime} and ${aEndTime}`;
}

function buildAggregateCalculationQuery(
    aCalculationMode: string,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, ${aCalculationMode}(${aValueColumnName}) as mValue ${aSourceFilterClause} group by mTime`;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}

function buildAverageCalculationQuery(
    aUseRollup: boolean,
    aTimeColumnName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sTimeBucketExpression = buildScaledCalculationTimeBucket(
        aUseRollup,
        aTimeColumnName,
        aIntervalUnit,
        aIntervalSize,
        aBucketIntervalSeconds,
    );
    const sSubQuery = `select ${sTimeBucketExpression} as mTime, sum(${aValueColumnName}) as SUMMVAL, count(${aValueColumnName}) as CNTMVAL ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

function buildCountCalculationQuery(
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, count(${aValueColumnName}) as mValue ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

function buildFirstLastCalculationTimeBucket(
    aUseRollup: boolean,
    aRollupTableList: string[],
    aTableName: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aTimeColumnName: string,
): string {
    const sIsExtRollup = isRollupExt(
        aRollupTableList,
        aTableName,
        getInterval(aIntervalUnit, aIntervalSize),
    );

    if (aUseRollup && sIsExtRollup) {
        return convertToNewRollupSyntax(
            aTimeColumnName,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeColumnName}, ${aIntervalSize})`;
}

function buildFirstLastCalculationQuery(
    aCalculationMode: string,
    aValueColumnName: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime,  ${aCalculationMode}(time, ${aValueColumnName}) as mValue ${aSourceFilterClause} Group by mtime order by mtime `;

    return `select to_timestamp(${aOuterTimeExpression}) / 1000000.0 as time, ${aCalculationMode}(mTime, mvalue) as value from (${sSubQuery}) Group by TIME order by TIME  LIMIT ${aRowCount * 1}`;
}
