import { isRollupExt } from '@/utils';
import { getInterval } from '@/utils/DashboardQueryParser';
import type { CalculationTimeBucketContext } from '../../FetchTypes';
import { buildRollupTimeExpression } from './RollupTimeExpressionBuilder';

export function resolveCalculatedSeriesTimeBucketContext(
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

export function buildTruncatedCalculatedSeriesTimeBucketExpression(
    aUseRollup: boolean,
    aTimeSourceColumn: string,
    aIntervalUnit: string,
    aIntervalSize: number,
): string {
    if (aUseRollup) {
        return buildRollupTimeExpression(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeSourceColumn}, ${aIntervalSize})`;
}

export function buildScaledCalculatedSeriesTimeBucketExpression(
    aUseRollup: boolean,
    aTimeSourceColumn: string,
    aIntervalUnit: string,
    aIntervalSize: number,
    aBucketIntervalSeconds: number,
): string {
    if (aUseRollup) {
        return buildRollupTimeExpression(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    const sBucketSize = `${aIntervalSize} * ${aBucketIntervalSeconds} * 1000000000`;
    return `${aTimeSourceColumn} / (${sBucketSize}) * (${sBucketSize})`;
}

export function buildCalculatedSeriesSourceFilterClause(
    aSourceTableName: string,
    aTagNameColumn: string,
    aTagNameList: string,
    aTimeSourceColumn: string,
    aStartTime: number,
    aEndTime: number,
): string {
    return `from ${aSourceTableName} where ${aTagNameColumn} in ('${aTagNameList}') and ${aTimeSourceColumn} between ${aStartTime} and ${aEndTime}`;
}

export function buildAggregateCalculatedSeriesSqlQuery(
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

export function buildAverageCalculatedSeriesSqlQuery(
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
    const sTimeBucketExpression = buildScaledCalculatedSeriesTimeBucketExpression(
        aUseRollup,
        aTimeSourceColumn,
        aIntervalUnit,
        aIntervalSize,
        aBucketIntervalSeconds,
    );
    const sSubQuery = `select ${sTimeBucketExpression} as mTime, sum(${aValueSourceColumn}) as SUMMVAL, count(${aValueSourceColumn}) as CNTMVAL ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(SUMMVAL) / SUM(CNTMVAL) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

export function buildCountCalculatedSeriesSqlQuery(
    aValueSourceColumn: string,
    aSourceFilterClause: string,
    aTimeBucketExpression: string,
    aOuterTimeExpression: string,
    aRowCount: number,
): string {
    const sSubQuery = `select ${aTimeBucketExpression} as mTime, count(${aValueSourceColumn}) as mValue ${aSourceFilterClause} group by mTime`;

    return `SELECT to_timestamp(${aOuterTimeExpression}) / 1000000.0 AS TIME, SUM(MVALUE) AS VALUE from (${sSubQuery}) Group by TIME order by TIME LIMIT ${aRowCount * 1}`;
}

export function buildFirstLastCalculatedSeriesTimeBucketExpression(
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
        return buildRollupTimeExpression(
            aTimeSourceColumn,
            aIntervalUnit,
            aIntervalSize,
        );
    }

    return `DATE_TRUNC('${aIntervalUnit}', ${aTimeSourceColumn}, ${aIntervalSize})`;
}

export function buildFirstLastCalculatedSeriesSqlQuery(
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
