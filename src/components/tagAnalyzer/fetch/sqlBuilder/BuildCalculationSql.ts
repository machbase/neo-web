import type { SeriesFetchColumnMap } from '../panelData/PanelDataFetchTypes';
import type { TimeRangeNs } from '../../domain/time/TimeTypes';
import {
    jsonValueFieldToNumericSql,
    toSqlValueExpressionForAggregator,
} from '@/utils/dashboardJsonValue';
import { getUserName, isCurUserEqualAdmin } from '@/utils';
import { isNumericBaseTimeSourceColumns } from '../../domain/SeriesDomain';
import { resolveNumericIntervalValue } from '../../domain/time/NumericIntervalUtils';
import {
    AS_KEYWORD,
    CNTMVAL_ALIAS,
    M_TIME_ALIAS,
    M_VALUE_ALIAS,
    SUMMVAL_ALIAS,
    VALUE_RESULT_ALIAS,
    buildAggregateOuterSql,
    buildAggregateSubSql,
    buildAverageOuterSql,
    buildAverageSubSql,
    buildCountOuterSql,
    buildCountSubSql,
    buildDateBinTimeGroupKeySqlPart,
    buildFirstLastOuterSql,
    buildFirstLastSubSql,
    buildRollupTimeGroupKeySqlPart,
    buildSourceWhereSqlPart,
} from './parts/BuildSqlParts';
import { buildSqlIdentifierPath } from './SqlTextUtils';

type CalculationTimeAccess = {
    timeGroupKeySql: string;
    outerTimeExpressionSql: string;
    sourceWhereSql: string;
    convertOuterTimeToTimestamp: boolean;
};

type ResolveCalculationTimeAccessParams = {
    sourceColumnMap: SeriesFetchColumnMap;
    tagNameList: string;
    fetchTimeRange: TimeRangeNs;
    calculationMode: string;
    requestedRowCount: number;
    intervalUnit: string;
    intervalSize: number;
    useRollup: boolean;
};

export function buildCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupColumnName?: string,
): string {
    const sSourceTableName = addCurrentUserSchemaIfNeeded(sourceTableName);

    switch (calculationMode) {
        case 'sum':
        case 'min':
        case 'max':
            return buildAggregateCalculationSql(
                sSourceTableName,
                tagNameList,
                fetchTimeRange,
                calculationMode,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
                rollupColumnName,
            );
        case 'avg':
            return buildAverageCalculationSql(
                sSourceTableName,
                tagNameList,
                fetchTimeRange,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
                rollupColumnName,
            );
        case 'cnt':
            return buildCountCalculationSql(
                sSourceTableName,
                tagNameList,
                fetchTimeRange,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
                rollupColumnName,
            );
        case 'first':
        case 'last':
            return buildFirstLastCalculationSql(
                sSourceTableName,
                tagNameList,
                fetchTimeRange,
                calculationMode,
                requestedRowCount,
                intervalUnit,
                intervalSize,
                useRollup,
                sourceColumnMap,
                rollupColumnName,
            );
        default:
            throw new Error(`Unsupported calculation mode: ${calculationMode}`);
    }
}

function buildAggregateCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupColumnName?: string,
): string {
    const timeAccess = resolveCalculationTimeAccess({
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        calculationMode,
        requestedRowCount,
        intervalUnit,
        intervalSize,
        useRollup,
    });
    const sUseBaseJsonRollupValue = shouldUseBaseJsonRollupValue(
        sourceColumnMap,
        useRollup,
        rollupColumnName,
    );
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const outerValueExpressionSql = buildAggregateOuterValueExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const subSql = buildAggregateSubSql(
        calculationMode,
        sourceTableName,
        valueExpressionSql,
        timeAccess.sourceWhereSql,
        timeAccess.timeGroupKeySql,
    );

    return buildAggregateOuterSql(
        calculationMode,
        subSql,
        timeAccess.outerTimeExpressionSql,
        requestedRowCount,
        timeAccess.convertOuterTimeToTimestamp,
        outerValueExpressionSql,
    );
}

function buildAverageCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupColumnName?: string,
): string {
    const calculationMode = 'avg';
    const timeAccess = resolveCalculationTimeAccess({
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        calculationMode,
        requestedRowCount,
        intervalUnit,
        intervalSize,
        useRollup,
    });
    const sUseBaseJsonRollupValue = shouldUseBaseJsonRollupValue(
        sourceColumnMap,
        useRollup,
        rollupColumnName,
    );
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const outerValueExpressionSql = buildAverageOuterValueExpressionForCalculation(
        sourceColumnMap,
        sUseBaseJsonRollupValue,
    );
    const subSql = buildAverageSubSql(
        sourceTableName,
        valueExpressionSql,
        timeAccess.sourceWhereSql,
        timeAccess.timeGroupKeySql,
    );

    return buildAverageOuterSql(
        subSql,
        timeAccess.outerTimeExpressionSql,
        requestedRowCount,
        timeAccess.convertOuterTimeToTimestamp,
        outerValueExpressionSql,
    );
}

function buildCountCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupColumnName?: string,
): string {
    const calculationMode = 'cnt';
    const timeAccess = resolveCalculationTimeAccess({
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        calculationMode,
        requestedRowCount,
        intervalUnit,
        intervalSize,
        useRollup,
    });
    const sUseBaseJsonRollupValue = shouldUseBaseJsonRollupValue(
        sourceColumnMap,
        useRollup,
        rollupColumnName,
    );
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const subSql = buildCountSubSql(
        sourceTableName,
        valueExpressionSql,
        timeAccess.sourceWhereSql,
        timeAccess.timeGroupKeySql,
    );

    return buildCountOuterSql(
        subSql,
        timeAccess.outerTimeExpressionSql,
        requestedRowCount,
        timeAccess.convertOuterTimeToTimestamp,
    );
}

function buildFirstLastCalculationSql(
    sourceTableName: string,
    tagNameList: string,
    fetchTimeRange: TimeRangeNs,
    calculationMode: string,
    requestedRowCount: number,
    intervalUnit: string,
    intervalSize: number,
    useRollup: boolean,
    sourceColumnMap: SeriesFetchColumnMap,
    rollupColumnName?: string,
): string {
    const timeAccess = resolveCalculationTimeAccess({
        sourceColumnMap,
        tagNameList,
        fetchTimeRange,
        calculationMode,
        requestedRowCount,
        intervalUnit,
        intervalSize,
        useRollup,
    });
    const sUseBaseJsonRollupValue = shouldUseBaseJsonRollupValue(
        sourceColumnMap,
        useRollup,
        rollupColumnName,
    );
    const valueExpressionSql = buildValueColumnExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const outerValueExpressionSql = buildFirstLastOuterValueExpressionForCalculation(
        sourceColumnMap,
        calculationMode,
        sUseBaseJsonRollupValue,
    );
    const subSql = buildFirstLastSubSql(
        calculationMode,
        sourceTableName,
        valueExpressionSql,
        timeAccess.sourceWhereSql,
        timeAccess.timeGroupKeySql,
        sourceColumnMap.time,
    );

    return buildFirstLastOuterSql(
        calculationMode,
        subSql,
        timeAccess.outerTimeExpressionSql,
        requestedRowCount,
        timeAccess.convertOuterTimeToTimestamp,
        outerValueExpressionSql,
    );
}

function resolveCalculationTimeAccess({
    sourceColumnMap,
    tagNameList,
    fetchTimeRange,
    calculationMode,
    requestedRowCount,
    intervalUnit,
    intervalSize,
    useRollup,
}: ResolveCalculationTimeAccessParams): CalculationTimeAccess {
    const sUsesNumericBaseTime = isNumericBaseTimeSourceColumns(sourceColumnMap);

    return {
        timeGroupKeySql: resolveCalculationTimeGroupKeySql({
            sourceColumnMap,
            fetchTimeRange,
            calculationMode,
            requestedRowCount,
            intervalUnit,
            intervalSize,
            useRollup,
            usesNumericBaseTime: sUsesNumericBaseTime,
        }),
        outerTimeExpressionSql: M_TIME_ALIAS,
        sourceWhereSql: buildSourceWhereSqlPart(
            sourceColumnMap.name,
            tagNameList,
            sourceColumnMap.time,
            fetchTimeRange.startTime,
            fetchTimeRange.endTime,
            !sUsesNumericBaseTime,
        ),
        convertOuterTimeToTimestamp: !sUsesNumericBaseTime,
    };
}

type ResolveCalculationTimeGroupKeySqlParams = {
    sourceColumnMap: SeriesFetchColumnMap;
    fetchTimeRange: TimeRangeNs;
    calculationMode: string;
    requestedRowCount: number;
    intervalUnit: string;
    intervalSize: number;
    useRollup: boolean;
    usesNumericBaseTime: boolean;
};

function resolveCalculationTimeGroupKeySql({
    sourceColumnMap,
    fetchTimeRange,
    calculationMode,
    requestedRowCount,
    intervalUnit,
    intervalSize,
    useRollup,
    usesNumericBaseTime,
}: ResolveCalculationTimeGroupKeySqlParams): string {
    void calculationMode;

    if (useRollup) {
        return buildRollupTimeGroupKeySqlPart(
            sourceColumnMap.time,
            intervalUnit,
            intervalSize,
        );
    }

    if (usesNumericBaseTime) {
        return buildNumericBaseTimeGroupKeySql(
            sourceColumnMap.time,
            fetchTimeRange,
            requestedRowCount,
        );
    }

    return buildDateBinTimeGroupKeySqlPart(
        sourceColumnMap.time,
        intervalUnit,
        intervalSize,
    );
}

function buildValueColumnExpressionForCalculation(
    sourceColumnMap: SeriesFetchColumnMap,
    calculationMode: string,
    useBaseJsonRollupValue = false,
): string {
    const sValueColumn = buildSqlIdentifierPath(
        sourceColumnMap.value,
        'SQL value column',
    );

    if (useBaseJsonRollupValue) {
        return sValueColumn;
    }

    return toSqlValueExpressionForAggregator(
        sValueColumn,
        calculationMode,
        sourceColumnMap.jsonKey,
    );
}

function shouldUseBaseJsonRollupValue(
    sourceColumnMap: SeriesFetchColumnMap,
    useRollup: boolean,
    rollupColumnName?: string,
): boolean {
    return Boolean(
        useRollup &&
        sourceColumnMap.jsonKey &&
        rollupColumnName &&
        rollupColumnName === sourceColumnMap.value,
    );
}

function buildAggregateOuterValueExpressionForCalculation(
    sourceColumnMap: SeriesFetchColumnMap,
    calculationMode: string,
    useBaseJsonRollupValue: boolean,
): string | undefined {
    if (!useBaseJsonRollupValue) {
        return undefined;
    }

    return `${calculationMode}(${buildOuterJsonValueExpression(
        M_VALUE_ALIAS,
        sourceColumnMap,
    )}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`;
}

function buildAverageOuterValueExpressionForCalculation(
    sourceColumnMap: SeriesFetchColumnMap,
    useBaseJsonRollupValue: boolean,
): string | undefined {
    if (!useBaseJsonRollupValue) {
        return undefined;
    }

    return `${buildOuterJsonValueExpression(
        SUMMVAL_ALIAS,
        sourceColumnMap,
    )} / ${CNTMVAL_ALIAS} ${AS_KEYWORD} VALUE`;
}

function buildFirstLastOuterValueExpressionForCalculation(
    sourceColumnMap: SeriesFetchColumnMap,
    calculationMode: string,
    useBaseJsonRollupValue: boolean,
): string | undefined {
    if (!useBaseJsonRollupValue) {
        return undefined;
    }

    return `${calculationMode}(${M_TIME_ALIAS}, ${buildOuterJsonValueExpression(
        M_VALUE_ALIAS,
        sourceColumnMap,
    )}) ${AS_KEYWORD} ${VALUE_RESULT_ALIAS}`;
}

function buildOuterJsonValueExpression(
    valueAlias: string,
    sourceColumnMap: SeriesFetchColumnMap,
): string {
    return jsonValueFieldToNumericSql(valueAlias, sourceColumnMap.jsonKey);
}

function buildNumericBaseTimeGroupKeySql(
    timeColumnName: string,
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
): string {
    const sTimeColumn = buildSqlIdentifierPath(
        timeColumnName,
        'SQL time column',
    );
    const sStartTime = getNumericBaseTimeRangeValue(fetchTimeRange.startTime);
    const sBucketSize = resolveNumericBaseTimeBucketSize(
        fetchTimeRange,
        requestedRowCount,
    );

    return sBucketSize > 0
        ? `TRUNC((${sTimeColumn} - ${sStartTime}) / ${sBucketSize}, 0) * ${sBucketSize} + ${sStartTime}`
        : sTimeColumn;
}

function resolveNumericBaseTimeBucketSize(
    fetchTimeRange: TimeRangeNs,
    requestedRowCount: number,
): number {
    const sStartTime = getNumericBaseTimeRangeValue(fetchTimeRange.startTime);
    const sEndTime = getNumericBaseTimeRangeValue(fetchTimeRange.endTime);
    const sRangeWidth = sEndTime - sStartTime;
    if (sRangeWidth <= 0 || requestedRowCount <= 0) {
        return 0;
    }

    return resolveNumericIntervalValue(sRangeWidth, requestedRowCount);
}

function getNumericBaseTimeRangeValue(value: TimeRangeNs['startTime']): number {
    return typeof value === 'number' ? value : Number(value);
}

function addCurrentUserSchemaIfNeeded(tableName: string): string {
    if (isQualifiedTableName(tableName) || isCurUserEqualAdmin()) {
        return tableName;
    }

    const sCurrentUserName = getUserName();

    return sCurrentUserName ? `${sCurrentUserName}.${tableName}` : tableName;
}

function isQualifiedTableName(tableName: string): boolean {
    return tableName.split('.').length > 1;
}
