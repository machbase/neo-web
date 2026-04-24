export type RollupQuerySourceMode = 'raw' | 'rollup' | 'split';

export type RollupAggregationMetric = {
    rollupSelect: string;
    rawSelect?: string;
    outerSelect: string;
};

type BuildRollupAwareAggregationSqlOptions = {
    sourceMode: RollupQuerySourceMode;
    tableName: string;
    timeColumn: string;
    timeRange: {
        start: number | string;
        end: number | string;
    };
    baseConditions?: string[];
    intervalType: string;
    intervalValue: number;
    rollupTimeExpression?: string;
    rawTimeExpression?: string;
    metrics: RollupAggregationMetric[];
    outerTimeExpression?: string;
    outerGroupBy?: string;
    outerOrderBy?: string;
    limit?: number;
};

type CreateAggregationMetricOptions = {
    aggregator: string;
    outputAlias: string;
    valueExpression?: string;
    timeExpression?: string;
};

type CreateJsonRollupAggregationMetricOptions = {
    aggregator: string;
    outputAlias: string;
    jsonColumn: string;
    jsonPath: string;
    timeExpression?: string;
};

const sanitizeAlias = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

const createMetricAlias = (prefix: string, outputAlias: string) => `${prefix}_${sanitizeAlias(outputAlias)}`;

const escapeSqlString = (value: string) => value.replace(/'/g, "''");

const getIntervalNanoseconds = (intervalType: string, intervalValue: number) => {
    switch (intervalType.toLowerCase()) {
        case 'sec':
            return intervalValue * 1_000_000_000;
        case 'min':
            return intervalValue * 60 * 1_000_000_000;
        case 'hour':
            return intervalValue * 60 * 60 * 1_000_000_000;
        case 'day':
            return intervalValue * 24 * 60 * 60 * 1_000_000_000;
        default:
            return intervalValue;
    }
};

export const buildRollupTimeExpression = (timeColumn: string, intervalType: string, intervalValue: number): string => {
    let timeUnit: string;

    switch (intervalType.toLowerCase()) {
        case 'sec':
            timeUnit = 'SEC';
            break;
        case 'min':
            timeUnit = 'MIN';
            break;
        case 'hour':
            timeUnit = 'HOUR';
            break;
        case 'day':
            timeUnit = 'DAY';
            break;
        default:
            timeUnit = intervalType.toUpperCase();
    }

    return `ROLLUP('${timeUnit}', ${intervalValue}, ${timeColumn})`;
};

const getDateBinUnit = (intervalType: string): string => {
    switch (intervalType.toLowerCase()) {
        case 'sec':
            return 'second';
        case 'min':
            return 'minute';
        case 'hour':
            return 'hour';
        case 'day':
            return 'day';
        default:
            return intervalType.toLowerCase();
    }
};

export const buildDateBinTimeExpression = (timeColumn: string, intervalType: string, intervalValue: number | string): string => {
    return `DATE_BIN('${getDateBinUnit(intervalType)}', ${intervalValue}, ${timeColumn})`;
};

export const buildRawTimeExpression = (timeColumn: string, intervalType: string, intervalValue: number): string => buildDateBinTimeExpression(timeColumn, intervalType, intervalValue);

export const buildRollupBoundaryExpression = (intervalType: string, intervalValue: number) => {
    return `${buildDateBinTimeExpression('sysdate', intervalType, intervalValue)} - ${getIntervalNanoseconds(intervalType, intervalValue) * 2}`;
};

const buildDefaultOuterTimeExpression = () => {
    return 'TO_TIMESTAMP(mTime) / 1000000 as TIME';
};

export const createRollupAggregationMetric = ({ aggregator, outputAlias, valueExpression, timeExpression }: CreateAggregationMetricOptions): RollupAggregationMetric => {
    const normalizedAggregator = aggregator.toLowerCase();
    const safeValueExpression = valueExpression ?? '*';

    if (normalizedAggregator === 'avg') {
        const sumAlias = createMetricAlias('SUMMVAL', outputAlias);
        const countAlias = createMetricAlias('CNTMVAL', outputAlias);
        return {
            rollupSelect: `sum(${safeValueExpression}) as ${sumAlias}, count(${safeValueExpression}) as ${countAlias}`,
            outerSelect: `SUM(${sumAlias}) / SUM(${countAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'variance' || normalizedAggregator === 'var') {
        const sumAlias = createMetricAlias('SUMMVAL', outputAlias);
        const countAlias = createMetricAlias('CNTMVAL', outputAlias);
        const sumsqAlias = createMetricAlias('SUMSQVAL', outputAlias);
        return {
            rollupSelect: `sum(${safeValueExpression}) as ${sumAlias}, count(${safeValueExpression}) as ${countAlias}, sumsq(${safeValueExpression}) as ${sumsqAlias}`,
            outerSelect: `(SUM(${sumsqAlias}) - power(SUM(${sumAlias}), 2) / SUM(${countAlias})) / (SUM(${countAlias}) - 1) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'var_pop' || normalizedAggregator === 'variance_pop') {
        const sumAlias = createMetricAlias('SUMMVAL', outputAlias);
        const countAlias = createMetricAlias('CNTMVAL', outputAlias);
        const sumsqAlias = createMetricAlias('SUMSQVAL', outputAlias);
        return {
            rollupSelect: `sum(${safeValueExpression}) as ${sumAlias}, count(${safeValueExpression}) as ${countAlias}, sumsq(${safeValueExpression}) as ${sumsqAlias}`,
            outerSelect: `(SUM(${sumsqAlias}) - power(SUM(${sumAlias}), 2) / SUM(${countAlias})) / SUM(${countAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'stddev') {
        const sumAlias = createMetricAlias('SUMMVAL', outputAlias);
        const countAlias = createMetricAlias('CNTMVAL', outputAlias);
        const sumsqAlias = createMetricAlias('SUMSQVAL', outputAlias);
        return {
            rollupSelect: `sum(${safeValueExpression}) as ${sumAlias}, count(${safeValueExpression}) as ${countAlias}, sumsq(${safeValueExpression}) as ${sumsqAlias}`,
            outerSelect: `sqrt((SUM(${sumsqAlias}) - power(SUM(${sumAlias}), 2) / SUM(${countAlias})) / (SUM(${countAlias}) - 1)) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'stddev_pop') {
        const sumAlias = createMetricAlias('SUMMVAL', outputAlias);
        const countAlias = createMetricAlias('CNTMVAL', outputAlias);
        const sumsqAlias = createMetricAlias('SUMSQVAL', outputAlias);
        return {
            rollupSelect: `sum(${safeValueExpression}) as ${sumAlias}, count(${safeValueExpression}) as ${countAlias}, sumsq(${safeValueExpression}) as ${sumsqAlias}`,
            outerSelect: `sqrt((SUM(${sumsqAlias}) - power(SUM(${sumAlias}), 2) / SUM(${countAlias})) / SUM(${countAlias})) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'first' || normalizedAggregator === 'last') {
        return {
            rollupSelect: `${normalizedAggregator}(${timeExpression}, ${safeValueExpression}) as ${outputAlias}`,
            outerSelect: `${normalizedAggregator}(mTime, ${outputAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'count' || normalizedAggregator === 'count(*)') {
        return {
            rollupSelect: `${normalizedAggregator === 'count(*)' ? 'count(*)' : `count(${safeValueExpression})`} as ${outputAlias}`,
            outerSelect: `SUM(${outputAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'sum' || normalizedAggregator === 'sumsq') {
        return {
            rollupSelect: `${normalizedAggregator}(${safeValueExpression}) as ${outputAlias}`,
            outerSelect: `SUM(${outputAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'min') {
        return {
            rollupSelect: `min(${safeValueExpression}) as ${outputAlias}`,
            outerSelect: `MIN(${outputAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'max') {
        return {
            rollupSelect: `max(${safeValueExpression}) as ${outputAlias}`,
            outerSelect: `MAX(${outputAlias}) AS ${outputAlias}`,
        };
    }

    return {
        rollupSelect: `${aggregator}(${safeValueExpression}) as ${outputAlias}`,
        outerSelect: `${aggregator}(${outputAlias}) AS ${outputAlias}`,
    };
};

export const createJsonRollupAggregationMetric = ({
    aggregator,
    outputAlias,
    jsonColumn,
    jsonPath,
    timeExpression,
}: CreateJsonRollupAggregationMetricOptions): RollupAggregationMetric => {
    const normalizedAggregator = aggregator.toLowerCase();
    const jsonAlias = createMetricAlias('JSONVAL', outputAlias);
    const jsonValueExpression = `TO_NUMBER_SAFE(${jsonAlias}->'$.${escapeSqlString(jsonPath)}')`;

    if (normalizedAggregator === 'count' || normalizedAggregator === 'count(*)') {
        return {
            rollupSelect: `${normalizedAggregator === 'count(*)' ? 'count(*)' : `count(${jsonColumn})`} as ${outputAlias}`,
            outerSelect: `SUM(${outputAlias}) AS ${outputAlias}`,
        };
    }

    if (normalizedAggregator === 'first' || normalizedAggregator === 'last') {
        return {
            rollupSelect: `${normalizedAggregator}(${timeExpression}, ${jsonColumn}) as ${jsonAlias}`,
            outerSelect: `MAX(${jsonValueExpression}) AS ${outputAlias}`,
        };
    }

    return {
        rollupSelect: `${normalizedAggregator}(${jsonColumn}) as ${jsonAlias}`,
        outerSelect: `MAX(${jsonValueExpression}) AS ${outputAlias}`,
    };
};

export const buildRollupAwareAggregationSql = ({
    sourceMode,
    tableName,
    timeColumn,
    timeRange,
    baseConditions = [],
    intervalType,
    intervalValue,
    rollupTimeExpression = buildRollupTimeExpression(timeColumn, intervalType, intervalValue),
    rawTimeExpression = buildRawTimeExpression(timeColumn, intervalType, intervalValue),
    metrics,
    outerTimeExpression,
    outerGroupBy = 'GROUP BY TIME',
    outerOrderBy = 'ORDER BY TIME',
    limit,
}: BuildRollupAwareAggregationSqlOptions) => {
    const resolvedOuterTimeExpression = outerTimeExpression ?? buildDefaultOuterTimeExpression();

    const buildWhereClause = (extraCondition?: string) => {
        const conditions = [`${timeColumn} BETWEEN ${timeRange.start} AND ${timeRange.end}`, ...baseConditions];
        if (extraCondition) conditions.push(extraCondition);
        return conditions.join(' AND ');
    };

    const buildInnerQuery = (timeExpression: string, selectList: string[], extraCondition?: string) =>
        `select ${timeExpression} as mTime, ${selectList.join(', ')} from ${tableName} where ${buildWhereClause(extraCondition)} group by mTime`;

    const rollupSelects = metrics.map((metric) => metric.rollupSelect);
    const rawSelects = metrics.map((metric) => metric.rawSelect ?? metric.rollupSelect);
    const boundaryExpression = buildRollupBoundaryExpression(intervalType, intervalValue);

    let innerQuery = '';

    if (sourceMode === 'split') {
        const rollupQuery = buildInnerQuery(rollupTimeExpression, rollupSelects, `${timeColumn} < ${boundaryExpression}`);
        const rawQuery = buildInnerQuery(rawTimeExpression, rawSelects, `${timeColumn} >= ${boundaryExpression}`);
        innerQuery = `${rollupQuery} UNION ALL ${rawQuery}`;
    } else if (sourceMode === 'rollup') {
        innerQuery = buildInnerQuery(rollupTimeExpression, rollupSelects);
    } else {
        innerQuery = buildInnerQuery(rawTimeExpression, rawSelects);
    }

    const limitClause = limit !== undefined ? ` LIMIT ${limit}` : '';

    return `SELECT ${resolvedOuterTimeExpression}, ${metrics.map((metric) => metric.outerSelect).join(', ')} from (${innerQuery}) ${outerGroupBy} ${outerOrderBy}${limitClause}`;
};
