import { isCountAllAggregator } from '@/utils/aggregatorConstants';

const ADMIN_ID = 'SYS';

const buildDateBinCaseExpression = (timeColumn: string, periodUnit = `'{{period_unit}}'`, periodValue = '{{period_value}}') =>
    `TO_TIMESTAMP(CASE ${periodUnit} WHEN 'day' THEN DATE_BIN('day', ${periodValue}, ${timeColumn}) WHEN 'hour' THEN DATE_BIN('hour', ${periodValue}, ${timeColumn}) WHEN 'min' THEN DATE_BIN('minute', ${periodValue}, ${timeColumn}) ELSE DATE_BIN('second', ${periodValue}, ${timeColumn}) END) / 1000000`;

export const FULL_TYPING_TIME_VALUE_TEMPLATE = buildDateBinCaseExpression('TIME');
export const FULL_TYPING_TIME_EXPRESSION_TEMPLATE = `${FULL_TYPING_TIME_VALUE_TEMPLATE} AS TIME`;

export const MAIN_FULL_TYPING_QUERY_PLACEHOLDER = `SELECT TIME, AVG(VALUE) AS 'SERIES(0)' FROM (SELECT ${FULL_TYPING_TIME_EXPRESSION_TEMPLATE}, value AS VALUE FROM EXAMPLE WHERE TIME BETWEEN FROM_TIMESTAMP({{from_ns}}) AND FROM_TIMESTAMP({{to_ns}})) GROUP BY TIME ORDER BY TIME;`;
const FULL_TYPING_WITHOUT_VAR_TIME_VALUE = buildDateBinCaseExpression('TIME', `'sec'`, '10');
export const MAIN_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR = `SELECT TIME, AVG(VALUE) AS 'SERIES(0)' FROM (SELECT ${FULL_TYPING_WITHOUT_VAR_TIME_VALUE} AS TIME, value AS VALUE FROM EXAMPLE WHERE TIME BETWEEN FROM_TIMESTAMP(1745910581000000000) AND FROM_TIMESTAMP(1745914181000000000)) GROUP BY TIME ORDER BY TIME;`;

export const PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER = MAIN_FULL_TYPING_QUERY_PLACEHOLDER;
export const PUBLIC_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR = MAIN_FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR;

export const buildFullTypingQuery = (blockInfo: any) => {
    const tableName = blockInfo?.customTable || `${blockInfo.table}`.match(/\{\{.*\}\}/) ? blockInfo.table : blockInfo.table.split('.').length === 1 ? `${ADMIN_ID}.${blockInfo.table}` : blockInfo.table;
    const nameColumn = blockInfo?.name ?? '';
    const timeColumn = blockInfo?.time ?? '';
    let useAgg =
        blockInfo?.aggregator !== '' && blockInfo?.aggregator?.toUpperCase() !== 'VALUE' && blockInfo?.aggregator?.toUpperCase() !== 'NONE';
    let useCountAll = isCountAllAggregator(blockInfo?.aggregator ?? '');
    let valueColumn = blockInfo?.value ?? '';
    let aggregator = blockInfo?.aggregator ?? '';
    let whereClauses: string[] = [];
    let alias = blockInfo?.alias !== '' ? blockInfo?.alias : "'SERIES(0)'";

    if (blockInfo.useCustom) {
        useAgg =
            blockInfo?.values?.[0]?.aggregator !== '' &&
            blockInfo?.values?.[0]?.aggregator?.toUpperCase() !== 'VALUE' &&
            blockInfo?.values?.[0]?.aggregator?.toUpperCase() !== 'NONE';
        useCountAll = isCountAllAggregator(blockInfo?.values?.[0]?.aggregator ?? '');
        valueColumn = blockInfo?.values?.[0]?.value !== '' ? blockInfo?.values?.[0]?.value : false;
        aggregator = blockInfo?.values?.[0]?.aggregator !== '' ? blockInfo?.values?.[0]?.aggregator : '';
        alias = blockInfo?.values?.[0]?.alias !== '' ? blockInfo?.values?.[0]?.alias : "'SERIES(0)'";
        const activeFilters = blockInfo?.filter?.filter((item: any) => item?.useFilter) ?? [];
        whereClauses = activeFilters.map((filter: any) => {
            if (filter.useTyping) return filter.typingValue;

            const useQuote = blockInfo.tableInfo.find((tableInfo: any) => tableInfo[0] === filter.column)?.[1] === 5;
            const value = useQuote ? `'${filter.value.includes(',') ? filter.value.split(',').join("','") : filter.value}'` : filter.value;
            return filter.column === 'NAME' && filter.operator === 'in' ? `${filter.column} ${filter.operator} (${value})` : `${filter.column} ${filter.operator} ${value}`;
        });
    } else if (blockInfo?.tag !== '') {
        whereClauses = [`${nameColumn} IN ('${blockInfo?.tag}')`];
    }

    let valueExpression = useAgg && valueColumn ? `${aggregator}(${valueColumn}) AS ${alias}` : !useCountAll ? `(${valueColumn}) AS ${alias}` : `COUNT(*) AS ${alias}`;

    if (aggregator && valueColumn && (aggregator?.toUpperCase() === 'FIRST' || aggregator?.toUpperCase() === 'LAST')) {
        valueExpression = `${aggregator}(${timeColumn}, ${valueColumn}) AS ${alias}`;
    }

    if (aggregator?.toUpperCase() === 'DIFF' || aggregator?.toUpperCase() === 'DIFF (ABS)' || aggregator?.toUpperCase() === 'DIFF (NO-NEGATIVE)') {
        valueExpression = `COUNT(*) AS ${alias}`;
        useAgg = true;
    }

    const timeValueExpression = buildDateBinCaseExpression(timeColumn);
    const whereExpression = `(${timeColumn} BETWEEN FROM_TIMESTAMP({{from_ns}}) AND FROM_TIMESTAMP({{to_ns}}))${whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : ''}`;

    if (!useAgg) {
        return `SELECT TIME, VALUE AS ${alias} FROM (SELECT ${timeValueExpression} AS TIME, (${valueColumn}) AS VALUE FROM ${tableName} WHERE ${whereExpression}) ORDER BY TIME`;
    }

    const subQueryColumns = [`${timeValueExpression} AS TIME`];
    let outerValueExpression = valueExpression;

    if (aggregator?.toUpperCase() === 'FIRST' || aggregator?.toUpperCase() === 'LAST') {
        subQueryColumns.push(`${timeColumn} AS RAW_TIME`, `${valueColumn} AS VALUE`);
        outerValueExpression = `${aggregator}(RAW_TIME, VALUE) AS ${alias}`;
    } else if (useCountAll) {
        outerValueExpression = `COUNT(*) AS ${alias}`;
    } else {
        subQueryColumns.push(`${valueColumn} AS VALUE`);
        outerValueExpression = `${aggregator}(VALUE) AS ${alias}`;
    }

    return `SELECT TIME, ${outerValueExpression} FROM (SELECT ${subQueryColumns.join(', ')} FROM ${tableName} WHERE ${whereExpression}) GROUP BY TIME ORDER BY TIME`;
};
